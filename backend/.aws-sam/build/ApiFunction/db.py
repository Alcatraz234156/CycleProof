"""DynamoDB access helpers for the CycleProof single-table design.

Keys
----
PK  = "<KIND>#<id>"            SK = "META"
GSI1 (list by entity type)     GSI1PK = "<KIND>"        GSI1SK = "<timestamp>#<id>"
GSI2 (children of a claim)     GSI2PK = "CLAIM#<claimId>"  GSI2SK = "<KIND>#<timestamp>#<id>"

Python floats are converted to Decimal on write (boto3 rejects floats) and
Decimals are converted back to int/float on read.
"""
from __future__ import annotations

import base64
import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

KEY_ATTRS = ("PK", "SK", "GSI1PK", "GSI1SK", "GSI2PK", "GSI2SK")
MAX_PAGE = 1000


class NotFound(Exception):
    """The requested record does not exist."""


class AlreadyExists(Exception):
    """A record with this key already exists."""


# --------------------------------------------------------------------------
# Clients (created lazily so tests can set env vars / start mocks first)
# --------------------------------------------------------------------------
_cache: dict[str, Any] = {}


def region() -> str:
    return os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "ap-south-1"


def reset_clients() -> None:
    _cache.clear()


def table():
    name = os.environ.get("TABLE_NAME", "")
    if not name:
        raise RuntimeError("TABLE_NAME is not configured")
    key = f"table:{name}"
    if key not in _cache:
        _cache[key] = boto3.resource("dynamodb", region_name=region()).Table(name)
    return _cache[key]


def s3_client():
    if "s3" not in _cache:
        _cache["s3"] = boto3.client("s3", region_name=region())
    return _cache["s3"]


def sns_client():
    if "sns" not in _cache:
        _cache["sns"] = boto3.client("sns", region_name=region())
    return _cache["sns"]


