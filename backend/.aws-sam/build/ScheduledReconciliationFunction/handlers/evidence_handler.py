"""
evidence_handler.py — AWS Lambda handler for Evidence ingestion and S3 management.
Handles:
  - POST /evidence/upload-url (generates pre-signed S3 URL for secure uploads)
  - GET /evidence (list evidence with claimId filter)
  - POST /evidence (attach evidence metadata)
  - POST /evidence/process-csv (parse CSV rows directly and update journey stages)
"""

import json
import os
import uuid
import csv
import io
import boto3
from typing import Dict, Any

EVIDENCE_TABLE = os.environ.get("EVIDENCE_TABLE", "CycleProof_Evidence")
CLAIMS_TABLE = os.environ.get("CLAIMS_TABLE", "CycleProof_Claims")
TIMELINE_TABLE = os.environ.get("TIMELINE_TABLE", "CycleProof_Timeline")
EVIDENCE_BUCKET = os.environ.get("EVIDENCE_BUCKET", "cycleproof-evidence")

dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")
evidence_tbl = dynamodb.Table(EVIDENCE_TABLE)
claims_tbl = dynamodb.Table(CLAIMS_TABLE)
timeline_tbl = dynamodb.Table(TIMELINE_TABLE)


def response(status_code: int, body: Any) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
        },
        "body": json.dumps(body, default=str)
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get("httpMethod", "GET")
    path = event.get("path", "")

    try:
        # 1. POST /evidence/upload-url: Generate Pre-Signed S3 URL
        if path == "/evidence/upload-url" and method == "POST":
            body = json.loads(event.get("body") or "{}")
            file_name = body.get("fileName", "evidence.pdf")
            claim_id = body.get("claimId", "general")
            file_key = f"uploads/{claim_id}/{uuid.uuid4().hex[:8]}-{file_name}"

            presigned_url = s3_client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": EVIDENCE_BUCKET,
                    "Key": file_key,
                    "ContentType": body.get("contentType", "application/octet-stream")
                },
                ExpiresIn=3600
            )

            return response(200, {
                "uploadUrl": presigned_url,
                "s3Key": file_key,
                "bucket": EVIDENCE_BUCKET
            })

        # 2. GET /evidence
        if path == "/evidence" and method == "GET":
            query_params = event.get("queryStringParameters") or {}
            claim_id = query_params.get("claimId")
            if claim_id:
                res = evidence_tbl.query(
                    IndexName="ClaimIndex",
                    KeyConditionExpression="claimId = :cid",
                    ExpressionAttributeValues={":cid": claim_id}
                )
            else:
                res = evidence_tbl.scan()
            return response(200, res.get("Items", []))

        # 3. POST /evidence: Attach metadata
        if path == "/evidence" and method == "POST":
            body = json.loads(event.get("body") or "{}")
            record_id = body.get("id") or f"ev-{uuid.uuid4().hex[:8]}"
            item = {
                "id": record_id,
                "claimId": body.get("claimId"),
                "type": body.get("type", "Weighbridge Ticket"),
                "reference": body.get("reference", ""),
                "stage": body.get("stage", "Collected"),
                "dateIso": body.get("dateIso"),
                "quantityTonnes": body.get("quantityTonnes"),
                "source": body.get("source", "System"),
                "missing": body.get("missing", False),
                "notes": body.get("notes", "")
            }
            evidence_tbl.put_item(Item=item)
            return response(201, item)

        # 4. POST /evidence/process-csv: Direct CSV content parsing
        if path == "/evidence/process-csv" and method == "POST":
            body = json.loads(event.get("body") or "{}")
            csv_content = body.get("csvData", "")
            claim_id = body.get("claimId")

            reader = csv.DictReader(io.StringIO(csv_content))
            created_records = []
            for row in reader:
                rec_id = f"ev-csv-{uuid.uuid4().hex[:6]}"
                qty = float(row.get("quantity", 0)) if row.get("quantity") else None
                ev_item = {
                    "id": rec_id,
                    "claimId": claim_id or row.get("claimId", "unassigned"),
                    "type": "CSV Import",
                    "reference": row.get("reference", f"REF-{rec_id}"),
                    "stage": row.get("stage", "Collected"),
                    "dateIso": row.get("date", boto3.compat.time.strftime('%Y-%m-%d')),
                    "quantityTonnes": qty,
                    "source": row.get("source", "CSV Importer"),
                    "missing": False,
                    "notes": f"Batch imported from operational log"
                }
                evidence_tbl.put_item(Item=ev_item)
                created_records.append(ev_item)

            return response(200, {
                "message": f"Processed {len(created_records)} records successfully",
                "records": created_records
            })

        return response(404, {"error": f"Route not found: {method} {path}"})

    except Exception as e:
        return response(500, {"error": str(e)})

