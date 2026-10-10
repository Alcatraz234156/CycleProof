import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';

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

export const TABS: { id: Tab; label: string; shortLabel?: string }[] = [
  { id: 'OVERVIEW',      label: 'Overview'       },
  { id: 'CLAIMS',        label: 'Claims'         },
  { id: 'EVIDENCE',      label: 'Evidence'       },
  { id: 'DISCREPANCIES', label: 'Discrepancies'  },
  { id: 'ORGS',          label: 'Organizations', shortLabel: 'Orgs' },
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
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

// ── Icons ──────────────────────────────────────────────────────────────────
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

const SunIcon: React.FC = () => (
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
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon: React.FC = () => (
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
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────
export const Header: React.FC<HeaderProps> = ({
  active,
  onChange,
  unreadCount,
  onBellClick,
  theme = 'light',
  onToggleTheme,
}) => {
  const navRef = useRef<HTMLElement>(null);
  const [indicator, setIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    ready: boolean;
  }>({ left: 0, top: 0, width: 0, height: 0, ready: false });

  const isInitialMount = useRef(true);

  const updateIndicator = useCallback(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector<HTMLButtonElement>(`button[data-tab="${active}"]`);
    if (!activeBtn) return;

    setIndicator({
      left: activeBtn.offsetLeft,
      top: activeBtn.offsetTop,
      width: activeBtn.offsetWidth,
      height: activeBtn.offsetHeight,
      ready: true,
    });
  }, [active]);

  useLayoutEffect(() => {
    updateIndicator();
    if (isInitialMount.current) {
      const raf = requestAnimationFrame(() => {
        isInitialMount.current = false;
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [updateIndicator]);

  useEffect(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && navRef.current) {
      ro = new ResizeObserver(() => updateIndicator());
      ro.observe(navRef.current);
    }

    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => updateIndicator());
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [updateIndicator]);

  // Smoothly scroll active tab into view if container is horizontally scrolled
  useEffect(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector<HTMLButtonElement>(`button[data-tab="${active}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [active]);

  return (
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

      {/* Scrollable tab strip with fluid sliding indicator pill */}
      <nav
        ref={navRef}
        className="tabs-wide"
        role="tablist"
        aria-label="Application sections"
      >
        {indicator.ready && (
          <span
            className={`tabs-wide__ind ${isInitialMount.current ? 'is-instant' : ''}`}
            style={{
              transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
              width: `${indicator.width}px`,
              height: `${indicator.height}px`,
            }}
            aria-hidden="true"
          />
        )}
        {TABS.map((t) => (
          <button
            key={t.id}
            data-tab={t.id}
            role="tab"
            aria-selected={active === t.id}
            className={active === t.id ? 'is-active' : ''}
            onClick={() => onChange(t.id)}
          >
            {t.shortLabel ? (
              <>
                <span className="cp-tab-full">{t.label}</span>
                <span className="cp-tab-short">{t.shortLabel}</span>
              </>
            ) : (
              t.label
            )}
          </button>
        ))}
      </nav>

      {/* Right side: live pill + theme toggle + notification bell */}
      <div className="live">
        <span className="cp-live-pill">
          <span className="dot" />
          Demo data
        </span>

        {onToggleTheme && (
          <button
            type="button"
            className="cp-icon-btn cp-theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        )}

        <button
          type="button"
          className="cp-icon-btn cp-bell"
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
};

export default Header;
