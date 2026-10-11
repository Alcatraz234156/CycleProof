"""
local_server.py — Local development & offline demonstration server.
Emulates the Amazon API Gateway & AWS Lambda handlers locally on http://127.0.0.1:5000.
Allows rapid frontend-backend testing without incurring AWS cloud costs.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import datetime
import uuid

# Add backend/src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
from reconciler import run_claim_reconciliation

app = Flask(__name__)
CORS(app)

# In-memory mock database matching DynamoDB tables
DB = {
    "organizations": [
        {
            "id": "org-green-cycle",
            "name": "GreenCycle Processing Hub",
            "type": "Processing Facility",
            "location": "Sector 4, Eco Industrial Park",
            "registrationId": "REG-2026-9041",
            "contactName": "Dr. Aris Thorne",
            "claimIds": ["CLM-2026-001"],
            "totalClaimedTonnes": 450.5,
            "totalRecordedTonnes": 428.0,
            "openDiscrepancies": 2,
            "evidenceGaps": 1,
            "lastActivityIso": "2026-10-10T14:30:00Z",
            "status": "Under Review"
        },
        {
            "id": "org-sol-metals",
            "name": "SolMetals Recovery Yard",
            "type": "Material Recovery Facility",
            "location": "Bayshore Terminal Road",
            "registrationId": "REG-2026-1182",
            "contactName": "Elena Vance",
            "claimIds": ["CLM-2026-002"],
            "totalClaimedTonnes": 280.0,
            "totalRecordedTonnes": 280.0,
            "openDiscrepancies": 0,
            "evidenceGaps": 0,
            "lastActivityIso": "2026-10-09T11:00:00Z",
            "status": "Active"
        }
    ],
    "claims": [
        {
            "id": "CLM-2026-001",
            "orgId": "org-green-cycle",
            "partner": "GreenCycle Processing Hub",
            "period": "Oct 2026",
            "submittedIso": "2026-10-05T09:00:00Z",
            "status": "Needs review",
            "claimed": 450.5,
            "collected": 450.5,
            "received": 420.0,    # Transit loss
            "processed": 420.0,
            "recovered": 395.0,
            "dispatched": 390.0,
            "evidenceCount": 5,
            "evidenceAttached": 4,
            "reviewerNotes": "Preliminary review: Investigation opened regarding 30.5t shortfall between collected and received weights.",
            "assignedReviewer": "Sarah Chen"
        },
        {
            "id": "CLM-2026-002",
            "orgId": "org-sol-metals",
            "partner": "SolMetals Recovery Yard",
            "period": "Sep 2026",
            "submittedIso": "2026-09-30T10:00:00Z",
            "status": "Reconciled",
            "claimed": 280.0,
            "collected": 280.0,
            "received": 280.0,
            "processed": 278.0,
            "recovered": 265.0,
            "dispatched": 265.0,
            "evidenceCount": 5,
            "evidenceAttached": 5,
            "reviewerNotes": "All chain-of-custody documentation and weighbridge certificates verified.",
            "assignedReviewer": "Sarah Chen"
        }
    ],
    "evidence": [
        {
            "id": "ev-001",
            "claimId": "CLM-2026-001",
            "type": "Weighbridge Ticket",
            "reference": "WB-2026-8819",
            "stage": "Collected",
            "dateIso": "2026-10-01",
            "quantityTonnes": 450.5,
            "source": "Metro Collection Depot A",
            "missing": False,
            "notes": "Verified entry weighbridge slip"
        },
        {
            "id": "ev-002",
            "claimId": "CLM-2026-001",
            "type": "Weighbridge Ticket",
            "reference": "WB-2026-8842",
            "stage": "Received",
            "dateIso": "2026-10-02",
            "quantityTonnes": 420.0,
            "source": "GreenCycle Receiving Gate",
            "missing": False,
            "notes": "30.5t discrepancy noted at gate entry"
        }
    ],
    "discrepancies": [],
    "timeline": []
}

# Run initial reconciliation for mock claims
for c in DB["claims"]:
    claim_ev = [e for e in DB["evidence"] if e["claimId"] == c["id"]]
    rec = run_claim_reconciliation(c, claim_ev)
    DB["discrepancies"].extend(rec["discrepancies"])

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "service": "CycleProof AWS Backend", "env": "local-dev"})

@app.route("/organizations", methods=["GET"])
def get_organizations():
    return jsonify(DB["organizations"])

@app.route("/claims", methods=["GET"])
def get_claims():
    org_id = request.args.get("orgId")
    status = request.args.get("status")
    claims = DB["claims"]
    if org_id:
        claims = [c for c in claims if c["orgId"] == org_id]
    if status:
        claims = [c for c in claims if c["status"] == status]
    return jsonify(claims)

@app.route("/claims/<claim_id>", methods=["GET"])
def get_claim(claim_id):
    claim = next((c for c in DB["claims"] if c["id"] == claim_id), None)
    if not claim:
        return jsonify({"error": "Claim not found"}), 404
    return jsonify(claim)

@app.route("/claims/<claim_id>", methods=["PATCH"])
def update_claim(claim_id):
    claim = next((c for c in DB["claims"] if c["id"] == claim_id), None)
    if not claim:
        return jsonify({"error": "Claim not found"}), 404
    data = request.json or {}
    if "status" in data:
        claim["status"] = data["status"]
    if "reviewerNotes" in data:
        claim["reviewerNotes"] = data["reviewerNotes"]
    
    # Timeline entry
    DB["timeline"].append({
        "id": f"tl-{uuid.uuid4().hex[:6]}",
        "claimId": claim_id,
        "type": "status_changed" if "status" in data else "comment_added",
        "title": f"Updated by reviewer",
        "description": data.get("reviewerNotes") or f"Status set to {data.get('status')}",
        "actorRole": data.get("actorRole", "Reviewer"),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })
    return jsonify({"message": "Updated successfully", "claim": claim})

@app.route("/claims/<claim_id>/reconcile", methods=["POST"])
def reconcile_claim_endpoint(claim_id):
    claim = next((c for c in DB["claims"] if c["id"] == claim_id), None)
    if not claim:
        return jsonify({"error": "Claim not found"}), 404
    
    ev_list = [e for e in DB["evidence"] if e["claimId"] == claim_id]
    result = run_claim_reconciliation(claim, ev_list)

    # Replace discrepancies for this claim
    DB["discrepancies"] = [d for d in DB["discrepancies"] if d["claimId"] != claim_id]
    DB["discrepancies"].extend(result["discrepancies"])
    claim["status"] = result["recommendedStatus"]

    return jsonify(result)

@app.route("/discrepancies", methods=["GET"])
def get_discrepancies():
    claim_id = request.args.get("claimId")
    discs = DB["discrepancies"]
    if claim_id:
        discs = [d for d in discs if d["claimId"] == claim_id]
    return jsonify(discs)

@app.route("/discrepancies/<disc_id>", methods=["PATCH"])
def update_discrepancy(disc_id):
    disc = next((d for d in DB["discrepancies"] if d["id"] == disc_id), None)
    if not disc:
        return jsonify({"error": "Discrepancy not found"}), 404
    data = request.json or {}
    if "status" in data:
        disc["status"] = data["status"]
    if "reviewerNotes" in data:
        disc["reviewerNotes"] = data["reviewerNotes"]
    return jsonify({"message": "Discrepancy updated", "discrepancy": disc})

@app.route("/evidence", methods=["GET"])
def get_evidence():
    claim_id = request.args.get("claimId")
    ev = DB["evidence"]
    if claim_id:
        ev = [e for e in ev if e["claimId"] == claim_id]
    return jsonify(ev)

@app.route("/evidence/upload-url", methods=["POST"])
def get_upload_url():
    data = request.json or {}
    file_name = data.get("fileName", "evidence.pdf")
    claim_id = data.get("claimId", "general")
    mock_s3_key = f"uploads/{claim_id}/{uuid.uuid4().hex[:8]}-{file_name}"
    return jsonify({
        "uploadUrl": f"http://127.0.0.1:5000/mock-s3-upload/{mock_s3_key}",
        "s3Key": mock_s3_key,
        "bucket": "cycleproof-evidence-dev"
    })

if __name__ == "__main__":
    print(" CycleProof AWS Local Dev Server starting on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False)

