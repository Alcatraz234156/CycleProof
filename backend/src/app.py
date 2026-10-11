"""CycleProof AWS Lambda handlers.

- api_handler        : API Gateway proxy integration (all routes below)
- scheduled_handler  : EventBridge nightly reconciliation

Storage layout is documented in db.py, rules in reconciliation.py.
Findings are review signals; humans decide outcomes. Demo data is never
seeded implicitly (see backend/scripts/seed.py).
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import unquote

from botocore.exceptions import ClientError

import db
import reconciliation as recon
import validation as v

logger = logging.getLogger()
logger.setLevel(logging.INFO)

URL_TTL_SECONDS = 300
MAX_BODY_BYTES = 2_000_000


# ---------------------------------------------------------------------------
# HTTP plumbing
# ---------------------------------------------------------------------------
class HttpError(Exception):
    def __init__(self, status: int, message: str, details: list | None = None):
        super().__init__(message)
        self.status, self.message, self.details = status, message, details or []


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173"),
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
        "Vary": "Origin",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
    }


def _response(status: int, body: Any = None) -> dict:
    return {"statusCode": status, "headers": _headers(),
            "body": "" if status == 204 else json.dumps(body, allow_nan=False)}


class Request:
    def __init__(self, event: dict, params: dict[str, str]):
        self.event, self.params = event, params
        self.query = event.get("queryStringParameters") or {}

    def body(self) -> dict:
        raw = self.event.get("body") or "{}"
        if self.event.get("isBase64Encoded"):
            raw = base64.b64decode(raw).decode("utf-8")
        if len(raw) > MAX_BODY_BYTES:
            raise HttpError(413, "Request body too large")
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            raise v.ValidationError("Request body must be a JSON object")
        return parsed

    def limit(self, default: int = 200) -> int:
        raw = self.query.get("limit")
        if raw is None:
            return default
        try:
            return min(max(int(raw), 1), db.MAX_PAGE)
        except ValueError:
            raise v.ValidationError("limit must be an integer") from None


Handler = Callable[[Request], tuple[int, Any]]
_ROUTES: list[tuple[str, re.Pattern, Handler]] = []


def route(method: str, template: str):
    pattern = re.compile("^" + re.sub(r"\{(\w+)\}", r"(?P<\1>[^/]+)", template) + "$")

    def decorator(fn: Handler) -> Handler:
        _ROUTES.append((method, pattern, fn))
        return fn
    return decorator


def _dispatch(event: dict) -> tuple[int, Any]:
    method = (event.get("httpMethod") or "GET").upper()
    path = (event.get("path") or "/").rstrip("/") or "/"
    path_matched = False
    for route_method, pattern, handler in _ROUTES:
        match = pattern.match(path)
        if not match:
            continue
        path_matched = True
        if route_method != method:
            continue
        params = {}
        for key, raw in match.groupdict().items():
            value = unquote(raw)
            if not v.ID_RE.match(value):
                raise v.ValidationError(f"Invalid {key}")
            params[key] = value
        return handler(Request(event, params))
    if path_matched:
        raise HttpError(405, "Method not allowed")
    raise HttpError(404, "Route not found")


def api_handler(event, context):
    method = (event.get("httpMethod") or "GET").upper()
    path = event.get("path", "/")
    if method == "OPTIONS":
        return _response(204)
    try:
        status, body = _dispatch(event)
    except HttpError as exc:
        status, body = exc.status, {"error": exc.message, **({"details": exc.details} if exc.details else {})}
    except v.ValidationError as exc:
        status, body = 400, {"error": str(exc), **({"details": exc.details} if exc.details else {})}
    except db.NotFound:
        status, body = 404, {"error": "Record not found"}
    except (json.JSONDecodeError, UnicodeDecodeError):
        status, body = 400, {"error": "Malformed JSON request body"}
    except ValueError as exc:
        status, body = 400, {"error": str(exc)}
    except ClientError:
        logger.exception("AWS service request failed")
        status, body = 502, {"error": "A storage or notification service request failed"}
    except Exception:  # noqa: BLE001
        logger.exception("Unhandled API error")
        status, body = 500, {"error": "Internal server error"}
    logger.info(json.dumps({"event": "request", "method": method, "path": path, "status": status}))
    return _response(status, body)


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------
def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


def _tolerance_default() -> float:
    try:
        return float(os.environ.get("DISCREPANCY_TOLERANCE_PCT", "5"))
    except ValueError:
        return 5.0


def _require(kind: str, entity_id: str, label: str) -> dict:
    record = db.get(kind, entity_id)
    if not record:
        raise HttpError(404, f"{label} not found")
    return record


def _log(claim_id: str, event_type: str, title: str, description: str, actor: str = "Reviewer", **extra) -> dict:
    stamp = db.now()
    return db.put("timeline", {
        "id": _uid("tl"), "claimId": claim_id, "type": event_type, "title": title,
        "description": description, "actorRole": actor, "timestamp": stamp, **extra,
    }, sort_ts=stamp)


def _notify(ntype: str, title: str, body: str, claim_id: str | None = None, discrepancy_id: str | None = None) -> dict:
    stamp = db.now()
    item = {"id": _uid("nt"), "type": ntype, "title": title, "body": body, "read": False, "timestamp": stamp}
    if claim_id:
        item["claimId"] = claim_id
    if discrepancy_id:
        item["discrepancyId"] = discrepancy_id
    return db.put("notification", item, sort_ts=stamp)


def _publish_alert(subject: str, message: str) -> None:
    topic = os.environ.get("ALERT_TOPIC_ARN", "")
    if not topic:
        return
    try:
        db.sns_client().publish(TopicArn=topic, Subject=subject[:100], Message=message)
    except ClientError:
        logger.exception("SNS publish failed")


def _public_evidence(item: dict) -> dict:
    return {k: val for k, val in item.items() if k != "s3Key"}


def _paged(items: list[dict], cursor: str | None) -> dict:
    body: dict[str, Any] = {"items": items}
    if cursor:
        body["nextCursor"] = cursor
    return body


def _filter(items: list[dict], query: dict, fields: tuple[str, ...]) -> list[dict]:
    for field in fields:
        wanted = query.get(field)
        if wanted:
            items = [i for i in items if str(i.get(field, "")) == wanted]
    return items


def _org_view(org: dict, claims: list[dict], discrepancies: list[dict]) -> dict:
    """Attach figures derived from live claims/discrepancies (never stored, so never stale)."""
    mine = [c for c in claims if c.get("orgId") == org["id"]]

    def recorded(claim: dict) -> float:
        for stage in ("recovered", "processed", "received", "collected"):
            number = recon.to_number(claim.get(stage))
            if number is not None:
                return number
        return 0.0

    activity = [str(c.get("updatedAt") or c.get("submittedIso") or "") for c in mine]
    view = dict(org)
    view.update({
        "claimIds": [c["id"] for c in mine],
        "totalClaimedTonnes": sum(recon.to_number(c.get("claimed")) or 0 for c in mine),
        "totalRecordedTonnes": sum(recorded(c) for c in mine),
        "openDiscrepancies": sum(1 for d in discrepancies
                                 if d.get("orgId") == org["id"] and d.get("status") != "Resolved"),
        "evidenceGaps": sum(max(int(c.get("evidenceCount", 0)) - int(c.get("evidenceAttached", 0)), 0) for c in mine),
        "lastActivityIso": max(activity) if activity else org.get("updatedAt", ""),
    })
    return view


def _increment_evidence(claim_id: str, delta: int) -> None:
    result = db.table().update_item(
        Key={"PK": db.pk("claim", claim_id), "SK": "META"},
        UpdateExpression="ADD evidenceAttached :d SET updatedAt = :u",
        ExpressionAttributeValues={":d": delta, ":u": db.now()},
        ConditionExpression="attribute_exists(PK)",
        ReturnValues="ALL_NEW",
    )
    claim = db.clean(result["Attributes"])
    if claim.get("evidenceAttached", 0) > claim.get("evidenceCount", 0):
        db.update("claim", claim_id, {"evidenceCount": claim["evidenceAttached"]})


def run_reconciliation(claim: dict, tolerance_pct: float) -> dict:
    """Detect findings for one claim and persist the new ones (idempotent)."""
    evidence = db.list_for_claim(claim["id"], "evidence")
    findings = recon.reconcile(claim, evidence, tolerance_pct)
    created, known = [], 0
    for finding in findings:
        try:
            saved = db.put("discrepancy", finding, finding["id"], only_if_new=True, sort_ts=finding["detectedAt"])
        except db.AlreadyExists:
            known += 1
            continue
        created.append(saved)
        _log(claim["id"], "discrepancy_detected", f"{saved['type']} detected", saved["description"],
             actor="System", discrepancyId=saved["id"])
        _notify("missing_evidence" if saved["type"] == "Missing Evidence" else "discrepancy",
                f"{saved['type']} on {claim['id']}", saved["description"], claim["id"], saved["id"])
    return {"claimId": claim["id"], "tolerancePct": tolerance_pct, "findings": len(findings),
            "created": created, "alreadyKnown": known}


# ---------------------------------------------------------------------------
# Health / bootstrap
# ---------------------------------------------------------------------------
@route("GET", "/health")
def health(req: Request):
    return 200, {"ok": True, "service": "cycleproof-api", "environment": os.environ.get("APP_ENV", "dev"), "time": db.now()}


@route("GET", "/bootstrap")
def bootstrap(req: Request):
    claims = db.list_all("claim")
    discrepancies = db.list_all("discrepancy")
    orgs = [_org_view(o, claims, discrepancies) for o in db.list_all("organization")]
    return 200, {
        "claims": claims,
        "organizations": orgs,
        "evidence": [_public_evidence(e) for e in db.list_all("evidence")],
        "discrepancies": discrepancies,
        "timeline": db.list_all("timeline"),
        "notifications": db.list_all("notification"),
        "mode": "aws",
    }


# ---------------------------------------------------------------------------
# Organizations
# ---------------------------------------------------------------------------
@route("GET", "/organizations")
def list_organizations(req: Request):
    orgs, cursor = db.list_kind("organization", req.limit(), req.query.get("cursor"))
    claims, discrepancies = db.list_all("claim"), db.list_all("discrepancy")
    return 200, _paged([_org_view(o, claims, discrepancies) for o in orgs], cursor)


@route("POST", "/organizations")
def create_organization(req: Request):
    p = req.body()
    org = {
        "name": v.text(p, "name", required=True, max_len=200),
        "type": v.choice(p.get("type"), v.ORG_TYPES, "type"),
        "location": v.text(p, "location", max_len=200, default=""),
        "registrationId": v.text(p, "registrationId", max_len=100, default=""),
        "contactName": v.text(p, "contactName", max_len=200, default=""),
        "status": v.choice(p.get("status", "Active"), v.ORG_STATUSES, "status"),
    }
    for _ in range(5):
        org["id"] = f"org-{db.next_counter('organization'):03d}"
        try:
            saved = db.put("organization", org, org["id"], only_if_new=True)
            break
        except db.AlreadyExists:
            continue  # id taken by seeded data; counter moves on
    else:
        raise HttpError(409, "Could not allocate an organization id")
    return 201, _org_view(saved, [], [])


@route("GET", "/organizations/{orgId}")
def get_organization(req: Request):
    org = _require("organization", req.params["orgId"], "Organization")
    return 200, _org_view(org, db.list_all("claim"), db.list_all("discrepancy"))


# ---------------------------------------------------------------------------
# Claims
# ---------------------------------------------------------------------------
@route("GET", "/claims")
def list_claims(req: Request):
    items, cursor = db.list_kind("claim", req.limit(), req.query.get("cursor"))
    return 200, _paged(_filter(items, req.query, ("status", "orgId", "period", "assignedReviewer")), cursor)


@route("POST", "/claims")
def create_claim(req: Request):
    p = req.body()
    org = _require("organization", v.text(p, "orgId", required=True, max_len=160), "Organization")
    claim: dict[str, Any] = {
        "orgId": org["id"],
        "partner": org["name"],
        "period": v.text(p, "period", required=True, max_len=40),
        "submittedIso": db.now(),
        "status": "Needs review",
        "claimed": v.quantity(p.get("claimed"), "claimed", allow_null=False),
        "evidenceCount": v.integer(p.get("evidenceCount", 0), "evidenceCount"),
        "evidenceAttached": 0,
        "reviewerNotes": v.text(p, "reviewerNotes", max_len=5000, default=""),
        "assignedReviewer": v.text(p, "assignedReviewer", max_len=120, default=""),
    }
    for stage in recon.STAGES:
        claim[stage] = v.quantity(p.get(stage), stage)
    year = datetime.now(timezone.utc).year
    for _ in range(5):
        claim["id"] = f"CP-{year}-{db.next_counter(f'claim-{year}'):03d}"
        try:
            saved = db.put("claim", claim, claim["id"], only_if_new=True)
            break
        except db.AlreadyExists:
            continue
    else:
        raise HttpError(409, "Could not allocate a claim id")
    _log(saved["id"], "claim_created", "Claim created", f"Claim {saved['id']} created for {org['name']} ({saved['period']}).")
    return 201, saved


@route("GET", "/claims/{claimId}")
def get_claim(req: Request):
    claim = _require("claim", req.params["claimId"], "Claim")
    if req.query.get("include") == "related":
        claim = dict(claim)
        claim["evidence"] = [_public_evidence(e) for e in db.list_for_claim(claim["id"], "evidence")]
        claim["discrepancies"] = db.list_for_claim(claim["id"], "discrepancy")
        claim["timeline"] = db.list_for_claim(claim["id"], "timeline")
    return 200, claim


@route("PATCH", "/claims/{claimId}")
def update_claim(req: Request):
    claim_id = req.params["claimId"]
    current = _require("claim", claim_id, "Claim")
    p = req.body()
    allowed = {"status", "reviewerNotes", "assignedReviewer", "evidenceCount", *v.QUANTITY_FIELDS}
    if not p:
        raise v.ValidationError("No fields to update")
    unknown = set(p) - allowed
    if unknown:
        raise v.ValidationError(f"Cannot update: {', '.join(sorted(unknown))}. Allowed: {', '.join(sorted(allowed))}")
    changes: dict[str, Any] = {}
    if "status" in p:
        changes["status"] = v.choice(p["status"], v.CLAIM_STATUSES, "status")
    if "reviewerNotes" in p:
        changes["reviewerNotes"] = v.text(p, "reviewerNotes", max_len=5000, default="")
    if "assignedReviewer" in p:
        changes["assignedReviewer"] = v.text(p, "assignedReviewer", max_len=120, default="")
    if "evidenceCount" in p:
        changes["evidenceCount"] = v.integer(p["evidenceCount"], "evidenceCount")
    for field in v.QUANTITY_FIELDS:
        if field in p:
            if field == "claimed" and p[field] in (None, ""):
                raise v.ValidationError("claimed cannot be empty")
            changes[field] = v.quantity(p[field], field)
    saved = db.update("claim", claim_id, changes)
    if "status" in changes and changes["status"] != current.get("status"):
        _log(claim_id, "status_changed", "Claim status changed", f"Status changed from {current.get('status')} to {changes['status']}.")
    moved = [f for f in v.QUANTITY_FIELDS if f in changes and changes[f] != current.get(f)]
    if moved:
        desc = "; ".join(f"{f}: {current.get(f)} → {changes[f]}" for f in moved)
        _log(claim_id, "quantity_updated", "Quantities updated", desc)
    return 200, saved


@route("POST", "/claims/{claimId}/reconcile")
def reconcile_claim(req: Request):
    claim = _require("claim", req.params["claimId"], "Claim")
    p = req.body()
    tolerance = v.tolerance(p["tolerancePct"]) if "tolerancePct" in p else _tolerance_default()
    return 200, run_reconciliation(claim, tolerance)


@route("GET", "/claims/{claimId}/timeline")
def claim_timeline(req: Request):
    claim_id = req.params["claimId"]
    _require("claim", claim_id, "Claim")
    return 200, {"items": db.list_for_claim(claim_id, "timeline")}


@route("POST", "/claims/{claimId}/notes")
def add_note(req: Request):
    claim_id = req.params["claimId"]
    _require("claim", claim_id, "Claim")
    p = req.body()
    note = v.text(p, "note", required=True, max_len=2000)
    extra = {}
    disc_id = v.text(p, "discrepancyId", max_len=160)
    if disc_id:
        disc = _require("discrepancy", disc_id, "Discrepancy")
        if disc.get("claimId") != claim_id:
            raise v.ValidationError("discrepancyId does not belong to this claim")
        extra["discrepancyId"] = disc_id
    return 201, _log(claim_id, "comment_added", "Review note added", note, **extra)


@route("GET", "/claims/{claimId}/report")
def claim_report(req: Request):
    claim_id = req.params["claimId"]
    claim = _require("claim", claim_id, "Claim")
    evidence = db.list_for_claim(claim_id, "evidence")
    discrepancies = db.list_for_claim(claim_id, "discrepancy")
    org = db.get("organization", claim.get("orgId", "")) if claim.get("orgId") else None
    stages = []
    for stage in recon.STAGES:
        records = [e for e in evidence if str(e.get("stage", "")).lower() == stage]
        stages.append({
            "label": v.STAGE_LABELS[stage],
            "quantityTonnes": recon.to_number(claim.get(stage)),
            "recordCount": sum(1 for e in records if not e.get("missing")),
            "evidenceMissing": any(e.get("missing") for e in records),
            "referenceIds": [e.get("reference", "") for e in records if not e.get("missing")],
        })
    open_items = [d for d in discrepancies if d.get("status") != "Resolved"]
    return 200, {
        "claim": claim,
        "organization": _org_view(org, [claim], discrepancies) if org else None,
        "claimedTonnes": recon.to_number(claim.get("claimed")),
        "stages": stages,
        "evidence": [_public_evidence(e) for e in evidence],
        "discrepancies": discrepancies,
        "timeline": db.list_for_claim(claim_id, "timeline"),
        "summary": {
            "discrepancyCount": len(discrepancies),
            "openDiscrepancies": len(open_items),
            "evidenceAttached": claim.get("evidenceAttached", 0),
            "evidenceExpected": claim.get("evidenceCount", 0),
            "tolerancePct": _tolerance_default(),
        },
        "generatedAt": db.now(),
        "disclaimer": "Discrepancies are signals for investigation, not proof of fraud. Conclusions require evidence and qualified human review.",
    }


def _import_row(claim_id: str, row: Any) -> dict:
    if not isinstance(row, dict):
        raise v.ValidationError("row must be an object")
    stage = v.stage_label(row.get("record_type") or "Received", "record_type")
    when = v.iso_date(row.get("date") or db.now(), "date")
    return {
        "id": _uid("ev"), "claimId": claim_id, "type": "CSV Import",
        "reference": v.text(row, "reference_id", required=True, max_len=200),
        "stage": stage, "dateIso": when,
        "quantityTonnes": v.quantity(row.get("quantity_tonnes"), "quantity_tonnes"),
        "source": v.text(row, "source", max_len=200, default="CSV Import"),
        "missing": False,
    }


@route("POST", "/claims/{claimId}/imports")
def import_records(req: Request):
    claim_id = req.params["claimId"]
    _require("claim", claim_id, "Claim")
    rows = req.body().get("records")
    if not isinstance(rows, list) or not rows or len(rows) > 1000:
        raise v.ValidationError("records must be a non-empty array with at most 1000 rows")
    items, errors = [], []
    for index, row in enumerate(rows, start=1):
        try:
            items.append(_import_row(claim_id, row))
        except v.ValidationError as exc:
            errors.append({"row": index, "message": str(exc)})
            if len(errors) >= 20:
                break
    if errors:
        raise v.ValidationError("Import rejected: some rows are invalid. Nothing was imported.", errors)
    created = db.put_many("evidence", items, "dateIso")
    _increment_evidence(claim_id, len(created))
    _log(claim_id, "evidence_added", "Records imported", f"{len(created)} structured record(s) imported from CSV.", actor="Data Importer")
    return 201, {"imported": len(created), "items": created}


# ---------------------------------------------------------------------------
# Discrepancies
# ---------------------------------------------------------------------------
@route("GET", "/discrepancies")
def list_discrepancies(req: Request):
    claim_id = req.query.get("claimId")
    if claim_id:
        items, cursor = db.list_for_claim(claim_id, "discrepancy"), None
    else:
        items, cursor = db.list_kind("discrepancy", req.limit(), req.query.get("cursor"))
    return 200, _paged(_filter(items, req.query, ("status", "type", "orgId")), cursor)


@route("GET", "/discrepancies/{discrepancyId}")
def get_discrepancy(req: Request):
    return 200, _require("discrepancy", req.params["discrepancyId"], "Discrepancy")


@route("PATCH", "/discrepancies/{discrepancyId}")
def update_discrepancy(req: Request):
    disc_id = req.params["discrepancyId"]
    current = _require("discrepancy", disc_id, "Discrepancy")
    p = req.body()
    if not p:
        raise v.ValidationError("No fields to update")
    if set(p) - {"status", "reviewerNotes"}:
        raise v.ValidationError("Only status and reviewerNotes can be updated")
    changes: dict[str, Any] = {}
    remove: tuple[str, ...] = ()
    if "status" in p:
        changes["status"] = v.choice(p["status"], v.DISCREPANCY_STATUSES, "status")
        if changes["status"] == "Resolved":
            changes["resolvedAt"] = db.now()
        elif current.get("resolvedAt"):
            remove = ("resolvedAt",)  # reopened
    if "reviewerNotes" in p:
        changes["reviewerNotes"] = v.text(p, "reviewerNotes", max_len=5000, default="")
    changes["reviewedAt"] = db.now()  # a human acted on this automated flag
    saved = db.update("discrepancy", disc_id, changes, remove)
    if changes.get("status") and changes["status"] != current.get("status"):
        _log(current.get("claimId", ""), "status_changed", "Discrepancy status changed",
             f"Discrepancy {disc_id} changed from {current.get('status')} to {changes['status']}.",
             discrepancyId=disc_id)
    return 200, saved


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
@route("GET", "/notifications")
def list_notifications(req: Request):
    items, cursor = db.list_kind("notification", req.limit(), req.query.get("cursor"))
    if req.query.get("unread") == "true":
        items = [n for n in items if not n.get("read")]
    return 200, _paged(items, cursor)


@route("POST", "/notifications/read-all")
def read_all_notifications(req: Request):
    unread = [n for n in db.list_all("notification", cap=1000) if not n.get("read")]
    for n in unread:
        db.update("notification", n["id"], {"read": True})
    return 200, {"updated": len(unread)}


@route("PATCH", "/notifications/{notificationId}")
def update_notification(req: Request):
    notif_id = req.params["notificationId"]
    p = req.body()
    if set(p) != {"read"} or not isinstance(p["read"], bool):
        raise v.ValidationError("Body must contain only a boolean 'read'")
    return 200, db.update("notification", notif_id, {"read": p["read"]})


# ---------------------------------------------------------------------------
# Evidence files (S3 presigned URLs)
# ---------------------------------------------------------------------------
@route("GET", "/evidence")
def list_evidence(req: Request):
    claim_id = req.query.get("claimId")
    if claim_id:
        items, cursor = db.list_for_claim(claim_id, "evidence"), None
    else:
        items, cursor = db.list_kind("evidence", req.limit(), req.query.get("cursor"))
    return 200, _paged([_public_evidence(e) for e in items], cursor)


@route("POST", "/evidence/upload-url")
def evidence_upload_url(req: Request):
    p = req.body()
    claim_id = v.text(p, "claimId", required=True, max_len=160)
    _require("claim", claim_id, "Claim")
    filename = v.text(p, "filename", required=True, max_len=180)
    if not v.FILENAME_RE.match(filename) or ".." in filename:
        raise v.ValidationError("filename may only contain letters, digits, spaces, dot, dash and underscore")
    content_type = v.choice(p.get("contentType"), v.UPLOAD_TYPES, "contentType")
    size = v.integer(p.get("sizeBytes"), "sizeBytes", minimum=1, maximum=v.MAX_UPLOAD_BYTES)
    ev_type = v.choice(p.get("type", "CSV Import" if content_type == "text/csv" else "Collection Log"), v.EVIDENCE_TYPES, "type")
    stage = v.stage_label(p.get("stage", "Received"))
    bucket = os.environ.get("EVIDENCE_BUCKET", "")
    if not bucket:
        raise RuntimeError("EVIDENCE_BUCKET is not configured")
    evidence_id = _uid("ev")
    key = f"evidence/{claim_id}/{evidence_id}/{filename}"
    # ContentLength is signed: S3 rejects an upload whose size differs from what was declared.
    url = db.s3_client().generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": content_type, "ContentLength": size},
        ExpiresIn=URL_TTL_SECONDS,
    )
    db.put("evidence", {
        "id": evidence_id, "claimId": claim_id, "type": ev_type,
        "reference": v.text(p, "reference", max_len=200, default=filename), "stage": stage,
        "dateIso": v.iso_date(p["date"]) if p.get("date") else db.now(), "quantityTonnes": v.quantity(p.get("quantityTonnes"), "quantityTonnes"),
        "source": v.text(p, "source", max_len=200, default="Evidence upload"), "missing": False,
        "s3Key": key, "contentType": content_type, "sizeBytes": size, "uploadPending": True,
    }, evidence_id)
    return 201, {"evidenceId": evidence_id, "uploadUrl": url, "expiresIn": URL_TTL_SECONDS, "method": "PUT",
                 "headers": {"Content-Type": content_type}}


@route("POST", "/evidence/{evidenceId}/complete")
def evidence_complete(req: Request):
    evidence_id = req.params["evidenceId"]
    ev = _require("evidence", evidence_id, "Evidence")
    if not ev.get("s3Key"):
        raise HttpError(409, "This evidence record has no uploaded file")
    if not ev.get("uploadPending"):
        return 200, _public_evidence(ev)
    try:
        head = db.s3_client().head_object(Bucket=os.environ.get("EVIDENCE_BUCKET", ""), Key=ev["s3Key"])
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") in ("404", "403", "NoSuchKey", "NotFound"):
            raise HttpError(409, "The file has not been uploaded yet") from exc
        raise
    if head.get("ContentLength") != ev.get("sizeBytes"):
        raise HttpError(409, "Uploaded file size does not match the declared size")
    saved = db.update("evidence", evidence_id, {"uploadedAt": db.now()}, remove=("uploadPending",))
    _increment_evidence(ev["claimId"], 1)
    _log(ev["claimId"], "evidence_added", "Evidence uploaded", f"{ev.get('type')} {ev.get('reference')} uploaded for the {ev.get('stage')} stage.")
    return 200, _public_evidence(saved)


@route("GET", "/evidence/{evidenceId}/download-url")
def evidence_download_url(req: Request):
    ev = _require("evidence", req.params["evidenceId"], "Evidence")
    if not ev.get("s3Key") or ev.get("uploadPending"):
        raise HttpError(404, "Evidence file not found")
    filename = ev["s3Key"].rsplit("/", 1)[-1]
    url = db.s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ.get("EVIDENCE_BUCKET", ""), "Key": ev["s3Key"],
                "ResponseContentDisposition": f'attachment; filename="{filename}"'},
        ExpiresIn=URL_TTL_SECONDS,
    )
    return 200, {"downloadUrl": url, "expiresIn": URL_TTL_SECONDS}


# ---------------------------------------------------------------------------
# Scheduled reconciliation (EventBridge)
# ---------------------------------------------------------------------------
def scheduled_handler(event, context):
    """Nightly: re-check every claim that is not already Reconciled."""
    tolerance = _tolerance_default()
    checked = created = failed = 0
    for claim in db.list_all("claim"):
        if claim.get("status") == "Reconciled":
            continue
        try:
            result = run_reconciliation(claim, tolerance)
        except Exception:  # noqa: BLE001 - one bad record must not stop the run
            failed += 1
            logger.exception("Reconciliation failed for claim %s", claim.get("id"))
            continue
        checked += 1
        created += len(result["created"])
    if created:
        _publish_alert(
            "CycleProof review alerts",
            f"Scheduled reconciliation created {created} new discrepancy signal(s) in environment "
            f"{os.environ.get('APP_ENV', 'dev')}. Review them in CycleProof. Signals require human investigation.",
        )
    summary = {"claimsChecked": checked, "findingsCreated": created, "claimsFailed": failed}
    logger.info(json.dumps({"event": "scheduled_reconciliation_complete", **summary}))
    return summary
