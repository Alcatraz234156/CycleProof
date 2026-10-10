"""Deterministic heat-risk screening calculations.

This is decision support, not a full occupational heat-stress assessment.
The apparent-temperature approximation uses air temperature and relative
humidity. It does not model radiant heat, clothing, exertion, acclimatization,
shade, wind exposure, or workplace controls.
"""

from __future__ import annotations

from typing import Any


def apparent_temperature_celsius(temperature_c: float, relative_humidity: float) -> float:
    """Return a humidity-adjusted screening temperature in Celsius."""
    humidity = max(0.0, min(100.0, relative_humidity))
    return temperature_c + (humidity / 100.0) * max(0.0, temperature_c - 14.0) * 0.35


def risk_level(apparent_temperature_c: float) -> str:
    """Classify screening risk using documented conservative bands."""
    if apparent_temperature_c >= 41:
        return "very_high"
    if apparent_temperature_c >= 32:
        return "high"
    if apparent_temperature_c >= 27:
        return "moderate"
    return "lower"


def risk_record(time: str, temperature_c: float, humidity: float, wind_speed_kmh: float) -> dict[str, Any]:
    apparent = apparent_temperature_celsius(temperature_c, humidity)
    level = risk_level(apparent)
    return {
        "time": time,
        "temperature_c": round(temperature_c, 1),
        "relative_humidity": round(humidity, 1),
        "wind_speed_kmh": round(wind_speed_kmh, 1),
        "apparent_temperature_c": round(apparent, 1),
        "risk_level": level,
    }


def shift_plan(risk_records: list[dict[str, Any]]) -> dict[str, Any]:
    high_risk = [item for item in risk_records if item["risk_level"] in {"high", "very_high"}]
    moderate = [item for item in risk_records if item["risk_level"] == "moderate"]
    return {
        "recommendations": [
            "Use the employer's heat-safety procedure and supervisor guidance.",
            "Schedule regular water and shaded recovery breaks; do not wait for thirst.",
            "Use buddy checks and stop work for heat-illness symptoms or an emergency.",
        ],
        "higher_risk_hours": [item["time"] for item in high_risk],
        "moderate_risk_hours": [item["time"] for item in moderate],
        "limitations": (
            "This screening indicator is not WBGT and does not guarantee safe conditions. "
            "It omits direct solar radiation, clothing, exertion, acclimatization, shade, "
            "medical factors, and workplace controls."
        ),
    }
