from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import boto3
from ai_explanation import explain_shift_plan
from heat_risk import risk_record, shift_plan

REPORTS_TABLE_NAME = os.environ.get("REPORTS_TABLE_NAME", "coolshift-local-reports")
reports_table = boto3.resource("dynamodb").Table(REPORTS_TABLE_NAME)


def response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body),
    }


def request_json(event: dict[str, Any]) -> dict[str, Any]:
    raw_body = event.get("body") or "{}"
    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise ValueError("Request body must be valid JSON") from exc
    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object")
    return body


def external_json(url: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(url, data=data, headers={"Accept": "application/json", "User-Agent": "CoolShift/1.0"})
    if payload is not None:
        request.add_header("Content-Type", "application/json")
    try:
        with urlopen(request, timeout=15) as result:
            decoded = json.loads(result.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError("External data provider request failed") from exc
    if not isinstance(decoded, dict):
        raise RuntimeError("External data provider returned an invalid response")
    return decoded


def weather(event: dict[str, Any]) -> dict[str, Any]:
    query = event.get("queryStringParameters") or {}
    try:
        latitude = float(query["latitude"])
        longitude = float(query["longitude"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("latitude and longitude query parameters are required") from exc
    params = urlencode({
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m",
        "forecast_days": 2,
        "timezone": "UTC",
    })
    data = external_json(f"https://api.open-meteo.com/v1/forecast?{params}")
    hourly = data.get("hourly")
    if not isinstance(hourly, dict):
        raise RuntimeError("Weather provider returned no hourly forecast")
    records = [
        risk_record(time, temperature, humidity, wind)
        for time, temperature, humidity, wind in zip(
            hourly.get("time", []),
            hourly.get("temperature_2m", []),
            hourly.get("relative_humidity_2m", []),
            hourly.get("wind_speed_10m", []),
        )
    ]
    return {"latitude": latitude, "longitude": longitude, "hourly": records, "source": "Open-Meteo"}


def water_points(event: dict[str, Any]) -> dict[str, Any]:
    query = event.get("queryStringParameters") or {}
    try:
        latitude = float(query["latitude"])
        longitude = float(query["longitude"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("latitude and longitude query parameters are required") from exc
    radius = min(max(int(query.get("radius_m", "3000")), 100), 10000)
    overpass_query = (
        f'[out:json];nwr(around:{radius},{latitude},{longitude})'
        '["amenity"="drinking_water"];out center tags;'
    )
    result = external_json("https://overpass-api.de/api/interpreter", {"data": overpass_query})
    points = []
    for element in result.get("elements", []):
        tags = element.get("tags", {})
        point_lat = element.get("lat", element.get("center", {}).get("lat"))
        point_lon = element.get("lon", element.get("center", {}).get("lon"))
        if point_lat is None or point_lon is None:
            continue
        point_id = f"osm:{element.get('type')}:{element.get('id')}"
        summary = latest_report(point_id)
        points.append({
            "point_id": point_id,
            "name": tags.get("name") or tags.get("description") or "Mapped drinking-water point",
            "latitude": point_lat,
            "longitude": point_lon,
            **summary,
            "mapped_source": "OpenStreetMap/Overpass",
        })
    return {"points": points, "radius_m": radius}


def latest_report(point_id: str) -> dict[str, Any]:
    result = reports_table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("point_id").eq(point_id),
        ScanIndexForward=False,
        Limit=20,
    )
    reports = result.get("Items", [])
    if not reports:
        return {"status": "Unable to verify", "last_reported_at": None, "report_count": 0, "confidence": "unknown"}
    counts: dict[str, int] = {}
    for item in reports:
        status = item.get("status", "Unable to verify")
        counts[status] = counts.get(status, 0) + 1
    status = max(counts, key=counts.get)
    total = sum(counts.values())
    confidence = "high" if total >= 3 and counts[status] / total >= 0.67 else "medium"
    return {
        "status": status,
        "last_reported_at": reports[0].get("reported_at"),
        "report_count": total,
        "confidence": confidence,
    }


def report_water_point(event: dict[str, Any]) -> dict[str, Any]:
    point_id = (event.get("pathParameters") or {}).get("point_id")
    if not point_id:
        raise ValueError("point_id is required")
    body = request_json(event)
    status = body.get("status")
    allowed = {"Working", "Dry / not working", "Unable to verify"}
    if status not in allowed:
        raise ValueError("status must be Working, Dry / not working, or Unable to verify")
    reported_at = datetime.now(timezone.utc).isoformat()
    reports_table.put_item(Item={
        "point_id": point_id,
        "report_id": f"{reported_at}#{uuid.uuid4()}",
        "status": status,
        "reported_at": reported_at,
    })
    return {"point_id": point_id, **latest_report(point_id)}


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    method = event.get("httpMethod")
    path = event.get("resource") or event.get("path", "")
    try:
        if method == "GET" and path.endswith("/health"):
            return response(200, {"status": "ok", "service": "coolshift-backend"})
        if method == "GET" and path.endswith("/weather"):
            return response(200, weather(event))
        if method == "GET" and path.endswith("/water-points"):
            return response(200, water_points(event))
        if method == "POST" and path.endswith("/shift-plan"):
            body = request_json(event)
            records = body.get("hourly_risk")
            if not isinstance(records, list):
                raise ValueError("hourly_risk must be an array")
            return response(200, {"plan": shift_plan(records)})
        if method == "POST" and path.endswith("/explain"):
            body = request_json(event)
            plan = body.get("plan")
            if not isinstance(plan, dict):
                raise ValueError("plan must be a JSON object")
            return response(200, {"explanation": explain_shift_plan(plan)})
        if method == "POST" and "/water-points/" in path and path.endswith("/reports"):
            return response(201, report_water_point(event))
        return response(404, {"error": "Route not found"})
    except ValueError as exc:
        return response(400, {"error": str(exc)})
    except RuntimeError as exc:
        return response(502, {"error": str(exc)})
