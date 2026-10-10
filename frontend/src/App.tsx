import React, { useState } from 'react';
import { Header, Home, HeatRiskSection, ShiftPlanner, WaterMap } from './components';
import type { Tab } from './components/Header';

export const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('HOME');
  const change = (t: Tab) => { setTab(t); window.scrollTo({ top: 0 }); };

  return (
    <div className="wrap">
      <Header active={tab} onChange={change} />
      <main className="page">
        {tab === 'HOME' && <Home go={change} />}
        {tab === 'HEAT' && <HeatRiskSection />}
        {tab === 'PLAN' && <ShiftPlanner />}
        {tab === 'WATER' && <WaterMap />}
      </main>
      <footer className="foot"><span><b>shift cool</b> · heat safety &amp; drinking water</span></footer>
    </div>
  );
};

export default App;
