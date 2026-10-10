from src.heat_risk import apparent_temperature_celsius, risk_level, shift_plan


def test_apparent_temperature_increases_with_humidity():
    assert apparent_temperature_celsius(35, 80) > apparent_temperature_celsius(35, 20)


def test_risk_bands_are_deterministic():
    assert risk_level(20) == "lower"
    assert risk_level(28) == "moderate"
    assert risk_level(35) == "high"
    assert risk_level(42) == "very_high"


def test_shift_plan_identifies_higher_risk_hours():
    plan = shift_plan([
        {"time": "2026-01-01T10:00", "risk_level": "high"},
        {"time": "2026-01-01T11:00", "risk_level": "lower"},
    ])
    assert plan["higher_risk_hours"] == ["2026-01-01T10:00"]
    assert "not WBGT" in plan["limitations"]
