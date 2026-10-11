"""Reconciliation rules. Pure functions: no AWS, no I/O.

Principles (from the project README):
- compare values only when both exist; missing is never treated as zero
- never divide by a zero/missing denominator
- keep source values next to the calculated difference and explain the rule
- findings are signals for human review, not proof of wrongdoing
- every finding has a stable `fingerprint` so reruns don't create duplicates
"""
from __future__ import annotations

import hashlib
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

STAGES = ["collected", "received", "processed", "recovered", "dispatched"]
# (earlier, later) pairs compared for quantity differences. "claimed" is the
# declared quantity and is checked against what was actually collected.
QUANTITY_PAIRS = [("claimed", "collected")] + list(zip(STAGES, STAGES[1:]))

SIGNAL_NOTE = "This is a review signal, not proof of wrongdoing."


def discrepancy_id(claim_id: str, fingerprint: str) -> str:
    """Deterministic id: the same finding on the same claim always maps to one record."""
    digest = hashlib.sha1(f"{claim_id}|{fingerprint}".encode()).hexdigest()[:12]
    return f"disc-{digest}"


def to_number(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def parse_date(value: Any) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _base(claim: dict, fingerprint: str, dtype: str, description: str, explanation: str, *,
          expected=None, observed=None, abs_diff=None, pct=None, tolerance=None,
          evidence_ids=None, now: datetime | None = None, **extra) -> dict:
    finding = {
        "id": discrepancy_id(claim["id"], fingerprint),
        "fingerprint": fingerprint,
        "claimId": claim["id"],
        "orgId": claim.get("orgId", ""),
        "type": dtype,
        "description": description,
        "expectedValue": expected,
        "observedValue": observed,
        "unit": "tonnes",
        "absoluteDiff": abs_diff,
        "pctDiff": pct,
        "tolerancePct": tolerance,
        "detectionExplanation": f"{explanation} {SIGNAL_NOTE}",
        "relevantEvidenceIds": list(evidence_ids or []),
        "status": "Open",
        "reviewerNotes": "",
        "detectedAt": (now or datetime.now(timezone.utc)).isoformat(),
        "automated": True,
    }
    finding.update(extra)
    return finding


# --------------------------------------------------------------------------
# Rule 1: quantity differences between compatible values
# --------------------------------------------------------------------------
def quantity_findings(claim: dict, tolerance_pct: float = 5.0, now: datetime | None = None) -> list[dict]:
    findings = []
    for left, right in QUANTITY_PAIRS:
        expected, observed = to_number(claim.get(left)), to_number(claim.get(right))
        if expected is None or observed is None:
            continue  # missing is not silently treated as zero
        if expected == 0:
            continue  # no valid percentage without a denominator
        pct = abs(expected - observed) / abs(expected) * 100
        if pct <= tolerance_pct:
            continue
        diff = round(expected - observed, 4)
        direction = "higher" if observed > expected else "lower"
        findings.append(_base(
            claim, f"quantity:{left}>{right}", "Quantity Mismatch",
            f"{left.title()} and {right.title()} quantities differ beyond the configured tolerance.",
            f"Compared {left} ({expected:g} tonnes) with {right} ({observed:g} tonnes); {right} is "
            f"{direction} by {pct:.2f}% of {left}, above the {tolerance_pct:g}% tolerance.",
            expected=expected, observed=observed, abs_diff=round(abs(diff), 4),
            pct=round(pct, 2), tolerance=tolerance_pct, now=now,
            stageComparison=[left, right],
        ))
    return findings


# --------------------------------------------------------------------------
# Rule 2: missing evidence
# --------------------------------------------------------------------------
def evidence_findings(claim: dict, evidence: list[dict], now: datetime | None = None) -> list[dict]:
    findings = []
    covered_stages = {e.get("stage", "").lower() for e in evidence
                      if not e.get("missing") and not e.get("uploadPending")}
    flagged_stages = set()
    for ev in evidence:
        if not ev.get("missing"):
            continue
        stage = str(ev.get("stage", "")).lower()
        flagged_stages.add(stage)
        findings.append(_base(
            claim, f"missing:record:{ev['id']}", "Missing Evidence",
            f"Expected {ev.get('type', 'evidence')} {ev.get('reference', '')} for the {stage} stage has not been provided.".replace("  ", " "),
            f"The evidence record {ev.get('reference', ev['id'])} is marked as expected but not yet attached.",
            evidence_ids=[ev["id"]], now=now, stageComparison=[stage],
        ))
    for stage in STAGES:
        qty = to_number(claim.get(stage))
        if qty is None or stage in covered_stages or stage in flagged_stages:
            continue
        findings.append(_base(
            claim, f"missing:stage:{stage}", "Missing Evidence",
            f"A {stage} quantity is reported but no supporting evidence is attached for that stage.",
            f"The claim reports {qty:g} tonnes {stage}, and no evidence record is attached to the {stage} stage.",
            observed=qty, now=now, stageComparison=[stage],
        ))
    return findings


# --------------------------------------------------------------------------
# Rule 3: possible duplicates
# --------------------------------------------------------------------------
def duplicate_findings(claim: dict, evidence: list[dict], now: datetime | None = None) -> list[dict]:
    groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for ev in evidence:
        if ev.get("missing"):
            continue
        ref = str(ev.get("reference", "")).strip().lower()
        if ref:
            groups[(ref, str(ev.get("stage", "")).lower())].append(ev)
    findings = []
    for (ref, stage), records in sorted(groups.items()):
        if len(records) < 2:
            continue
        quantities = [to_number(r.get("quantityTonnes")) for r in records]
        findings.append(_base(
            claim, f"duplicate:{stage}:{ref}", "Duplicate Record",
            f"Reference {records[0].get('reference')} appears {len(records)} times for the {stage} stage.",
            f"{len(records)} evidence records share the reference {records[0].get('reference')} at the {stage} stage "
            f"(quantities: {', '.join('n/a' if q is None else f'{q:g}' for q in quantities)}). "
            "They may be a double-counted entry or a legitimately split record.",
            evidence_ids=[r["id"] for r in records], now=now, stageComparison=[stage],
        ))
    return findings


# --------------------------------------------------------------------------
# Rule 4: date inconsistencies
# --------------------------------------------------------------------------
def date_findings(claim: dict, evidence: list[dict], now: datetime | None = None) -> list[dict]:
    current = now or datetime.now(timezone.utc)
    findings = []
    earliest: dict[str, tuple[datetime, dict]] = {}
    for ev in evidence:
        if ev.get("missing"):
            continue
        when = parse_date(ev.get("dateIso"))
        if when is None:
            continue
        if when > current + timedelta(days=1):
            findings.append(_base(
                claim, f"date:future:{ev['id']}", "Date Inconsistency",
                f"Evidence {ev.get('reference', ev['id'])} is dated in the future.",
                f"The record dated {when.date().isoformat()} is later than the current date.",
                evidence_ids=[ev["id"]], now=now,
            ))
        stage = str(ev.get("stage", "")).lower()
        if stage in STAGES and (stage not in earliest or when < earliest[stage][0]):
            earliest[stage] = (when, ev)
    for earlier, later in zip(STAGES, STAGES[1:]):
        if earlier in earliest and later in earliest and earliest[later][0] < earliest[earlier][0]:
            (d_later, e_later), (d_earlier, e_earlier) = earliest[later], earliest[earlier]
            findings.append(_base(
                claim, f"date:order:{earlier}>{later}", "Date Inconsistency",
                f"The earliest {later} record predates the earliest {earlier} record.",
                f"Earliest {later} evidence is dated {d_later.date().isoformat()}, before the earliest {earlier} "
                f"evidence ({d_earlier.date().isoformat()}). Material normally moves forward through the chain.",
                evidence_ids=[e_earlier["id"], e_later["id"]], now=now, stageComparison=[earlier, later],
            ))
    return findings


# --------------------------------------------------------------------------
def reconcile(claim: dict, evidence: list[dict] | None = None, tolerance_pct: float = 5.0,
              now: datetime | None = None) -> list[dict]:
    """Run every rule and return findings (not yet persisted)."""
    evidence = evidence or []
    return (
        quantity_findings(claim, tolerance_pct, now)
        + evidence_findings(claim, evidence, now)
        + duplicate_findings(claim, evidence, now)
        + date_findings(claim, evidence, now)
    )
