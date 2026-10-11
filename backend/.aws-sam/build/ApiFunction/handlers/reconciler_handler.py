"""
reconciler_handler.py — AWS Lambda handler for running reconciliation & discrepancies.
Handles:
  - POST /claims/{id}/reconcile
  - GET /discrepancies
  - PATCH /discrepancies/{id}
  - EventBridge scheduled invocation for automated daily audits
  - SNS notifications for high-variance discrepancies
"""

import json
import os
import boto3
from typing import Dict, Any

from reconciler import run_claim_reconciliation

CLAIMS_TABLE = os.environ.get("CLAIMS_TABLE", "CycleProof_Claims")
DISCREPANCIES_TABLE = os.environ.get("DISCREPANCIES_TABLE", "CycleProof_Discrepancies")
EVIDENCE_TABLE = os.environ.get("EVIDENCE_TABLE", "CycleProof_Evidence")
ALERTS_TOPIC_ARN = os.environ.get("ALERTS_TOPIC_ARN", "")
TOLERANCE_PCT = float(os.environ.get("TOLERANCE_PCT", "5.0"))

dynamodb = boto3.resource("dynamodb")
claims_tbl = dynamodb.Table(CLAIMS_TABLE)
disc_tbl = dynamodb.Table(DISCREPANCIES_TABLE)
evidence_tbl = dynamodb.Table(EVIDENCE_TABLE)
sns = boto3.client("sns")


def response(status_code: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key",
            "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS"
        },
        "body": json.dumps(body, default=str)
    }


def publish_alert_if_needed(claim_id: str, discrepancies: list):
    """Sends notification to SNS topic if critical discrepancies are flagged."""
    if not ALERTS_TOPIC_ARN or not discrepancies:
        return
    high_priority = [d for d in discrepancies if (d.get("pctDiff") and abs(d["pctDiff"]) > 10.0) or d.get("type") == "Quantity Mismatch"]
    if high_priority:
        message = (
            f"CycleProof Alert: Claim {claim_id} triggered {len(high_priority)} high-priority discrepancy findings.\n"
            f"Details: {high_priority[0].get('description')}"
        )
        try:
            sns.publish(
                TopicArn=ALERTS_TOPIC_ARN,
                Subject=f"CycleProof Discrepancy Alert: Claim {claim_id}",
                Message=message
            )
        except Exception as err:
            print(f"Warning: SNS publish failed: {err}")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    # 1. EventBridge scheduled cron trigger
    if event.get("source") == "aws.events":
        print("EventBridge cron triggered: Running periodic audit reconciliation...")
        claims = claims_tbl.scan().get("Items", [])
        reconciled_count = 0
        for c in claims:
            cid = c.get("id")
            ev_res = evidence_tbl.query(
                IndexName="ClaimIndex",
                KeyConditionExpression="claimId = :cid",
                ExpressionAttributeValues={":cid": cid}
            )
            evidence_items = ev_res.get("Items", [])
            recon_res = run_claim_reconciliation(c, evidence_items, tolerance_pct=TOLERANCE_PCT)
            for d in recon_res.get("discrepancies", []):
                disc_tbl.put_item(Item=d)
            publish_alert_if_needed(cid, recon_res.get("discrepancies", []))
            reconciled_count += 1
        return {"status": "success", "auditedClaims": reconciled_count}

    # 2. API Gateway requests
    method = event.get("httpMethod", "GET")
    path = event.get("path", "")
    path_params = event.get("pathParameters") or {}

    try:
        # GET /discrepancies
        if path == "/discrepancies" and method == "GET":
            query_params = event.get("queryStringParameters") or {}
            claim_id = query_params.get("claimId")
            status = query_params.get("status")

            if claim_id:
                res = disc_tbl.query(
                    IndexName="ClaimIndex",
                    KeyConditionExpression="claimId = :cid",
                    ExpressionAttributeValues={":cid": claim_id}
                )
            elif status:
                res = disc_tbl.query(
                    IndexName="StatusIndex",
                    KeyConditionExpression="#st = :st",
                    ExpressionAttributeNames={"#st": "status"},
                    ExpressionAttributeValues={":st": status}
                )
            else:
                res = disc_tbl.scan()
            return response(200, res.get("Items", []))

        # PATCH /discrepancies/{id}
        disc_id = path_params.get("id")
        if disc_id and method == "PATCH":
            body = json.loads(event.get("body") or "{}")
            update_expr = []
            expr_names = {}
            expr_vals = {}

            if "status" in body:
                update_expr.append("#st = :st")
                expr_names["#st"] = "status"
                expr_vals[":st"] = body["status"]

            if "reviewerNotes" in body:
                update_expr.append("reviewerNotes = :rn")
                expr_vals[":rn"] = body["reviewerNotes"]

            if not update_expr:
                return response(400, {"error": "No update fields provided"})

            disc_tbl.update_item(
                Key={"id": disc_id},
                UpdateExpression="SET " + ", ".join(update_expr),
                ExpressionAttributeNames=expr_names if expr_names else None,
                ExpressionAttributeValues=expr_vals
            )
            return response(200, {"message": f"Discrepancy {disc_id} updated successfully"})

        # POST /claims/{id}/reconcile
        claim_id = path_params.get("id")
        if claim_id and method == "POST":
            # Fetch claim
            c_res = claims_tbl.get_item(Key={"id": claim_id})
            claim_item = c_res.get("Item")
            if not claim_item:
                return response(404, {"error": f"Claim {claim_id} not found"})

            # Fetch evidence for this claim
            ev_res = evidence_tbl.query(
                IndexName="ClaimIndex",
                KeyConditionExpression="claimId = :cid",
                ExpressionAttributeValues={":cid": claim_id}
            )
            evidence_items = ev_res.get("Items", [])

            # Run reconciliation logic
            recon_res = run_claim_reconciliation(claim_item, evidence_items, tolerance_pct=TOLERANCE_PCT)

            # Persist detected discrepancies
            for d in recon_res.get("discrepancies", []):
                disc_tbl.put_item(Item=d)

            # Send SNS Alert if variance is above threshold
            publish_alert_if_needed(claim_id, recon_res.get("discrepancies", []))

            # Update claim's status with recommendation
            claims_tbl.update_item(
                Key={"id": claim_id},
                UpdateExpression="SET #st = :st",
                ExpressionAttributeNames={"#st": "status"},
                ExpressionAttributeValues={":st": recon_res["recommendedStatus"]}
            )

            return response(200, recon_res)

        return response(404, {"error": f"Route not found: {method} {path}"})

    except Exception as e:
        return response(500, {"error": str(e)})

