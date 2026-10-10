import React, { useEffect, useState } from 'react';
import { getCoordinates, getWeather, WeatherResponse, mockTelemetry as fallbackTelemetry, getHeatRiskLevel, getWorkRestRecommendation, activeThermalAlerts } from '../services';
import type { HeatRiskLevel } from '../types';

const MIN = 24, MAX = 36;

export const HeatRiskSection: React.FC = () => {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getCoordinates()
      .then(({ coords }) => getWeather(coords.latitude, coords.longitude))
      .then(setWeather)
      .catch((cause: Error) => setError(cause.message));
  }, []);

  const current = weather?.hourly[0];
  const t = current ? {
    ambientTempC: current.temperature_c,
    relativeHumidity: current.relative_humidity,
    wetBulbGlobeTempC: current.apparent_temperature_c,
    heatIndexC: current.apparent_temperature_c,
    uvIndex: 0,
    solarRadiationWm2: 0
  } : fallbackTelemetry;
  const risk: HeatRiskLevel = current
    ? ({ lower: 'LOW', moderate: 'MODERATE', high: 'HIGH', very_high: 'CRITICAL' } as Record<typeof current.risk_level, HeatRiskLevel>)[current.risk_level]
    : getHeatRiskLevel(t.wetBulbGlobeTempC);
  const p = getWorkRestRecommendation(risk);
  const alert = activeThermalAlerts[0];
  const pos = Math.min(100, Math.max(0, ((t.wetBulbGlobeTempC - MIN) / (MAX - MIN)) * 100));

  return (
    <section>
      <div className="hero">
        <div>
          <div className="eyebrow">Right now · wet-bulb globe temp</div>
          <h1>Work <mark>{p.workMinutes}</mark>, rest {p.restMinutes}.</h1>
          <p>Heat risk is {risk.toLowerCase()}. {p.ppeAdvisory}</p>
        </div>
        <div className="gauge">
          <span className="stamp">{risk}</span>
          <div className="gauge__num num">{t.wetBulbGlobeTempC}<small>°C</small></div>
          <div className="gauge__cap">WBGT · above the 31.1° safe-work line</div>
          <div className="scale"><span className="scale__pin" style={{ left: `${pos}%` }} /></div>
          <div className="scale__labels"><span>Low</span><span>Mod</span><span>High</span><span>Extreme</span><span>Critical</span></div>
        </div>
      </div>

      <div className="split" aria-label="Work and rest split per hour">
        <div className="split__work" style={{ flex: p.workMinutes }}>{p.workMinutes} min work</div>
        <div className="split__rest" style={{ flex: p.restMinutes }}>{p.restMinutes} min shade · {p.hydrationMlPerHour} mL water / hr</div>
      </div>

      <div className="vitals" style={{ marginTop: '2.5rem' }}>
        <div className="vital"><b className="num">{t.ambientTempC}°</b><span>Air temp · feels like {t.heatIndexC}°</span></div>
        <div className="vital"><b className="num">{t.relativeHumidity}%</b><span>Humidity · sweat can't evaporate</span></div>
        <div className="vital"><b className="num">{t.uvIndex}</b><span>UV index · {t.solarRadiationWm2} W/m²</span></div>
      </div>

      <div className="headsup"><b>{error ? 'Using demo data —' : 'Heads up —'}</b><span>{error || `${alert.description} ${alert.actionRequired}`}</span></div>
    </section>
  );
};
