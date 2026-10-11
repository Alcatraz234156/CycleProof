"""Request validation. Constants mirror frontend/src/types/index.ts."""
from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from typing import Any

CLAIM_STATUSES = {"Needs review", "In review", "Reconciled"}
DISCREPANCY_STATUSES = {"Open", "Under Review", "Resolved", "Needs Information"}
ORG_TYPES = {"Collection Center", "E-Waste Recycler", "Processing Facility",
             "Material Recovery Facility", "Dispatch Destination"}
ORG_STATUSES = {"Active", "Under Review", "Suspended"}
EVIDENCE_TYPES = {"Weighbridge Ticket", "Processing Batch Summary", "Dispatch Receipt",
                  "Collection Log", "Chain of Custody", "CSV Import"}
STAGE_LABELS = {"collected": "Collected", "received": "Received", "processed": "Processed",
                "recovered": "Recovered", "dispatched": "Dispatched"}
QUANTITY_FIELDS = ("claimed", "collected", "received", "processed", "recovered", "dispatched")
UPLOAD_TYPES = {"text/csv", "application/pdf", "image/png", "image/jpeg"}

MAX_QUANTITY = 1_000_000_000
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
ID_RE = re.compile(r"^[A-Za-z0-9._:-]{1,160}$")
FILENAME_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9._ -]{0,179}$")


class ValidationError(ValueError):
    """Client error (HTTP 400). `details` may list per-field problems."""

    def __init__(self, message: str, details: list[dict] | None = None):
        super().__init__(message)
        self.details = details or []


def text(payload: dict, key: str, *, required: bool = False, max_len: int = 200, default: str | None = None) -> str | None:
    value = payload.get(key)
    if value is None or value == "":
        if required:
            raise ValidationError(f"{key} is required")
        return default
    if not isinstance(value, str):
        raise ValidationError(f"{key} must be a string")
    value = value.strip()
    if required and not value:
        raise ValidationError(f"{key} is required")
    if len(value) > max_len:
        raise ValidationError(f"{key} must be at most {max_len} characters")
    return value


def choice(value: Any, allowed: set[str], name: str) -> str:
    if value not in allowed:
        raise ValidationError(f"Invalid {name}. Allowed values: {', '.join(sorted(allowed))}")
    return value


def quantity(value: Any, name: str, *, allow_null: bool = True) -> float | None:
    """Non-negative finite tonnes. None / "" mean 'no data' (never zero)."""
    if value is None or value == "":
        if allow_null:
            return None
        raise ValidationError(f"{name} is required")
    if isinstance(value, bool):
        raise ValidationError(f"{name} must be a non-negative number")
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{name} must be a non-negative number") from None
    if not math.isfinite(number) or number < 0 or number > MAX_QUANTITY:
        raise ValidationError(f"{name} must be a non-negative number")
    return number


def integer(value: Any, name: str, *, minimum: int = 0, maximum: int = 1_000_000) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value:
        raise ValidationError(f"{name} must be an integer")
    value = int(value)
    if value < minimum or value > maximum:
        raise ValidationError(f"{name} must be between {minimum} and {maximum}")
    return value


def iso_date(value: Any, name: str = "date") -> str:
    """Accept YYYY-MM-DD or a full ISO-8601 timestamp; return an ISO string (UTC if naive)."""
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"{name} must be an ISO date")
    raw = value.strip()
    candidate = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        raise ValidationError(f"{name} must be an ISO date (YYYY-MM-DD)") from None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.isoformat()


def stage_label(value: Any, name: str = "stage") -> str:
    key = str(value or "").strip().lower()
    if key not in STAGE_LABELS:
        raise ValidationError(f"{name} must be one of: {', '.join(STAGE_LABELS.values())}")
    return STAGE_LABELS[key]


def tolerance(value: Any) -> float:
    number = quantity(value, "tolerancePct", allow_null=False)
    if number > 100:
        raise ValidationError("tolerancePct must be between 0 and 100")
    return number
