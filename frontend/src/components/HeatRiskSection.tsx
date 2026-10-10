import React from 'react';
import type { CSSProperties } from 'react';
import { mockTelemetry as t, getHeatRiskLevel, getWorkRestRecommendation, activeThermalAlerts, RISK_COLOR, RISK_LABEL } from '../services';
import type { HeatRiskLevel } from '../types';
import { useCountUp } from '../lib/useCountUp';

const Count: React.FC<{ to: number; dec?: number; suffix?: string }> = ({ to, dec = 0, suffix = '' }) => (
  <>{useCountUp(to, 1300, 0, 500).toFixed(dec)}{suffix}</>
);

const MIN = 24, MAX = 36, CX = 170, CY = 170, R = 140;
const BANDS: { to: number; level: HeatRiskLevel }[] = [
  { to: 26.7, level: 'LOW' }, { to: 29.4, level: 'MODERATE' }, { to: 31.1, level: 'HIGH' },
  { to: 32.2, level: 'EXTREME' }, { to: MAX, level: 'CRITICAL' }
];
const frac = (v: number) => Math.min(1, Math.max(0, (v - MIN) / (MAX - MIN)));
const pt = (f: number) => { const a = Math.PI * (1 + f); return `${(CX + R * Math.cos(a)).toFixed(2)} ${(CY + R * Math.sin(a)).toFixed(2)}`; };

const Dial: React.FC<{ value: number; level: HeatRiskLevel }> = ({ value, level }) => {
  let from = 0;
  const shown = useCountUp(value, 1500, MIN, 350);
  return (
    <svg className="dial" viewBox="0 0 340 215" role="img" aria-label={`Wet-bulb globe temperature ${value} degrees, ${RISK_LABEL[level]} risk`}>
      {BANDS.map((b, i) => {
        const f0 = from, f1 = frac(b.to); from = f1;
        return <path key={b.level} className="dial__arc" pathLength={1} style={{ animationDelay: `${i * 0.11}s` }}
          d={`M ${pt(f0 + 0.004)} A ${R} ${R} 0 0 1 ${pt(f1 - 0.004)}`} stroke={RISK_COLOR[b.level]} />;
      })}
      <g className="dial__pin" style={{ '--r': `${frac(value) * 180}deg` } as CSSProperties}>
        <circle className="dial__halo" cx={CX - R} cy={CY} r="16" fill="var(--risk)" />
        <circle cx={CX - R} cy={CY} r="13" fill="var(--ink)" stroke="#fff" strokeWidth="5" />
      </g>
      <text x={CX} y={CY - 8} textAnchor="middle" className="dial__n">{shown.toFixed(1)}</text>
      <text x={CX} y={CY + 26} textAnchor="middle" className="dial__u">°C wet-bulb globe</text>
      <text x={CX - R} y={CY + 46} textAnchor="middle" className="dial__t">{MIN}°</text>
      <text x={CX + R} y={CY + 46} textAnchor="middle" className="dial__t">{MAX}°</text>
    </svg>
  );
};

export const HeatRiskSection: React.FC = () => {
  const level = getHeatRiskLevel(t.wetBulbGlobeTempC);
  const p = getWorkRestRecommendation(level);

  return (
    <section style={{ '--risk': RISK_COLOR[level] } as CSSProperties}>
      <div className="hero">
        <div>
          <p className="badge"><i />{RISK_LABEL[level]} heat risk</p>
          <h1>Work {p.workMinutes} minutes.<br />Rest {p.restMinutes}.</h1>
          <p className="lead">{p.ppeAdvisory}</p>
        </div>
        <div className="dialwrap glass"><Dial value={t.wetBulbGlobeTempC} level={level} /></div>
      </div>

      <div className="split" role="img" aria-label={`Each hour: ${p.workMinutes} minutes work, ${p.restMinutes} minutes rest`}>
        <div className="split__work" style={{ flex: p.workMinutes }}>Work {p.workMinutes}</div>
        <div className="split__rest" style={{ flex: p.restMinutes }}>{p.mandatoryShade ? 'Rest in shade' : 'Rest'} {p.restMinutes}</div>
      </div>
      <p className="note">Every hour. Drink about {p.hydrationMlPerHour} mL of water.</p>

      <dl className="readings">
        <div><dd className="num"><Count to={t.ambientTempC} dec={1} suffix="°" /></dd><dt>Air temperature, feels like {t.heatIndexC}°</dt></div>
        <div><dd className="num"><Count to={t.relativeHumidity} suffix="%" /></dd><dt>Humidity, so sweat evaporates slowly</dt></div>
        <div><dd className="num"><Count to={t.uvIndex} dec={1} /></dd><dt>UV index, {t.solarRadiationWm2} W/m² of sun</dt></div>
      </dl>

      <ul className="alerts" aria-label="Active alerts">
        {activeThermalAlerts.map((a) => (
          <li key={a.id} style={{ '--c': RISK_COLOR[a.level] } as CSSProperties}>
            <b>{a.title}</b>
            <span>{a.description}</span>
            <span className="alerts__do">{a.actionRequired}</span>
            <small>{a.timestamp}</small>
          </li>
        ))}
      </ul>
    </section>
  );
};
