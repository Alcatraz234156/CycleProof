"""
reconciler.py — Core Mathematical Reconciliation & Risk Engine for CycleProof

Implements the domain rules for the e-waste lifecycle:
Collected -> Received -> Processed -> Recovered -> Dispatched
Calculates variances, flags discrepancies against configurable tolerances,
and identifies missing evidence or unreconciled losses.
"""

from typing import Dict, Any, List, Optional
import datetime
import uuid


def calculate_percentage_diff(expected: Optional[float], observed: Optional[float]) -> Optional[float]:
    """Calculates percentage difference relative to expected."""
    if expected is None or observed is None:
        return None
    if expected == 0:
        return 0.0 if observed == 0 else 100.0
    return round(((observed - expected) / expected) * 100, 2)


def run_claim_reconciliation(
    claim: Dict[str, Any],
    evidence_list: List[Dict[str, Any]],
    tolerance_pct: float = 5.0
) -> Dict[str, Any]:
    """
    Performs full reconciliation on a claim and returns detected discrepancies,
    status recommendation, and risk metrics.
    """
    discrepancies: List[Dict[str, Any]] = []
    claim_id = claim.get("id", "")
    org_id = claim.get("orgId", "")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    claimed_qty = float(claim.get("claimed", 0.0))
    collected_qty = claim.get("collected")
    received_qty = claim.get("received")
    processed_qty = claim.get("processed")
    recovered_qty = claim.get("recovered")
    dispatched_qty = claim.get("dispatched")

    # 1. Check Declared Claim vs Collected / Received
    if collected_qty is not None:
        pct_diff = calculate_percentage_diff(claimed_qty, float(collected_qty))
        abs_diff = round(abs(float(collected_qty) - claimed_qty), 2)
        if pct_diff is not None and abs(pct_diff) > tolerance_pct:
            discrepancies.append({
                "id": f"disc-{uuid.uuid4().hex[:8]}",
                "claimId": claim_id,
                "orgId": org_id,
                "type": "Quantity Mismatch",
                "description": f"Declared quantity ({claimed_qty} t) mismatches collected quantity ({collected_qty} t) by {abs(pct_diff)}%.",
                "expectedValue": claimed_qty,
                "observedValue": float(collected_qty),
                "unit": "tonnes",
                "absoluteDiff": abs_diff,
                "pctDiff": pct_diff,
                "tolerancePct": tolerance_pct,
                "detectionExplanation": f"Collected amount deviates from claim by more than {tolerance_pct}% allowed variance threshold.",
                "relevantEvidenceIds": [e.get("id") for e in evidence_list if e.get("stage") == "Collected"],
                "status": "Open",
                "reviewerNotes": "",
                "detectedAt": now_iso
            })

    # 2. Check Transit Loss: Collected vs Received
    if collected_qty is not None and received_qty is not None:
        collected_val = float(collected_qty)
        received_val = float(received_qty)
        transit_diff = calculate_percentage_diff(collected_val, received_val)
        if transit_diff is not None and transit_diff < -tolerance_pct:
            discrepancies.append({
                "id": f"disc-{uuid.uuid4().hex[:8]}",
                "claimId": claim_id,
                "orgId": org_id,
                "type": "Unreconciled Loss",
                "description": f"Unexplained transit shortfall: Received {received_val} t vs Collected {collected_val} t ({abs(transit_diff)}% drop).",
                "expectedValue": collected_val,
                "observedValue": received_val,
                "unit": "tonnes",
                "absoluteDiff": round(collected_val - received_val, 2),
                "pctDiff": transit_diff,
                "tolerancePct": tolerance_pct,
                "detectionExplanation": "Material received at recycling facility is less than dispatched from collection center.",
                "relevantEvidenceIds": [e.get("id") for e in evidence_list if e.get("stage") in ["Collected", "Received"]],
                "status": "Open",
                "reviewerNotes": "",
                "detectedAt": now_iso
            })

    # 3. Check Recovery Yield: Recovered vs Processed
    if processed_qty is not None and recovered_qty is not None:
        proc_val = float(processed_qty)
        rec_val = float(recovered_qty)
        if rec_val > proc_val:
            discrepancies.append({
                "id": f"disc-{uuid.uuid4().hex[:8]}",
                "claimId": claim_id,
                "orgId": org_id,
                "type": "Quantity Mismatch",
                "description": f"Physical anomaly: Recovered output ({rec_val} t) exceeds Processed input ({proc_val} t).",
                "expectedValue": proc_val,
                "observedValue": rec_val,
                "unit": "tonnes",
                "absoluteDiff": round(rec_val - proc_val, 2),
                "pctDiff": calculate_percentage_diff(proc_val, rec_val),
                "tolerancePct": 0.0,
                "detectionExplanation": "Mass balance violation: output yield cannot exceed total input processed batch weight.",
                "relevantEvidenceIds": [e.get("id") for e in evidence_list if e.get("stage") in ["Processed", "Recovered"]],
                "status": "Open",
                "reviewerNotes": "",
                "detectedAt": now_iso
            })

    # 4. Check Missing Evidence Records
    expected_stages = ["Collected", "Received", "Processed", "Recovered", "Dispatched"]
    present_stages = set(e.get("stage") for e in evidence_list if not e.get("missing", False))
    for stage in expected_stages:
        # If there's quantity declared for this stage, evidence is strictly required
        stage_qty = claim.get(stage.lower())
        if stage_qty is not None and stage not in present_stages:
            discrepancies.append({
                "id": f"disc-{uuid.uuid4().hex[:8]}",
                "claimId": claim_id,
                "orgId": org_id,
                "type": "Missing Evidence",
                "description": f"Missing mandatory compliance document for the '{stage}' stage ({stage_qty} t reported).",
                "expectedValue": None,
                "observedValue": None,
                "unit": "document",
                "absoluteDiff": None,
                "pctDiff": None,
                "tolerancePct": None,
                "detectionExplanation": f"Stage '{stage}' has recorded material weight but lacks verified weighbridge tickets or receipts.",
                "relevantEvidenceIds": [],
                "status": "Open",
                "reviewerNotes": "",
                "detectedAt": now_iso
            })

    # Determine recommended claim status
    recommended_status = "Reconciled" if len(discrepancies) == 0 else "Needs review"

    return {
        "claimId": claim_id,
        "discrepancies": discrepancies,
        "recommendedStatus": recommended_status,
        "totalDiscrepancies": len(discrepancies),
        "reconciledAt": now_iso
    }

