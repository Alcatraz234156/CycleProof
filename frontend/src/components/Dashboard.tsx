// CycleProof — Dashboard.tsx
// Overview tab: hero, metrics, material journey widget, review queue, recent activity.

import React, { useMemo } from 'react';
import type { AppStateReturn } from '../store/useAppState';
import type { EventType, Claim, TimelineEvent } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

type DashboardProps = {
  state: AppStateReturn['state'];
  onNavigate: (tab: string) => void;
  onClaimSelect: (claimId: string) => void;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

const EVENT_ICONS: Record<EventType, string> = {
  claim_created: '📋',
  evidence_added: '📎',
  evidence_removed: '🗑',
  quantity_updated: '⚖',
  discrepancy_detected: '⚠',
  comment_added: '💬',
  status_changed: '🔄',
  evidence_resolved: '✓',
  review_completed: '✅',
};

type StageKey = 'collected' | 'claimed' | 'received' | 'processed' | 'recovered' | 'dispatched';

interface JourneyStage {
  label: string;
  key: StageKey;
  color: string;
  total: number | null;
  nullCount: number;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'Needs review' ? 'needs-review'
    : status === 'In review' ? 'in-review'
    : status === 'Reconciled' ? 'reconciled'
    : status === 'Open' ? 'open'
    : 'resolved';
  return <span className={`cp-status ${cls}`}>{status}</span>;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: string;
}

function MetricCard({ label, value, sub, icon }: MetricCardProps) {
  return (
    <div className="cp-metric">
      <div className="cp-metric-label">
        <span className="cp-eyebrow">{label}</span>
        <span>{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

interface JourneyStageBlockProps {
  stage: JourneyStage;
  maxVal: number;
  onClick: () => void;
}

function JourneyStageBlock({ stage, maxVal, onClick }: JourneyStageBlockProps) {
  const qty = stage.total !== null ? `${stage.total}t` : '—';
  const sub = stage.nullCount > 0 ? `N/A for ${stage.nullCount} claim${stage.nullCount !== 1 ? 's' : ''}` : `${maxVal > 0 ? Math.round((stage.total ?? 0) / maxVal * 100) : 0}% of max`;
  return (
    <div
      className="cp-journey-stage"
      style={{ '--stage-color': stage.color } as React.CSSProperties}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${stage.label}: ${qty}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <span className="cp-journey-stage-label">{stage.label}</span>
      <span className="cp-journey-stage-qty">{qty}</span>
      <span className="cp-journey-stage-sub">{sub}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const Dashboard: React.FC<DashboardProps> = ({ state, onNavigate, onClaimSelect }) => {
  const { claims, timeline, discrepancies } = state;

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const totalClaims = claims.length;

  const totalClaimed = useMemo(() =>
    claims.reduce((sum, c) => sum + c.claimed, 0),
    [claims]
  );

  const needsReviewCount = useMemo(() =>
    claims.filter(c => c.status === 'Needs review').length,
    [claims]
  );

  const openDiscrepancies = useMemo(() =>
    discrepancies.filter(d => d.status === 'Open').length,
    [discrepancies]
  );

  // ── Journey aggregates ───────────────────────────────────────────────────────

  const journeyStages = useMemo((): JourneyStage[] => {
    const agg = (key: StageKey) => {
      let total = 0;
      let nullCount = 0;
      for (const c of claims) {
        const val = c[key];
        if (val === null || val === undefined) {
          nullCount++;
        } else {
          total += val;
        }
      }
      return { total: nullCount === claims.length ? null : total, nullCount };
    };

    return [
      { label: 'Collected', key: 'collected', color: '#ffb627', ...agg('collected') },
      { label: 'Received', key: 'received', color: '#2a6fdb', ...agg('received') },
      { label: 'Processed', key: 'processed', color: '#9b72cf', ...agg('processed') },
      { label: 'Recovered', key: 'recovered', color: '#1fa89a', ...agg('recovered') },
      { label: 'Dispatched', key: 'dispatched', color: '#0c2b33', ...agg('dispatched') },
    ];
  }, [claims]);

  const journeyMax = useMemo(() =>
    Math.max(...journeyStages.map(s => s.total ?? 0), 1),
    [journeyStages]
  );

  // ── Review queue (top 3 needing attention) ────────────────────────────────────

  const reviewQueue = useMemo(() =>
    claims
      .filter(c => c.status === 'Needs review' || c.status === 'In review')
      .slice(0, 3),
    [claims]
  );

  function computeGap(claim: Claim): string {
    if (claim.dispatched === null) return '—';
    return `${(claim.claimed - claim.dispatched).toFixed(1)}t`;
  }

  // ── Recent activity (last 5 events by timestamp) ──────────────────────────────

  const recentActivity = useMemo(() => {
    return [...timeline]
      .sort((a: TimelineEvent, b: TimelineEvent) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 5);
  }, [timeline]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section>
      {/* Hero */}
      <div className="cp-hero">
        <div>
          <p className="cp-eyebrow">Material Claims Intelligence</p>
          <h1>
            Cycle<span className="cp-logo-period">Proof</span>
          </h1>
          <p className="lead">
            Track, verify, and reconcile recycled-material claims across your supply chain. Every tonne. Every stage.
          </p>
          <div className="cp-actions" style={{ marginTop: '1.8rem' }}>
            <button className="btn" onClick={() => onNavigate('claims')}>
              View Claims →
            </button>
            <button className="cp-text-button" onClick={() => onNavigate('evidence')}>
              Upload Evidence →
            </button>
          </div>
        </div>

        {/* Orbit ring — summary visual */}
        <div className="cp-orbit glass">
          <div className="cp-orbit-top">
            <span>OVERVIEW</span>
            <span className="cp-live">
              <i /> DEMO DATA
            </span>
          </div>
          <div className="cp-ring">
            <div>
              <span className="cp-ring-number">{totalClaims}</span>
              <span className="cp-ring-label">
                Total<br />Claims
              </span>
            </div>
          </div>
          <div className="cp-orbit-bottom">
            <span>
              <b>{needsReviewCount}</b> Needs Review
            </span>
            <span>
              <b>{openDiscrepancies}</b> Open Discrep.
            </span>
            <span>
              <b>{claims.filter(c => c.status === 'Reconciled').length}</b> Reconciled
            </span>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="cp-metrics">
        <MetricCard
          label="Total Claims"
          value={totalClaims}
          sub="All tracked claims"
          icon="📋"
        />
        <MetricCard
          label="Total Claimed"
          value={`${totalClaimed}t`}
          sub="Sum of all declared quantities"
          icon="⚖"
        />
        <MetricCard
          label="Needs Review"
          value={needsReviewCount}
          sub="Claims awaiting review"
          icon="⚠"
        />
        <MetricCard
          label="Open Discrepancies"
          value={openDiscrepancies}
          sub="Unresolved quantity gaps"
          icon="🔴"
        />
      </div>

      {/* Material journey widget */}
      <div className="cp-journey-widget">
        <div className="cp-section-head" style={{ marginTop: '3rem', marginBottom: '.8rem' }}>
          <div>
            <p className="cp-eyebrow">Material Journey</p>
            <h2>Flow Overview</h2>
          </div>
        </div>
        <p className="cp-disclaimer" style={{ marginBottom: '1rem' }}>
          Aggregated across all demo claims. Click a stage to explore.
        </p>
        <div className="cp-journey-stages">
          {journeyStages.map((stage, i) => (
            <React.Fragment key={stage.key}>
              <JourneyStageBlock
                stage={stage}
                maxVal={journeyMax}
                onClick={() => onNavigate('claims')}
              />
              {i < journeyStages.length - 1 && (
                <div className="cp-journey-arrow">›</div>
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="cp-disclaimer" style={{ marginTop: '.75rem' }}>
          Stages with null data for all claims are shown as —. N/A counts reflect missing stage records.
        </p>
      </div>

      {/* Review queue */}
      <div className="cp-section-head">
        <div>
          <p className="cp-eyebrow">Review Queue</p>
          <h2>Needs Attention</h2>
        </div>
        <button className="cp-small-button" onClick={() => onNavigate('claims')}>
          All Claims →
        </button>
      </div>

      {reviewQueue.length === 0 ? (
        <p className="cp-disclaimer">No claims currently needing review.</p>
      ) : (
        <div className="cp-panel">
          <div className="cp-table-scroll">
            <table className="cp-table">
              <thead>
                <tr>
                  <th>Claim / Partner</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Gap (claimed − dispatched)</th>
                  <th aria-label="Action"></th>
                </tr>
              </thead>
              <tbody>
                {reviewQueue.map(claim => {
                  const gap = computeGap(claim);
                  const isNegative = gap !== '—' && parseFloat(gap) > 0;
                  return (
                    <tr
                      key={claim.id}
                      onClick={() => { onClaimSelect(claim.id); onNavigate('claims'); }}
                    >
                      <td>
                        <b>{claim.id}</b>
                        <small>{claim.partner}</small>
                      </td>
                      <td>{claim.period}</td>
                      <td><StatusBadge status={claim.status} /></td>
                      <td>
                        <span className={gap !== '—' && isNegative ? 'cp-variance' : gap !== '—' ? 'cp-variance good' : ''}>
                          {gap}
                        </span>
                      </td>
                      <td>
                        <button
                          className="cp-arrow"
                          onClick={e => {
                            e.stopPropagation();
                            onClaimSelect(claim.id);
                            onNavigate('claims');
                          }}
                          aria-label={`Open ${claim.id}`}
                        >
                          →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="cp-section-head" style={{ marginTop: '3rem' }}>
        <div>
          <p className="cp-eyebrow">Activity Feed</p>
          <h2>Recent Events</h2>
        </div>
      </div>

      <div className="cp-panel">
        {recentActivity.length === 0 ? (
          <p className="cp-disclaimer">No activity yet.</p>
        ) : (
          <div className="cp-recent-activity">
            {recentActivity.map(event => (
              <div key={event.id} className="cp-activity-row">
                <span className="cp-activity-icon">{EVENT_ICONS[event.type]}</span>
                <div className="cp-activity-text">
                  <b>{event.title}</b>
                  <small>{event.description}</small>
                </div>
                <span className="cp-activity-time">{timeAgo(event.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer disclaimer */}
      <p className="cp-disclaimer" style={{ marginTop: '2.5rem', marginBottom: '2rem' }}>
        All organizations, quantities, and events shown are synthetic demo data.
      </p>
    </section>
  );
};

export { Dashboard };
export default Dashboard;