# --------------------------------------------------------------------------
# Type conversion
# --------------------------------------------------------------------------
def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def to_dynamo(value: Any) -> Any:
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return {k: to_dynamo(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [to_dynamo(v) for v in value]
    return value


def from_dynamo(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value % 1 == 0 else float(value)
    if isinstance(value, dict):
        return {k: from_dynamo(v) for k, v in value.items()}
    if isinstance(value, list):
        return [from_dynamo(v) for v in value]
    return value


def clean(item: dict) -> dict:
    return from_dynamo({k: v for k, v in item.items() if k not in KEY_ATTRS})


def pk(kind: str, entity_id: str) -> str:
    return f"{kind.upper()}#{entity_id}"


# --------------------------------------------------------------------------
# Writes
# --------------------------------------------------------------------------
def _build(kind: str, item: dict, entity_id: str | None, sort_ts: str | None) -> dict:
    entity_id = str(entity_id or item.get("id") or uuid.uuid4())
    record = {k: v for k, v in item.items() if k not in KEY_ATTRS}
    record["id"] = entity_id
    record.setdefault("createdAt", now())
    record["updatedAt"] = now()
    ts = sort_ts or record["createdAt"]
    record["PK"] = pk(kind, entity_id)
    record["SK"] = "META"
    record["GSI1PK"] = kind.upper()
    record["GSI1SK"] = f"{ts}#{entity_id}"
    claim_id = record.get("claimId")
    if claim_id and kind != "claim":
        record["GSI2PK"] = f"CLAIM#{claim_id}"
        record["GSI2SK"] = f"{kind.upper()}#{ts}#{entity_id}"
    return to_dynamo(record)


def put(kind: str, item: dict, entity_id: str | None = None, *,
        only_if_new: bool = False, sort_ts: str | None = None) -> dict:
    record = _build(kind, item, entity_id, sort_ts)
    kwargs: dict[str, Any] = {"Item": record}
    if only_if_new:
        kwargs["ConditionExpression"] = "attribute_not_exists(PK)"
    try:
        table().put_item(**kwargs)
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            raise AlreadyExists(record["PK"]) from exc
        raise
    return clean(record)


def put_many(kind: str, items: list[dict], sort_ts_field: str | None = None) -> list[dict]:
    """Batch-write new records (overwrites on key collision; ids are random)."""
    out = []
    with table().batch_writer() as batch:
        for item in items:
            ts = item.get(sort_ts_field) if sort_ts_field else None
            record = _build(kind, item, item.get("id"), ts)
            batch.put_item(Item=record)
            out.append(clean(record))
    return out


def update(kind: str, entity_id: str, changes: dict | None = None, remove: tuple[str, ...] = ()) -> dict:
    """Partial update (SET/REMOVE) so concurrent writers don't clobber each other."""
    names: dict[str, str] = {"#u": "updatedAt"}
    values: dict[str, Any] = {":u": now()}
    sets = ["#u = :u"]
    for i, (attr, val) in enumerate((changes or {}).items()):
        if attr in KEY_ATTRS or attr in ("id", "createdAt"):
            raise ValueError(f"Attribute {attr} cannot be updated")
        names[f"#a{i}"] = attr
        values[f":v{i}"] = to_dynamo(val)
        sets.append(f"#a{i} = :v{i}")
    expr = "SET " + ", ".join(sets)
    removes = []
    for j, attr in enumerate(remove):
        names[f"#r{j}"] = attr
        removes.append(f"#r{j}")
    if removes:
        expr += " REMOVE " + ", ".join(removes)
    try:
        result = table().update_item(
            Key={"PK": pk(kind, entity_id), "SK": "META"},
            UpdateExpression=expr,
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ConditionExpression="attribute_exists(PK)",
            ReturnValues="ALL_NEW",
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            raise NotFound(pk(kind, entity_id)) from exc
        raise
    return clean(result["Attributes"])


# --------------------------------------------------------------------------
# Reads
# --------------------------------------------------------------------------
def get(kind: str, entity_id: str) -> dict | None:
    result = table().get_item(Key={"PK": pk(kind, entity_id), "SK": "META"}, ConsistentRead=True)
    item = result.get("Item")
    return clean(item) if item else None


def encode_cursor(key: dict | None) -> str | None:
    if not key:
        return None
    return base64.urlsafe_b64encode(json.dumps(key).encode()).decode()


def decode_cursor(cursor: str | None) -> dict | None:
    if not cursor:
        return None
    try:
        key = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        if not isinstance(key, dict) or not all(isinstance(v, str) for v in key.values()):
            raise ValueError
        return key
    except Exception as exc:  # noqa: BLE001 - any malformed cursor is a client error
        raise ValueError("Invalid cursor") from exc


def _query(index: str, pk_name: str, pk_value: str, *, sk_prefix: tuple[str, str] | None = None,
           limit: int = 200, cursor: str | None = None, newest_first: bool = True) -> tuple[list[dict], str | None]:
    limit = min(max(int(limit), 1), MAX_PAGE)
    cond = Key(pk_name).eq(pk_value)
    if sk_prefix:
        cond = cond & Key(sk_prefix[0]).begins_with(sk_prefix[1])
    start = decode_cursor(cursor)
    items: list[dict] = []
    last_key = start
    while len(items) < limit:
        kwargs: dict[str, Any] = {
            "IndexName": index,
            "KeyConditionExpression": cond,
            "Limit": limit - len(items),
            "ScanIndexForward": not newest_first,
        }
        if last_key:
            kwargs["ExclusiveStartKey"] = last_key
        page = table().query(**kwargs)
        items.extend(page.get("Items", []))
        last_key = page.get("LastEvaluatedKey")
        if not last_key:
            break
    return [clean(i) for i in items], encode_cursor(last_key)


def list_kind(kind: str, limit: int = 200, cursor: str | None = None) -> tuple[list[dict], str | None]:
    return _query("GSI1", "GSI1PK", kind.upper(), limit=limit, cursor=cursor)


def list_all(kind: str, cap: int = 5000) -> list[dict]:
    """Every record of a kind (bounded by cap)."""
    out: list[dict] = []
    cursor = None
    while len(out) < cap:
        items, cursor = list_kind(kind, limit=MAX_PAGE, cursor=cursor)
        out.extend(items)
        if not cursor:
            break
    return out


def list_for_claim(claim_id: str, kind: str | None = None, limit: int = MAX_PAGE) -> list[dict]:
    prefix = ("GSI2SK", f"{kind.upper()}#") if kind else None
    items, _ = _query("GSI2", "GSI2PK", f"CLAIM#{claim_id}", sk_prefix=prefix, limit=limit)
    return items


# --------------------------------------------------------------------------
# Counters (human-friendly sequential ids like CP-2026-014)
# --------------------------------------------------------------------------
def next_counter(name: str) -> int:
    result = table().update_item(
        Key={"PK": f"COUNTER#{name}", "SK": "META"},
        UpdateExpression="ADD #n :one",
        ExpressionAttributeNames={"#n": "n"},
        ExpressionAttributeValues={":one": 1},
        ReturnValues="UPDATED_NEW",
    )
    return int(result["Attributes"]["n"])


def raise_counter_to(name: str, value: int) -> None:
    """Make sure the counter is at least `value` (used after seeding)."""
    try:
        table().update_item(
            Key={"PK": f"COUNTER#{name}", "SK": "META"},
            UpdateExpression="SET #n = :v",
            ConditionExpression="attribute_not_exists(#n) OR #n < :v",
            ExpressionAttributeNames={"#n": "n"},
            ExpressionAttributeValues={":v": value},
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") != "ConditionalCheckFailedException":
            raise
