import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { mockShifts, RISK_COLOR, RISK_LABEL } from '../services';

const LO = 20, HI = 42;

export const ShiftPlanner: React.FC = () => {
  const [id, setId] = useState(mockShifts[1].id);
  const [copied, setCopied] = useState(false);
  const shift = mockShifts.find((s) => s.id === id) || mockShifts[0];
  const peak = Math.max(...shift.intervals.map((i) => i.projectedTempC));

  const copy = async () => {
    const text = [`${shift.name}, ${shift.startTime}-${shift.endTime}`, `Zone: ${shift.workZone}`, `Supervisor: ${shift.leadSupervisor}`,
      ...shift.intervals.map((i) => `${i.timeLabel}: ${i.projectedTempC}°C, ${i.requiredRestMinutes} min rest${i.waterCheckScheduled ? ', water check' : ''}`)].join('\n');
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch { setCopied(false); }
  };

  return (
    <section>
      <div className="head">
        <h2>Today's shifts</h2>
        <div className="seg" role="group" aria-label="Choose a shift" style={{ '--i': mockShifts.findIndex((m) => m.id === id) } as CSSProperties}>
          <span className="seg__ind" aria-hidden="true" />
          {mockShifts.map((s) => (
            <button key={s.id} aria-pressed={s.id === id} onClick={() => setId(s.id)}>
              {s.name.split(' (')[0].replace('Shift ', '')}<small className="num">{s.startTime}–{s.endTime}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="cols" key={shift.id}>
        {shift.intervals.map((iv, k) => {
          const c = RISK_COLOR[iv.riskLevel];
          return (
            <div className="col" key={iv.timeLabel} style={{ '--c': c, '--k': k } as CSSProperties}>
              <div className="col__well">
                <div className="col__bar" style={{ height: `${Math.max(12, ((iv.projectedTempC - LO) / (HI - LO)) * 100)}%` }}>
                  <span className="num">{iv.projectedTempC}°</span>
                </div>
              </div>
              <b className="num">{iv.timeLabel}</b>
              <span>{RISK_LABEL[iv.riskLevel]}, rest {iv.requiredRestMinutes} min</span>
              <span className="col__tags">
                {iv.projectedTempC === peak && <em>Hottest</em>}
                {iv.waterCheckScheduled && <em className="w">Water check</em>}
              </span>
            </div>
          );
        })}
      </div>

      <dl className="facts">
        <div><dt>Crew</dt><dd>{shift.crewSize} people</dd></div>
        <div><dt>Zone</dt><dd>{shift.workZone}</dd></div>
        <div><dt>Peak heat</dt><dd className="num">{shift.peakHeatWindow}</dd></div>
        <div><dt>Supervisor</dt><dd>{shift.leadSupervisor}</dd></div>
      </dl>

      <div className="actions">
        <button className="btn" onClick={copy}>Copy roster</button>
        <span className="note" role="status">{copied ? 'Roster copied' : ''}</span>
      </div>
    </section>
  );
};
