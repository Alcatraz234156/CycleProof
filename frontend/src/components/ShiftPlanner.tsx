import React, { useEffect, useState } from 'react';
import { createShiftPlan, getCoordinates, getWeather, mockShifts } from '../services';

const tone = (rest: number) => (rest >= 45 ? 'var(--heat)' : rest >= 30 ? 'var(--amber)' : 'var(--cool)');

export const ShiftPlanner: React.FC = () => {
  const [id, setId] = useState(mockShifts[1].id);
  const [plan, setPlan] = useState<{ recommendations: string[]; higher_risk_hours: string[]; moderate_risk_hours: string[]; limitations: string } | null>(null);
  const [error, setError] = useState('');
  const shift = mockShifts.find((s) => s.id === id) || mockShifts[0];

  useEffect(() => {
    getCoordinates()
      .then(({ coords }) => getWeather(coords.latitude, coords.longitude))
      .then((weather) => createShiftPlan(weather.hourly))
      .then(({ plan: generated }) => setPlan(generated))
      .catch((cause: Error) => setError(cause.message));
  }, []);

  return (
    <section className="sec">
      <div className="sec__head">
        <div>
          <div className="eyebrow">Day plan</div>
          <h2>Who's out there,<br />and when to pause.</h2>
        </div>
        <div className="seg">
          {mockShifts.map((s) => (
            <button key={s.id} aria-pressed={s.id === id} onClick={() => setId(s.id)}>
              {s.name.split(' (')[0]}
              <small className="num">{s.startTime}–{s.endTime}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="bars">
        {shift.intervals.map((iv) => (
          <div key={iv.timeLabel}>
            <div className="bar__col">
              <div className="bar__fill num" style={{ height: `${((iv.projectedTempC - 20) / 22) * 100}%`, background: tone(iv.requiredRestMinutes) }}>
                {iv.projectedTempC}°
              </div>
            </div>
            <div className="bar__meta num">
              <b>{iv.timeLabel}</b>{iv.requiredRestMinutes} min shade rest
              {iv.waterCheckScheduled && <div className="chip">water check</div>}
            </div>
          </div>
        ))}
      </div>

      <dl className="facts">
        <div><dt>Crew</dt><dd>{shift.crewSize} operators</dd></div>
        <div><dt>Zone</dt><dd>{shift.workZone}</dd></div>
        <div><dt>Peak heat</dt><dd className="num">{shift.peakHeatWindow}</dd></div>
        <div><dt>Supervisor</dt><dd>{shift.leadSupervisor}</dd></div>
      </dl>

      <div className="actions">
        <button className="btn" onClick={() => alert(`Optimized schedule generated for ${shift.name}`)}>Auto-optimize rests</button>
        <button className="link" onClick={() => alert(`Roster exported for ${shift.name}`)}>Export roster</button>
      </div>
      {plan && <div className="headsup"><b>Backend shift guidance —</b><span>{plan.recommendations[1]} {plan.higher_risk_hours.length} higher-risk hours identified.</span></div>}
      {error && <div className="headsup"><b>Using demo plan —</b><span>{error}</span></div>}
    </section>
  );
};
