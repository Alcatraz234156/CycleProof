"""
claims_handler.py — AWS Lambda handler for Claim and Organization management.
Handles:
  - GET /claims
  - GET /claims/{id}
  - PATCH /claims/{id} (status & reviewer notes updates)
  - GET /organizations
"""

import json
import os
import boto3
from typing import Dict, Any

# Environment & DynamoDB tables
CLAIMS_TABLE = os.environ.get("CLAIMS_TABLE", "CycleProof_Claims")
ORGS_TABLE = os.environ.get("ORGANIZATIONS_TABLE", "CycleProof_Organizations")
TIMELINE_TABLE = os.environ.get("TIMELINE_TABLE", "CycleProof_Timeline")

dynamodb = boto3.resource("dynamodb")
claims_tbl = dynamodb.Table(CLAIMS_TABLE)
orgs_tbl = dynamodb.Table(ORGS_TABLE)
timeline_tbl = dynamodb.Table(TIMELINE_TABLE)


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


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get("httpMethod", "GET")
    path = event.get("path", "")
    path_params = event.get("pathParameters") or {}

    try:
        # 1. GET /organizations
        if path == "/organizations" and method == "GET":
            res = orgs_tbl.scan()
            return response(200, res.get("Items", []))

        # 2. GET /claims
        if path == "/claims" and method == "GET":
            query_params = event.get("queryStringParameters") or {}
            org_id = query_params.get("orgId")
            status = query_params.get("status")

            if org_id:
                res = claims_tbl.query(
                    IndexName="OrgIndex",
                    KeyConditionExpression="orgId = :oid",
                    ExpressionAttributeValues={":oid": org_id}
                )
            elif status:
                res = claims_tbl.query(
                    IndexName="StatusIndex",
                    KeyConditionExpression="#st = :st",
                    ExpressionAttributeNames={"#st": "status"},
                    ExpressionAttributeValues={":st": status}
                )
            else:
                res = claims_tbl.scan()
            return response(200, res.get("Items", []))

        # 3. GET /claims/{id}
        claim_id = path_params.get("id")
        if claim_id and method == "GET":
            res = claims_tbl.get_item(Key={"id": claim_id})
            item = res.get("Item")
            if not item:
                return response(404, {"error": f"Claim {claim_id} not found"})
            return response(200, item)

        # 4. PATCH /claims/{id}
        if claim_id and method == "PATCH":
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
                return response(400, {"error": "No valid fields provided for update"})

            claims_tbl.update_item(
                Key={"id": claim_id},
                UpdateExpression="SET " + ", ".join(update_expr),
                ExpressionAttributeNames=expr_names if expr_names else None,
                ExpressionAttributeValues=expr_vals
            )

            # Optional: record timeline event
            if "status" in body:
                actor = body.get("actorRole", "Reviewer")
                timeline_tbl.put_item(
                    Item={
                        "id": f"tl-{claim_id}-{int(boto3.compat.time.time())}",
                        "claimId": claim_id,
                        "type": "status_changed",
                        "title": f"Status changed to: {body['status']}",
                        "description": f"Claim updated by {actor}.",
                        "actorRole": actor,
                        "timestamp": boto3.compat.time.strftime('%Y-%m-%dT%H:%M:%SZ')
                    }
                )

            return response(200, {"message": f"Claim {claim_id} updated successfully"})

        return response(404, {"error": f"Route not found: {method} {path}"})

    except Exception as e:
        return response(500, {"error": str(e)})

