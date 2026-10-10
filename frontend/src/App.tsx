import React, { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Header, HeatRiskSection, ShiftPlanner, WaterMap } from './components';
import type { Tab } from './components/Header';
import { mockTelemetry, getHeatRiskLevel, RISK_COLOR } from './services';

export const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('HEAT');       // what is on screen
  const [target, setTarget] = useState<Tab>('HEAT');   // what the nav shows, updates instantly
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const change = (t: Tab) => {
    if (t === target) return;
    setTarget(t);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTab(t); return; }
    setLeaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { setTab(t); setLeaving(false); }, 240);
  };
  const risk = RISK_COLOR[getHeatRiskLevel(mockTelemetry.wetBulbGlobeTempC)];

  return (
    <div className="app" style={{ '--risk': risk } as CSSProperties}>
      <div className="ambient" aria-hidden="true"><i /><i /><i /></div>
      <div className="wrap">
        <Header active={target} onChange={change} />
        <main id="main" key={tab} className={leaving ? 'leaving' : undefined}>
          {tab === 'HEAT' && <HeatRiskSection />}
          {tab === 'PLAN' && <ShiftPlanner />}
          {tab === 'WATER' && <WaterMap />}
        </main>
        <footer className="foot">Shift Cool uses sample data. Follow your site's heat-safety procedures.</footer>
      </div>
    </div>
  );
};

export default App;
