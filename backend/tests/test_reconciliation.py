"""Pure rule tests: no AWS or boto3 needed."""
import pathlib
import sys
import unittest
from datetime import datetime, timezone

sys.path.insert(0, str(pathlib.Path(__file__).parents[1] / "src"))
import reconciliation as r  # noqa: E402

NOW = datetime(2026, 10, 11, tzinfo=timezone.utc)


def claim(**kw):
    base = {"id": "CP-TEST", "orgId": "org-test", "claimed": None, "collected": None, "received": None,
            "processed": None, "recovered": None, "dispatched": None}
    base.update(kw)
    return base


def ev(i, stage, ref=None, date="2026-09-10T00:00:00Z", qty=1, **kw):
    return {"id": i, "stage": stage, "reference": ref or f"R-{i}", "dateIso": date,
            "quantityTonnes": qty, "missing": False, **kw}


class QuantityTests(unittest.TestCase):
    def test_flags_difference_above_tolerance(self):
        out = r.quantity_findings(claim(collected=100, received=80), 5, NOW)
        self.assertEqual(len(out), 1)
        f = out[0]
        self.assertEqual(f["type"], "Quantity Mismatch")
        self.assertEqual(f["absoluteDiff"], 20)
        self.assertEqual(f["pctDiff"], 20)
        self.assertEqual(f["expectedValue"], 100)
        self.assertEqual(f["observedValue"], 80)
        self.assertIn("not proof", f["detectionExplanation"])

    def test_missing_values_are_not_zero(self):
        c = claim(collected=100, processed=40, dispatched=30)  # received/recovered missing
        self.assertEqual(r.quantity_findings(c), [])

    def test_within_tolerance_not_flagged(self):
        self.assertEqual(r.quantity_findings(claim(collected=100, received=97), 5), [])

    def test_zero_denominator_not_divided(self):
        self.assertEqual(r.quantity_findings(claim(collected=0, received=2)), [])

    def test_claimed_vs_collected(self):
        out = r.quantity_findings(claim(claimed=100, collected=80), 5)
        self.assertEqual(out[0]["stageComparison"], ["claimed", "collected"])

    def test_increase_is_called_out(self):
        out = r.quantity_findings(claim(collected=100, received=130), 5)
        self.assertIn("higher", out[0]["detectionExplanation"])

    def test_garbage_values_ignored(self):
        self.assertEqual(r.quantity_findings(claim(collected="abc", received=5)), [])
        self.assertEqual(r.quantity_findings(claim(collected=True, received=5)), [])
        self.assertEqual(r.quantity_findings(claim(collected=float("nan"), received=5)), [])

    def test_ids_are_deterministic(self):
        a = r.quantity_findings(claim(collected=100, received=50))[0]["id"]
        b = r.quantity_findings(claim(collected=100, received=50))[0]["id"]
        self.assertEqual(a, b)
        self.assertEqual(a, r.discrepancy_id("CP-TEST", "quantity:collected>received"))


class EvidenceTests(unittest.TestCase):
    def test_explicit_missing_record(self):
        e = ev("e1", "Received", missing=True, type="Weighbridge Ticket")
        out = r.evidence_findings(claim(received=10), [e], NOW)
        self.assertEqual([f["type"] for f in out], ["Missing Evidence"])
        self.assertEqual(out[0]["relevantEvidenceIds"], ["e1"])

    def test_stage_with_quantity_but_no_evidence(self):
        out = r.evidence_findings(claim(collected=10, received=9), [ev("e1", "Collected")], NOW)
        self.assertEqual([f["fingerprint"] for f in out], ["missing:stage:received"])

    def test_no_quantity_no_flag(self):
        self.assertEqual(r.evidence_findings(claim(), [], NOW), [])

    def test_pending_upload_does_not_count(self):
        e = ev("e1", "Collected", uploadPending=True)
        out = r.evidence_findings(claim(collected=10), [e], NOW)
        self.assertEqual(len(out), 1)


class DuplicateAndDateTests(unittest.TestCase):
    def test_duplicate_reference_same_stage(self):
        out = r.duplicate_findings(claim(), [ev("a", "Received", "WB-1"), ev("b", "Received", " wb-1 ")], NOW)
        self.assertEqual(len(out), 1)
        self.assertEqual(sorted(out[0]["relevantEvidenceIds"]), ["a", "b"])

    def test_same_reference_different_stage_ok(self):
        self.assertEqual(r.duplicate_findings(claim(), [ev("a", "Received", "X"), ev("b", "Processed", "X")], NOW), [])

    def test_stage_order_inconsistency(self):
        evs = [ev("a", "Collected", date="2026-09-20T00:00:00Z"), ev("b", "Received", date="2026-09-10T00:00:00Z")]
        out = r.date_findings(claim(), evs, NOW)
        self.assertEqual([f["fingerprint"] for f in out], ["date:order:collected>received"])

    def test_normal_order_ok(self):
        evs = [ev("a", "Collected", date="2026-09-10T00:00:00Z"), ev("b", "Received", date="2026-09-12T00:00:00Z")]
        self.assertEqual(r.date_findings(claim(), evs, NOW), [])

    def test_future_date(self):
        out = r.date_findings(claim(), [ev("a", "Collected", date="2027-01-01")], NOW)
        self.assertEqual(out[0]["fingerprint"], "date:future:a")

    def test_unparseable_dates_skipped(self):
        self.assertEqual(r.date_findings(claim(), [ev("a", "Collected", date="not a date")], NOW), [])


class ReconcileTests(unittest.TestCase):
    def test_all_rules_run(self):
        c = claim(claimed=100, collected=100, received=50)
        out = r.reconcile(c, [ev("a", "Collected")], 5, NOW)
        kinds = {f["type"] for f in out}
        self.assertEqual(kinds, {"Quantity Mismatch", "Missing Evidence"})
        self.assertTrue(all(f["status"] == "Open" and f["automated"] for f in out))


if __name__ == "__main__":
    unittest.main()
