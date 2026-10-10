import React from 'react';

export type Tab = 'HOME' | 'HEAT' | 'PLAN' | 'WATER';
export const TABS: { id: Tab; label: string }[] = [
  { id: 'HOME', label: 'Home' },
  { id: 'HEAT', label: 'Live Heat' },
  { id: 'PLAN', label: 'Day Plan' },
  { id: 'WATER', label: 'Water Map' }
];

interface HeaderProps { active: Tab; onChange: (t: Tab) => void; }

export const Header: React.FC<HeaderProps> = ({ active, onChange }) => (
  <header className="top">
    <button className="logo" onClick={() => onChange('HOME')} aria-label="Shift Cool home">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2c3 4.2 6 7.4 6 11a6 6 0 0 1-12 0c0-3.600 3-6.800 6-11z" />
      </svg>
      shift cool
    </button>
    <nav className="tabs" role="tablist" aria-label="Sections">
      {TABS.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
    <div className="live"><span className="dot" />Sector 4B · live</div>
  </header>
);
