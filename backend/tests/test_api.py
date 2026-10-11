"""API tests against mocked DynamoDB / S3 / SNS (moto). Skipped if moto isn't installed."""
import json
import os
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).parents[1] / "src"))

try:
    import boto3
    from moto import mock_aws
except ImportError:  # pragma: no cover
    boto3 = None

TABLE, BUCKET = "cycleproof-test-records", "cycleproof-test-evidence"


def create_table():
    ddb = boto3.client("dynamodb")
    attrs = [{"AttributeName": k, "AttributeType": "S"} for k in ("PK", "SK", "GSI1PK", "GSI1SK", "GSI2PK", "GSI2SK")]
    gsi = lambda n, a, b: {"IndexName": n, "Projection": {"ProjectionType": "ALL"},  # noqa: E731
                           "KeySchema": [{"AttributeName": a, "KeyType": "HASH"}, {"AttributeName": b, "KeyType": "RANGE"}]}
    ddb.create_table(TableName=TABLE, BillingMode="PAY_PER_REQUEST", AttributeDefinitions=attrs,
                     KeySchema=[{"AttributeName": "PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}],
                     GlobalSecondaryIndexes=[gsi("GSI1", "GSI1PK", "GSI1SK"), gsi("GSI2", "GSI2PK", "GSI2SK")])


@unittest.skipIf(boto3 is None, "moto not installed (pip install -r requirements-dev.txt)")
class ApiTests(unittest.TestCase):
    def setUp(self):
        os.environ.update(AWS_DEFAULT_REGION="ap-south-1", AWS_ACCESS_KEY_ID="test", AWS_SECRET_ACCESS_KEY="test",
                          TABLE_NAME=TABLE, EVIDENCE_BUCKET=BUCKET, ALERT_TOPIC_ARN="", APP_ENV="test",
                          ALLOWED_ORIGIN="https://app.example", DISCREPANCY_TOLERANCE_PCT="5")
        self.mock = mock_aws()
        self.mock.start()
        create_table()
        boto3.client("s3").create_bucket(Bucket=BUCKET, CreateBucketConfiguration={"LocationConstraint": "ap-south-1"})
        import db
        db.reset_clients()
        import app
        self.app, self.db = app, db

    def tearDown(self):
        self.mock.stop()

    # -- helpers
    def call(self, method, path, body=None, query=None):
        event = {"httpMethod": method, "path": path, "body": json.dumps(body) if body is not None else None,
                 "queryStringParameters": query}
        res = self.app.api_handler(event, None)
        return res["statusCode"], (json.loads(res["body"]) if res["body"] else None), res["headers"]

    def make_org(self, **kw):
        body = {"name": "Test Recycler", "type": "E-Waste Recycler", "location": "Pune"}
        body.update(kw)
        status, org, _ = self.call("POST", "/organizations", body)
        self.assertEqual(status, 201, org)
        return org

    def make_claim(self, org_id, **kw):
        body = {"orgId": org_id, "period": "Oct 2026", "claimed": 100, "collected": 100, "received": 80}
        body.update(kw)
        status, claim, _ = self.call("POST", "/claims", body)
        self.assertEqual(status, 201, claim)
        return claim

    # -- basics
    def test_health_and_cors(self):
        status, body, headers = self.call("GET", "/health")
        self.assertEqual((status, body["ok"]), (200, True))
        self.assertEqual(headers["Access-Control-Allow-Origin"], "https://app.example")

    def test_options_preflight(self):
        self.assertEqual(self.call("OPTIONS", "/claims")[0], 204)

    def test_unknown_route_404_and_wrong_method_405(self):
        self.assertEqual(self.call("GET", "/nope")[0], 404)
        self.assertEqual(self.call("DELETE", "/claims")[0], 405)

    def test_malformed_json(self):
        res = self.app.api_handler({"httpMethod": "POST", "path": "/claims", "body": "{oops"}, None)
        self.assertEqual(res["statusCode"], 400)

    def test_bad_path_id_rejected(self):
        self.assertEqual(self.call("GET", "/claims/a%20b")[0], 400)

    # -- organizations & claims
    def test_create_org_and_claim_with_sequential_ids(self):
        org = self.make_org()
        self.assertEqual(org["id"], "org-001")
        c1, c2 = self.make_claim(org["id"]), self.make_claim(org["id"])
        self.assertTrue(c1["id"].endswith("-001") and c2["id"].endswith("-002"))
        self.assertEqual(c1["status"], "Needs review")
        self.assertEqual(c1["partner"], "Test Recycler")
        status, orgs, _ = self.call("GET", "/organizations")
        self.assertEqual(orgs["items"][0]["claimIds"].__len__(), 2)
        self.assertEqual(orgs["items"][0]["totalClaimedTonnes"], 200)

    def test_claim_validation(self):
        org = self.make_org()
        for bad in ({"claimed": -1}, {"claimed": "abc"}, {"claimed": None}, {"period": ""}, {"received": float("inf")},
                    {"orgId": "org-999"}):
            body = {"orgId": org["id"], "period": "Oct 2026", "claimed": 10}
            body.update(bad)
            status, res, _ = self.call("POST", "/claims", body)
            self.assertIn(status, (400, 404), (bad, res))

    def test_claim_ids_skip_existing(self):
        org = self.make_org()
        year = self.app.datetime.now(self.app.timezone.utc).year
        self.db.put("claim", {"orgId": org["id"], "claimed": 1}, f"CP-{year}-001")  # e.g. seeded
        claim = self.make_claim(org["id"])
        self.assertEqual(claim["id"], f"CP-{year}-002")

    def test_patch_claim_logs_timeline_and_validates(self):
        claim = self.make_claim(self.make_org()["id"])
        cid = claim["id"]
        self.assertEqual(self.call("PATCH", f"/claims/{cid}", {"status": "Bogus"})[0], 400)
        self.assertEqual(self.call("PATCH", f"/claims/{cid}", {"id": "x"})[0], 400)
        self.assertEqual(self.call("PATCH", f"/claims/{cid}", {})[0], 400)
        status, saved, _ = self.call("PATCH", f"/claims/{cid}", {"status": "In review", "received": 95.5, "assignedReviewer": "Aarav"})
        self.assertEqual((status, saved["status"], saved["received"]), (200, "In review", 95.5))
        _, tl, _ = self.call("GET", f"/claims/{cid}/timeline")
        self.assertEqual({e["type"] for e in tl["items"]}, {"claim_created", "status_changed", "quantity_updated"})

    def test_patch_unknown_claim_404(self):
        self.assertEqual(self.call("PATCH", "/claims/CP-0-000", {"status": "In review"})[0], 404)

    # -- imports (the original code crashed here: floats -> DynamoDB)
    def test_import_stores_floats_and_counts_evidence(self):
        cid = self.make_claim(self.make_org()["id"], evidenceCount=1)["id"]
        rows = [{"reference_id": "WB-1", "record_type": "received", "quantity_tonnes": "34.5", "date": "2026-10-02", "source": "Bridge"},
                {"reference_id": "WB-2", "record_type": "Processed", "quantity_tonnes": "", "date": "2026-10-04"}]
        status, res, _ = self.call("POST", f"/claims/{cid}/imports", {"records": rows})
        self.assertEqual((status, res["imported"]), (201, 2))
        _, claim, _ = self.call("GET", f"/claims/{cid}", query={"include": "related"})
        self.assertEqual(claim["evidenceAttached"], 2)
        self.assertEqual(claim["evidenceCount"], 2)  # bumped up to match attached
        quantities = {e["reference"]: e["quantityTonnes"] for e in claim["evidence"]}
        self.assertEqual(quantities, {"WB-1": 34.5, "WB-2": None})  # blank stays None, not 0

    def test_import_is_all_or_nothing(self):
        cid = self.make_claim(self.make_org()["id"])["id"]
        rows = [{"reference_id": "OK", "record_type": "Received"}, {"reference_id": "", "record_type": "Received"},
                {"reference_id": "X", "record_type": "Nonsense"}, {"reference_id": "Y", "quantity_tonnes": "-4"}, "str"]
        status, res, _ = self.call("POST", f"/claims/{cid}/imports", {"records": rows})
        self.assertEqual(status, 400)
        self.assertEqual([d["row"] for d in res["details"]], [2, 3, 4, 5])
        self.assertEqual(self.call("GET", "/evidence", query={"claimId": cid})[1]["items"], [])

    def test_import_limits(self):
        cid = self.make_claim(self.make_org()["id"])["id"]
        self.assertEqual(self.call("POST", f"/claims/{cid}/imports", {"records": []})[0], 400)
        too_many = [{"reference_id": f"R{i}"} for i in range(1001)]
        self.assertEqual(self.call("POST", f"/claims/{cid}/imports", {"records": too_many})[0], 400)
        self.assertEqual(self.call("POST", "/claims/CP-0-000/imports", {"records": [{"reference_id": "A"}]})[0], 404)

    # -- reconciliation
    def test_reconcile_creates_findings_once(self):
        org = self.make_org()
        cid = self.make_claim(org["id"])["id"]  # collected 100, received 80 -> 20% mismatch (+ missing evidence)
        status, first, _ = self.call("POST", f"/claims/{cid}/reconcile", {})
        self.assertEqual(status, 200, first)
        types = sorted(d["type"] for d in first["created"])
        self.assertEqual(types, ["Missing Evidence", "Missing Evidence", "Quantity Mismatch"])
        _, second, _ = self.call("POST", f"/claims/{cid}/reconcile", {})
        self.assertEqual(second["created"], [])
        self.assertEqual(second["alreadyKnown"], 3)
        _, discs, _ = self.call("GET", "/discrepancies", query={"claimId": cid})
        self.assertEqual(len(discs["items"]), 3)
        _, notes, _ = self.call("GET", "/notifications")
        self.assertEqual(len(notes["items"]), 3)
        _, tl, _ = self.call("GET", f"/claims/{cid}/timeline")
        self.assertEqual(sum(e["type"] == "discrepancy_detected" for e in tl["items"]), 3)
        _, orgs, _ = self.call("GET", "/organizations")
        self.assertEqual(orgs["items"][0]["openDiscrepancies"], 3)

    def test_reconcile_custom_tolerance(self):
        cid = self.make_claim(self.make_org()["id"])["id"]
        _, res, _ = self.call("POST", f"/claims/{cid}/reconcile", {"tolerancePct": 25})
        self.assertNotIn("Quantity Mismatch", [d["type"] for d in res["created"]])
        self.assertEqual(self.call("POST", f"/claims/{cid}/reconcile", {"tolerancePct": 500})[0], 400)
        self.assertEqual(self.call("POST", f"/claims/{cid}/reconcile", {"tolerancePct": "x"})[0], 400)

    def test_resolved_finding_is_not_recreated(self):
        cid = self.make_claim(self.make_org()["id"], evidenceCount=0)["id"]
        _, res, _ = self.call("POST", f"/claims/{cid}/reconcile", {})
        did = next(d["id"] for d in res["created"] if d["type"] == "Quantity Mismatch")
        status, saved, _ = self.call("PATCH", f"/discrepancies/{did}", {"status": "Resolved", "reviewerNotes": "Weighbridge recalibrated"})
        self.assertEqual(status, 200)
        self.assertIn("resolvedAt", saved)
        self.assertIn("reviewedAt", saved)
        self.assertEqual(self.call("POST", f"/claims/{cid}/reconcile", {})[1]["created"], [])
        _, reopened, _ = self.call("PATCH", f"/discrepancies/{did}", {"status": "Open"})
        self.assertNotIn("resolvedAt", reopened)

    def test_discrepancy_patch_validation(self):
        cid = self.make_claim(self.make_org()["id"])["id"]
        did = self.call("POST", f"/claims/{cid}/reconcile", {})[1]["created"][0]["id"]
        self.assertEqual(self.call("PATCH", f"/discrepancies/{did}", {"status": "Nope"})[0], 400)
        self.assertEqual(self.call("PATCH", f"/discrepancies/{did}", {"type": "x"})[0], 400)
        self.assertEqual(self.call("PATCH", "/discrepancies/disc-missing", {"status": "Open"})[0], 404)

    def test_duplicate_and_date_findings_from_imports(self):
        cid = self.make_claim(self.make_org()["id"], received=None, collected=None, claimed=10)["id"]
        rows = [{"reference_id": "WB-9", "record_type": "Collected", "date": "2026-09-20"},
                {"reference_id": "WB-9", "record_type": "Collected", "date": "2026-09-21"},
                {"reference_id": "RC-1", "record_type": "Received", "date": "2026-09-01"}]
        self.call("POST", f"/claims/{cid}/imports", {"records": rows})
        _, res, _ = self.call("POST", f"/claims/{cid}/reconcile", {})
        self.assertEqual(sorted(d["type"] for d in res["created"]), ["Date Inconsistency", "Duplicate Record"])

    def test_scheduled_handler(self):
        org = self.make_org()
        a = self.make_claim(org["id"])["id"]
        b = self.make_claim(org["id"])["id"]
        self.call("PATCH", f"/claims/{b}", {"status": "Reconciled"})
        out = self.app.scheduled_handler({}, None)
        self.assertEqual((out["claimsChecked"], out["claimsFailed"]), (1, 0))
        self.assertEqual(out["findingsCreated"], 3)
        self.assertEqual(self.app.scheduled_handler({}, None)["findingsCreated"], 0)  # idempotent
        self.assertEqual(len(self.call("GET", "/discrepancies", query={"claimId": a})[1]["items"]), 3)
        self.assertEqual(self.call("GET", "/discrepancies", query={"claimId": b})[1]["items"], [])

    # -- notes, notifications, report, bootstrap
    def test_notes_and_notifications(self):
        cid = self.make_claim(self.make_org()["id"])["id"]
        self.assertEqual(self.call("POST", f"/claims/{cid}/notes", {"note": ""})[0], 400)
        status, note, _ = self.call("POST", f"/claims/{cid}/notes", {"note": "Called the facility"})
        self.assertEqual((status, note["type"]), (201, "comment_added"))
        self.assertEqual(self.call("POST", f"/claims/{cid}/notes", {"note": "x", "discrepancyId": "disc-nope"})[0], 404)
        self.call("POST", f"/claims/{cid}/reconcile", {})
        _, notes, _ = self.call("GET", "/notifications")
        nid = notes["items"][0]["id"]
        self.assertFalse(notes["items"][0]["read"])
        self.assertEqual(self.call("PATCH", f"/notifications/{nid}", {"read": "yes"})[0], 400)
        self.assertTrue(self.call("PATCH", f"/notifications/{nid}", {"read": True})[1]["read"])
        self.assertEqual(self.call("GET", "/notifications", query={"unread": "true"})[1]["items"].__len__(), 2)
        self.assertEqual(self.call("POST", "/notifications/read-all")[1]["updated"], 2)
        self.assertEqual(self.call("PATCH", "/notifications/nt-missing", {"read": True})[0], 404)

    def test_report_and_bootstrap(self):
        org = self.make_org()
        cid = self.make_claim(org["id"])["id"]
        self.call("POST", f"/claims/{cid}/imports", {"records": [{"reference_id": "C-1", "record_type": "Collected", "quantity_tonnes": "100", "date": "2026-09-01"}]})
        self.call("POST", f"/claims/{cid}/reconcile", {})
        status, rep, _ = self.call("GET", f"/claims/{cid}/report")
        self.assertEqual(status, 200)
        self.assertEqual([s["label"] for s in rep["stages"]], ["Collected", "Received", "Processed", "Recovered", "Dispatched"])
        self.assertEqual(rep["stages"][0]["recordCount"], 1)
        self.assertIsNone(rep["stages"][2]["quantityTonnes"])  # missing stays null, not 0
        self.assertIn("not proof of fraud", rep["disclaimer"])
        self.assertGreaterEqual(rep["summary"]["openDiscrepancies"], 1)
        status, boot, _ = self.call("GET", "/bootstrap")
        self.assertEqual(status, 200)
        self.assertEqual(set(boot), {"claims", "organizations", "evidence", "discrepancies", "timeline", "notifications", "mode"})
        self.assertEqual(len(boot["claims"]), 1)

    # -- evidence files
    def test_upload_flow(self):
        cid = self.make_claim(self.make_org()["id"])["id"]
        good = {"claimId": cid, "filename": "ticket 1.pdf", "contentType": "application/pdf", "sizeBytes": 11,
                "type": "Weighbridge Ticket", "stage": "Received"}
        for bad in ({"contentType": "text/html"}, {"filename": "../x.pdf"}, {"filename": "a/b.pdf"}, {"sizeBytes": 0},
                    {"sizeBytes": 10**9}, {"sizeBytes": None}, {"claimId": "CP-0-000"}, {"type": "Nope"}):
            status, res, _ = self.call("POST", "/evidence/upload-url", {**good, **bad})
            self.assertIn(status, (400, 404), (bad, res))
        status, res, _ = self.call("POST", "/evidence/upload-url", good)
        self.assertEqual(status, 201, res)
        eid = res["evidenceId"]
        self.assertIn(BUCKET, res["uploadUrl"])
        self.assertIn("content-length", res["uploadUrl"].lower())  # size is part of the signature
        # not uploaded yet
        self.assertEqual(self.call("POST", f"/evidence/{eid}/complete")[0], 409)
        self.assertEqual(self.call("GET", f"/evidence/{eid}/download-url")[0], 404)
        key = self.db.get("evidence", eid)["s3Key"]
        boto3.client("s3").put_object(Bucket=BUCKET, Key=key, Body=b"hello world", ContentType="application/pdf")
        status, done, _ = self.call("POST", f"/evidence/{eid}/complete")
        self.assertEqual(status, 200, done)
        self.assertNotIn("uploadPending", done)
        self.assertNotIn("s3Key", done)  # internal path not exposed
        self.assertEqual(self.call("GET", f"/claims/{cid}")[1]["evidenceAttached"], 1)
        status, dl, _ = self.call("GET", f"/evidence/{eid}/download-url")
        self.assertEqual(status, 200)
        self.assertIn("ticket", dl["downloadUrl"])

    def test_upload_size_mismatch_rejected(self):
        cid = self.make_claim(self.make_org()["id"])["id"]
        _, res, _ = self.call("POST", "/evidence/upload-url", {"claimId": cid, "filename": "a.csv", "contentType": "text/csv", "sizeBytes": 50})
        key = self.db.get("evidence", res["evidenceId"])["s3Key"]
        boto3.client("s3").put_object(Bucket=BUCKET, Key=key, Body=b"short")
        self.assertEqual(self.call("POST", f"/evidence/{res['evidenceId']}/complete")[0], 409)

    # -- pagination
    def test_pagination_cursor(self):
        org = self.make_org()
        for _ in range(5):
            self.make_claim(org["id"])
        _, page1, _ = self.call("GET", "/claims", query={"limit": "2"})
        self.assertEqual(len(page1["items"]), 2)
        _, page2, _ = self.call("GET", "/claims", query={"limit": "10", "cursor": page1["nextCursor"]})
        self.assertEqual(len(page2["items"]), 3)
        self.assertNotIn("nextCursor", page2)
        self.assertEqual(self.call("GET", "/claims", query={"cursor": "garbage"})[0], 400)
        self.assertEqual(self.call("GET", "/claims", query={"limit": "abc"})[0], 400)


if __name__ == "__main__":
    unittest.main()
