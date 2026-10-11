import pytest
from reconciler import calculate_percentage_diff, run_claim_reconciliation

def test_percentage_diff_calculation():
    # 100 expected, 105 observed = +5.0%
    assert calculate_percentage_diff(100.0, 105.0) == 5.0
    # 100 expected, 90 observed = -10.0%
    assert calculate_percentage_diff(100.0, 90.0) == -10.0
    # None handling
    assert calculate_percentage_diff(None, 100.0) is None

def test_reconciliation_flags_discrepancy_on_high_variance():
    claim = {
        "id": "CLM-001",
        "orgId": "ORG-ALPHA",
        "claimed": 100.0,
        "collected": 85.0,  # 15% shortfall, exceeds 5% tolerance
        "received": 85.0,
        "processed": 80.0,
        "recovered": 75.0,
        "dispatched": 75.0
    }
    evidence = [
        {"id": "ev-1", "stage": "Collected", "missing": False},
        {"id": "ev-2", "stage": "Received", "missing": False},
        {"id": "ev-3", "stage": "Processed", "missing": False},
        {"id": "ev-4", "stage": "Recovered", "missing": False},
        {"id": "ev-5", "stage": "Dispatched", "missing": False},
    ]

    result = run_claim_reconciliation(claim, evidence, tolerance_pct=5.0)
    assert result["recommendedStatus"] == "Needs review"
    assert len(result["discrepancies"]) == 1
    assert result["discrepancies"][0]["type"] == "Quantity Mismatch"
    assert result["discrepancies"][0]["pctDiff"] == -15.0

def test_reconciliation_detects_mass_balance_anomaly():
    claim = {
        "id": "CLM-002",
        "orgId": "ORG-BETA",
        "claimed": 50.0,
        "collected": 50.0,
        "received": 50.0,
        "processed": 40.0,
        "recovered": 48.0,  # Physically impossible: recovered > processed
        "dispatched": 48.0
    }
    evidence = [
        {"id": "ev-1", "stage": "Collected", "missing": False},
        {"id": "ev-2", "stage": "Received", "missing": False},
        {"id": "ev-3", "stage": "Processed", "missing": False},
        {"id": "ev-4", "stage": "Recovered", "missing": False},
        {"id": "ev-5", "stage": "Dispatched", "missing": False},
    ]

    result = run_claim_reconciliation(claim, evidence, tolerance_pct=5.0)
    # Finds mass balance violation
    anomaly = [d for d in result["discrepancies"] if "Physical anomaly" in d["description"]]
    assert len(anomaly) == 1

def test_reconciliation_flags_missing_evidence():
    claim = {
        "id": "CLM-003",
        "orgId": "ORG-GAMMA",
        "claimed": 30.0,
        "collected": 30.0,
        "received": 30.0,
        "processed": 30.0,
        "recovered": 25.0,
        "dispatched": 25.0
    }
    # No evidence attached for Processed stage
    evidence = [
        {"id": "ev-1", "stage": "Collected", "missing": False},
        {"id": "ev-2", "stage": "Received", "missing": False},
    ]

    result = run_claim_reconciliation(claim, evidence, tolerance_pct=5.0)
    missing = [d for d in result["discrepancies"] if d["type"] == "Missing Evidence"]
    assert len(missing) >= 1

