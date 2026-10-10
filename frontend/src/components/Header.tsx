import React from 'react';

// ── Tab types ──────────────────────────────────────────────────────────────
export type Tab =
  | 'OVERVIEW'
  | 'CLAIMS'
  | 'EVIDENCE'
  | 'DISCREPANCIES'
  | 'ORGS'
  | 'ANALYTICS'
  | 'REVIEW'
  | 'SETTINGS';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'OVERVIEW',      label: 'Overview'       },
  { id: 'CLAIMS',        label: 'Claims'         },
  { id: 'EVIDENCE',      label: 'Evidence'       },
  { id: 'DISCREPANCIES', label: 'Discrepancies'  },
  { id: 'ORGS',          label: 'Organizations'  },
  { id: 'ANALYTICS',     label: 'Analytics'      },
  { id: 'REVIEW',        label: 'Review'         },
  { id: 'SETTINGS',      label: 'Settings'       },
];

// ── Props ──────────────────────────────────────────────────────────────────
interface HeaderProps {
  active: Tab;
  onChange: (t: Tab) => void;
  unreadCount: number;
  onBellClick: () => void;
}

// ── Bell icon SVG ──────────────────────────────────────────────────────────
const BellIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────
export const Header: React.FC<HeaderProps> = ({
  active,
  onChange,
  unreadCount,
  onBellClick,
}) => (
  <header className="top">
    {/* Logo */}
    <button
      className="logo"
      onClick={() => onChange('OVERVIEW')}
      aria-label="CycleProof, go to overview"
    >
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="15" fill="var(--sun)" />
        <path
          d="M8 16a8 8 0 0 1 13.5-5.7l2-2V16h-7.7l2.5-2.5A4.5 4.5 0 1 0 20.5 19l3.3 1.8A8 8 0 0 1 8 16z"
          fill="var(--ink)"
        />
      </svg>
      <span>
        CycleProof<span className="cp-logo-period">.</span>
      </span>
    </button>

    {/* Scrollable tab strip */}
    <nav
      className="tabs-wide"
      role="tablist"
      aria-label="Application sections"
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={active === t.id ? 'is-active' : ''}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>

    {/* Right side: live pill + notification bell */}
    <div className="live" style={{ gap: '1rem' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <span className="dot" />
        Demo data
      </span>

      <button
        className="cp-bell"
        onClick={onBellClick}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : 'Notifications'
        }
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="cp-bell-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  </header>
);

export default Header;
