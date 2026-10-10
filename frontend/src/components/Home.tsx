import React from 'react';
import { mockTelemetry as t, getHeatRiskLevel, getWorkRestRecommendation, mockStations } from '../services';
import type { Tab } from './Header';

const ROUTES: { id: Tab; n: string; title: string; text: string }[] = [
  { id: 'HEAT', n: '01', title: 'Live heat', text: 'Wet-bulb readings, risk level and the work-rest rule right now.' },
  { id: 'PLAN', n: '02', title: 'Day plan', text: 'Shift schedules with shade rests and water checks built in.' },
  { id: 'WATER', n: '03', title: 'Water map', text: 'Chilled dispensers, misting canopies and eyewash pods nearby.' }
];

export const Home: React.FC<{ go: (t: Tab) => void }> = ({ go }) => {
  const risk = getHeatRiskLevel(t.wetBulbGlobeTempC);
  const p = getWorkRestRecommendation(risk);
  const active = mockStations.filter((s) => s.status === 'ACTIVE').length;

  return (
    <section>
      <div className="home">
        <div className="eyebrow">Heat safety for outdoor crews</div>
        <h1 className="home__title">Keep crews <mark>cool.</mark><br />Keep water <em>close.</em></h1>
        <p className="home__lead">Live heat-stress readings, safe work-rest schedules and the nearest cold water, in one calm place.</p>
        <div className="actions">
          <button className="btn" onClick={() => go('HEAT')}>See live conditions</button>
          <button className="link" onClick={() => go('WATER')}>Find water →</button>
        </div>
      </div>

      <div className="snap">
        <div><span>Right now</span><b className="num">{t.wetBulbGlobeTempC}°</b><span>{risk.toLowerCase()} heat risk</span></div>
        <div><span>Each hour</span><b className="num">{p.workMinutes} / {p.restMinutes}</b><span>minutes work / shade rest</span></div>
        <div><span>Water</span><b className="num">{active} of {mockStations.length}</b><span>stations ready</span></div>
      </div>

      <ul className="routes">
        {ROUTES.map((r) => (
          <li key={r.id}>
            <button onClick={() => go(r.id)}>
              <span className="routes__n">{r.n}</span>
              <span className="routes__t">{r.title}<small>{r.text}</small></span>
              <span className="routes__a" aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
