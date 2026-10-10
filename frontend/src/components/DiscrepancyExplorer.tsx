// CycleProof — DiscrepancyExplorer
// Dedicated workspace for browsing, filtering, and resolving discrepancies.
// Never divides by zero; never treats null values as 0.

import React, { useState, useMemo } from 'react';
import type { AppState, Discrepancy, DiscrepancyStatus, UserPreferences } from '../types';
import type { AppStateReturn } from '../store/useAppState';

// ─── Props ────────────────────────────────────────────────────────────────────

export type DiscrepancyExplorerProps = {
  state: AppStateReturn['state'];
  updateDiscrepancyStatus: AppStateReturn['updateDiscrepancyStatus'];
  onClaimSelect: (id: string) => void;
  onNavigate: (tab: string) => void;
  preferences: UserPreferences;
};

// ─── Sort + filter types ──────────────────────────────────────────────────────

type FilterOption = 'all' | 'open' | 'under-review' | 'resolved' | 'needs-information';
type SortOption = 'date-desc' | 'diff-desc' | 'claim-id';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

function timeAgo(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function statusToFilter(status: DiscrepancyStatus): FilterOption {
  switch (status) {
    case 'Open': return 'open';
    case 'Under Review': return 'under-review';
    case 'Resolved': return 'resolved';
    case 'Needs Information': return 'needs-information';
  }
}

function statusBadgeClass(status: DiscrepancyStatus): string {
  return `cp-status ${statusToFilter(status)}`;
}

function fmtNum(val: number | null, unit: string): string {
  if (val === null) return '—';
  return `${val.toLocaleString()} ${unit}`;
}

// Org name lookup helper
function orgNameForDisc(disc: Discrepancy, state: AppState): string {
  return state.organizations.find((o) => o.id === disc.orgId)?.name ?? disc.orgId;
}

// ─── Summary card ─────────────────────────────────────────────────────────────

type SummaryCardProps = { label: string; count: number; color?: string };
const SummaryCard: React.FC<SummaryCardProps> = ({ label, count, color }) => (
  <div className="cp-disc-card">
    <strong style={{ color: color ?? 'var(--ink)' }}>{count}</strong>
    <span>{label}</span>
  </div>
);

// ─── Expanded detail panel ────────────────────────────────────────────────────

type DetailPanelProps = {
  disc: Discrepancy;
  orgName: string;
  updateDiscrepancyStatus: AppStateReturn['updateDiscrepancyStatus'];
  onClaimSelect: (id: string) => void;
  showPct: boolean;
};

const DetailPanel: React.FC<DetailPanelProps> = ({
  disc, orgName, updateDiscrepancyStatus, onClaimSelect, showPct,
}) => {
  const [notes, setNotes] = useState(disc.reviewerNotes);
  const [status, setStatus] = useState<DiscrepancyStatus>(disc.status);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateDiscrepancyStatus(disc.id, status, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className="cp-disc-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.6rem', fontSize: '.78rem', color: 'var(--muted)' }}>
        <span>Reporting Facility: <b>{orgName}</b></span>
        {showPct && disc.pctDiff !== null && (
          <span style={{ color: 'var(--risk)', fontWeight: 700 }}>
            Variance: {disc.pctDiff.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Detection explanation */}
      <p className="cp-eyebrow" style={{ marginBottom: '.4rem' }}>Detection Explanation</p>
      <div className="cp-disc-explanation">{disc.detectionExplanation}</div>

      {/* Relevant evidence IDs */}
      {disc.relevantEvidenceIds.length > 0 && (
        <div style={{ marginBottom: '.85rem' }}>
          <p className="cp-eyebrow" style={{ marginBottom: '.3rem' }}>Relevant Evidence IDs</p>
          <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
            {disc.relevantEvidenceIds.map((id) => (
              <span key={id} style={{
                background: 'rgba(42,111,219,.1)', color: '#1d4fa6',
                borderRadius: 999, padding: '.2rem .6rem', fontSize: '.72rem', fontWeight: 700,
              }}>
                {id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviewer controls */}
      <div style={{ display: 'grid', gap: '.55rem', marginBottom: '.75rem' }}>
        <label style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)' }}>
          Reviewer Notes
          <textarea
            className="cp-tl-textarea"
            style={{ marginTop: '.3rem', display: 'block' }}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
            placeholder="Add a note about this discrepancy…"
            rows={3}
          />
        </label>
        <label style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)' }}>
          Status
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as DiscrepancyStatus); setSaved(false); }}
            style={{
              display: 'block', marginTop: '.3rem', width: '100%',
              padding: '.5rem .8rem', borderRadius: 12,
              border: '1px solid rgba(12,43,51,.15)',
              background: 'rgba(255,255,255,.55)', font: 'inherit', fontSize: '.84rem',
            }}
          >
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="Needs Information">Needs Information</option>
            <option value="Resolved">Resolved</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '.7rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="cp-small-button" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save changes'}
        </button>
        <button
          className="cp-text-button"
          style={{ fontSize: '.82rem' }}
          onClick={() => onClaimSelect(disc.claimId)}
        >
          Open claim {disc.claimId} →
        </button>
      </div>

      {disc.resolvedAt && (
        <p style={{ fontSize: '.72rem', color: '#087b70', marginTop: '.6rem' }}>
          ✓ Resolved {formatDate(disc.resolvedAt)}
        </p>
      )}
    </div>
  );
};

// ─── Single discrepancy row ───────────────────────────────────────────────────

type DiscRowProps = {
  disc: Discrepancy;
  orgName: string;
  expanded: boolean;
  onToggle: () => void;
  updateDiscrepancyStatus: AppStateReturn['updateDiscrepancyStatus'];
  onClaimSelect: (id: string) => void;
  showPct: boolean;
  tolerancePct: number;
};

const DiscRow: React.FC<DiscRowProps> = ({
  disc, orgName, expanded, onToggle,
  updateDiscrepancyStatus, onClaimSelect, showPct, tolerancePct,
}) => {
  // Safe pct diff — only show when both values non-null AND expected !== 0
  const canShowPct =
    showPct &&
    disc.pctDiff !== null &&
    disc.expectedValue !== null &&
    disc.observedValue !== null &&
    disc.expectedValue !== 0;

  return (
    <div className="cp-disc-row">
      <div className="cp-disc-row-head" onClick={onToggle}>
        <div className="cp-disc-meta">
          {/* Type + claim link */}
          <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginBottom: '.2rem', flexWrap: 'wrap' }}>
            <span className="cp-disc-type">{disc.type}</span>
            <span className={statusBadgeClass(disc.status)}>{disc.status}</span>
            <button
              className="cp-text-button"
              style={{ fontSize: '.75rem', padding: '.1rem .2rem' }}
              onClick={(e) => { e.stopPropagation(); onClaimSelect(disc.claimId); }}
            >
              {disc.claimId}
            </button>
          </div>
          {/* Org */}
          <p style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: '.3rem' }}>{orgName}</p>
          {/* Description */}
          <p className="cp-disc-desc">{disc.description}</p>
          {/* Values row */}
          <div className="cp-disc-vals">
            <span>
              Expected: <b>{fmtNum(disc.expectedValue, disc.unit)}</b>
            </span>
            <span>
              Observed: <b>{fmtNum(disc.observedValue, disc.unit)}</b>
            </span>
            {disc.absoluteDiff !== null && (
              <span>
                Diff: <b>{disc.absoluteDiff.toLocaleString()} {disc.unit}</b>
                {canShowPct && disc.pctDiff !== null && (
                  <span style={{ color: 'var(--risk)', fontWeight: 700, marginLeft: '.3rem' }}>
                    ({disc.pctDiff.toFixed(1)}%)
                  </span>
                )}
              </span>
            )}
            <span style={{ color: disc.absoluteDiff !== null && disc.pctDiff !== null && disc.pctDiff > (disc.tolerancePct ?? tolerancePct) ? 'var(--risk)' : '#087b70' }}>
              Demo tolerance: {disc.tolerancePct ?? tolerancePct}%
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '.7rem' }} title={disc.detectedAt}>
              Detected {timeAgo(disc.detectedAt)}
            </span>
          </div>
        </div>
        <button className="cp-disc-expand" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {expanded ? '▲ Close' : '▼ View details'}
        </button>
      </div>

      {expanded && (
        <DetailPanel
          disc={disc}
          orgName={orgName}
          updateDiscrepancyStatus={updateDiscrepancyStatus}
          onClaimSelect={onClaimSelect}
          showPct={showPct}
        />
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const FILTER_OPTIONS: { label: string; value: FilterOption }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Under Review', value: 'under-review' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Needs Information', value: 'needs-information' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Newest first', value: 'date-desc' },
  { label: 'Largest difference', value: 'diff-desc' },
  { label: 'Claim ID', value: 'claim-id' },
];

const DiscrepancyExplorer: React.FC<DiscrepancyExplorerProps> = ({
  state, updateDiscrepancyStatus, onClaimSelect, onNavigate, preferences,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { discrepancies, organizations } = state;

  // Summary counts
  const total = discrepancies.length;
  const openCount = discrepancies.filter((d) => d.status === 'Open').length;
  const underReviewCount = discrepancies.filter((d) => d.status === 'Under Review').length;
  const resolvedCount = discrepancies.filter((d) => d.status === 'Resolved').length;

  // Filtered + sorted list
  const filtered = useMemo<Discrepancy[]>(() => {
    const q = search.toLowerCase().trim();

    const base = discrepancies.filter((d) => {
      // Filter by status
      if (filter !== 'all' && statusToFilter(d.status) !== filter) return false;

      // Search across description, claim ID, org name
      if (q) {
        const org = organizations.find((o) => o.id === d.orgId)?.name ?? '';
        const text = `${d.description} ${d.claimId} ${org}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    base.sort((a, b) => {
      if (sort === 'date-desc') {
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
      }
      if (sort === 'diff-desc') {
        const aDiff = a.absoluteDiff ?? -1;
        const bDiff = b.absoluteDiff ?? -1;
        return bDiff - aDiff;
      }
      // claim-id
      return a.claimId.localeCompare(b.claimId);
    });

    return base;
  }, [discrepancies, organizations, search, filter, sort]);

  return (
    <section>
      {/* Page heading */}
      <div className="cp-page-heading">
        <p className="cp-eyebrow">INVESTIGATION WORKSPACE</p>
        <h1>Discrepancies</h1>
        <p className="lead">
          Review, investigate, and resolve flagged discrepancies across all claims.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="btn cp-small-button"
            onClick={() => onNavigate('REVIEW')}
          >
            Triage in Review Workspace →
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="cp-disc-summary">
        <SummaryCard label="Total" count={total} />
        <SummaryCard label="Open" count={openCount} color="#a33720" />
        <SummaryCard label="Under Review" count={underReviewCount} color="#1d4fa6" />
        <SummaryCard label="Resolved" count={resolvedCount} color="#087b70" />
      </div>

      {/* Disclaimer */}
      <p className="cp-disclaimer" style={{ marginBottom: '1.5rem' }}>
        ⚖️ A discrepancy is a reason to investigate, not automatic proof of fraud or error. All findings should be contextualised before conclusions are drawn.
      </p>

      {/* Search */}
      <input
        className="field"
        type="search"
        placeholder="Search by description, claim ID, or organisation…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '1rem', width: '100%', maxWidth: 520 }}
        aria-label="Search discrepancies"
      />

      {/* Filter row + sort */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="cp-filter-row" style={{ margin: 0 }}>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={filter === opt.value ? 'active' : ''}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          style={{
            borderRadius: 999, border: '1px solid var(--line)',
            padding: '.38rem .85rem', fontSize: '.8rem', fontWeight: 700,
            background: 'rgba(255,255,255,.5)', font: 'inherit', color: 'var(--muted)',
          }}
          aria-label="Sort discrepancies"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="cp-empty" style={{ textAlign: 'center', padding: '3rem', borderRadius: 20, background: 'rgba(255,255,255,.35)' }}>
          <p style={{ fontSize: '1.8rem', marginBottom: '.5rem' }}>🔍</p>
          <p style={{ fontWeight: 700, marginBottom: '.3rem' }}>No discrepancies match your filters.</p>
          <p style={{ color: 'var(--muted)', fontSize: '.86rem' }}>Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div>
          {filtered.map((disc) => (
            <DiscRow
              key={disc.id}
              disc={disc}
              orgName={orgNameForDisc(disc, state)}
              expanded={expandedId === disc.id}
              onToggle={() => setExpandedId((prev) => (prev === disc.id ? null : disc.id))}
              updateDiscrepancyStatus={updateDiscrepancyStatus}
              onClaimSelect={onClaimSelect}
              showPct={preferences.showPctInDiscrepancies}
              tolerancePct={preferences.discrepancyTolerancePct}
            />
          ))}
          <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.5rem' }}>
            Showing {filtered.length} of {total} discrepanc{total !== 1 ? 'ies' : 'y'}
          </p>
        </div>
      )}
    </section>
  );
};

export { DiscrepancyExplorer };
export default DiscrepancyExplorer;
