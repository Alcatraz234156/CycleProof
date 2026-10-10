import React from 'react';
import type { CSSProperties } from 'react';

export type Tab = 'HEAT' | 'PLAN' | 'WATER';
export const TABS: { id: Tab; label: string }[] = [
  { id: 'HEAT', label: 'Heat' },
  { id: 'PLAN', label: 'Shifts' },
  { id: 'WATER', label: 'Water' }
];

interface HeaderProps { active: Tab; onChange: (t: Tab) => void; }

export const Header: React.FC<HeaderProps> = ({ active, onChange }) => (
  <header className="top">
    <button className="logo" onClick={() => onChange('HEAT')} aria-label="Shift Cool, go to heat">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="var(--sun)" />
        <path d="M16 6c3.2 4.4 6.4 7.6 6.4 11.4a6.4 6.4 0 0 1-12.800 0C9.600 13.600 12.800 10.400 16 6z" fill="var(--ink)" />
      </svg>
      Shift Cool
    </button>
    <nav className="tabs" role="tablist" aria-label="Sections" style={{ '--i': TABS.findIndex((t) => t.id === active) } as CSSProperties}>
      <span className="tabs__ind" aria-hidden="true" />
      {TABS.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} onClick={() => onChange(t.id)}>{t.label}</button>
      ))}
    </nav>
    <div className="live"><span className="dot" />Sector 4B</div>
  </header>
);
