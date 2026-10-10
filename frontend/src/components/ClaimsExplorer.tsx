// CycleProof — ClaimsExplorer.tsx
// CLAIMS tab: filtered/sorted claim list on the left, inline claim detail panel on the right.

import React, { useState, useMemo, useCallback } from 'react';
import type { AppStateReturn } from '../store/useAppState';
import type { Claim, ClaimStatus, EvidenceRecord } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────────

type ClaimsExplorerProps = {
  state: AppStateReturn['state'];
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  updateClaimStatus: AppStateReturn['updateClaimStatus'];
  updateClaimReviewerNotes: AppStateReturn['updateClaimReviewerNotes'];
  onNavigate: (tab: string) => void;
  onOpenReport?: (claimId: string) => void;
};

type FilterKey = 'All' | ClaimStatus;
type SortKey = 'date' | 'claimed' | 'variance';

// ── Helpers ────────────────────────────────────────────────────────────────────

function variance(claim: Claim): number | null {
  if (claim.dispatched === null) return null;
  return claim.claimed - claim.dispatched;
}

function fmtQty(val: number | null): string {
  if (val === null) return '—';
  return `${val}t`;
}

function statusCls(status: string): string {
  if (status === 'Needs review') return 'needs-review';
  if (status === 'In review') return 'in-review';
  if (status === 'Reconciled') return 'reconciled';
  if (status === 'Open') return 'open';
  return 'resolved';
}

function triggerCSVDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function claimsToCSV(claims: Claim[]): string {
  const headers = ['ID', 'Partner', 'Period', 'Status', 'Claimed', 'Collected', 'Received', 'Processed', 'Recovered', 'Dispatched', 'Variance'];
  const rows = claims.map(c => [
    c.id,
    `"${c.partner}"`,
    c.period,
    `"${c.status}"`,
    c.claimed,
    c.collected ?? 'N/A',
    c.received ?? 'N/A',
    c.processed ?? 'N/A',
    c.recovered ?? 'N/A',
    c.dispatched ?? 'N/A',
    variance(c) ?? 'N/A',
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}

// ── StatusBadge ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return <span className={`cp-status ${statusCls(status)}`}>{status}</span>;
}

// ── QuantityBar ────────────────────────────────────────────────────────────────

interface QtyBarProps {
  label: string;
  value: number | null;
  max: number;
  color: string;
}

function QuantityBar({ label, value, max, color }: QtyBarProps) {
  const pct = value !== null && max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="cp-qty-bar-row">
      <span className="cp-qty-bar-label">{label}</span>
      <div className="cp-qty-bar-track">
        {value !== null && (
          <div
            className="cp-qty-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        )}
      </div>
      {value !== null ? (
        <span className="cp-qty-bar-val">{value}t</span>
      ) : (
        <span className="cp-qty-bar-val cp-qty-bar-null">—</span>
      )}
    </div>
  );
}

// ── ClaimDetail (inline) ───────────────────────────────────────────────────────

interface ClaimDetailProps {
  claim: Claim;
  evidence: EvidenceRecord[];
  updateClaimStatus: AppStateReturn['updateClaimStatus'];
  updateClaimReviewerNotes: AppStateReturn['updateClaimReviewerNotes'];
  onOpenReport?: (claimId: string) => void;
}

function ClaimDetail({ claim, evidence, updateClaimStatus, updateClaimReviewerNotes, onOpenReport }: ClaimDetailProps) {
  const [notes, setNotes] = useState(claim.reviewerNotes);
  const [notesSaved, setNotesSaved] = useState(false);
  const [newStatus, setNewStatus] = useState<ClaimStatus>(claim.status);

  // Sync when claim changes
  const claimId = claim.id;
  React.useEffect(() => {
    setNotes(claim.reviewerNotes);
    setNotesSaved(false);
    setNewStatus(claim.status);
  }, [claimId, claim.reviewerNotes, claim.status]);

  const claimEvidence = evidence.filter(e => e.claimId === claim.id);

  const maxQty = Math.max(
    claim.claimed,
    claim.collected ?? 0,
    claim.received ?? 0,
    claim.processed ?? 0,
    claim.recovered ?? 0,
    claim.dispatched ?? 0,
    1,
  );

  const gap = variance(claim);
  const gapPositive = gap !== null && gap > 0;
  const gapZero = gap !== null && gap === 0;

  const handleSaveNotes = useCallback(() => {
    updateClaimReviewerNotes(claim.id, notes, 'Reviewer');
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2500);
  }, [claim.id, notes, updateClaimReviewerNotes]);

  const handleStatusUpdate = useCallback(() => {
    updateClaimStatus(claim.id, newStatus, 'Reviewer');
  }, [claim.id, newStatus, updateClaimStatus]);

  const handleExportClaim = useCallback(() => {
    const csv = claimsToCSV([claim]);
    triggerCSVDownload(csv, `claim-${claim.id}.csv`);
  }, [claim]);

  return (
    <div className="cp-detail">
      <div className="cp-panel">
        {/* Header */}
        <p className="cp-detail-id">{claim.id}</p>
        <h3>{claim.partner}</h3>
        <p className="cp-muted">
          {claim.period} &middot; Submitted {new Date(claim.submittedIso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {claim.assignedReviewer ? ` · ${claim.assignedReviewer}` : ''}
        </p>
        <StatusBadge status={claim.status} />

        {/* Quantity bars */}
        <div style={{ marginTop: '1.5rem' }}>
          <p className="cp-eyebrow" style={{ marginBottom: '.6rem' }}>Material Quantities</p>
          <QuantityBar label="Collected" value={claim.collected} max={maxQty} color="#ffb627" />
          <QuantityBar label="Claimed" value={claim.claimed} max={maxQty} color="#2a6fdb" />
          <QuantityBar label="Received" value={claim.received} max={maxQty} color="#2a6fdb" />
          <QuantityBar label="Processed" value={claim.processed} max={maxQty} color="#9b72cf" />
          <QuantityBar label="Recovered" value={claim.recovered} max={maxQty} color="#1fa89a" />
          <QuantityBar label="Dispatched" value={claim.dispatched} max={maxQty} color="#0c2b33" />
        </div>

        {/* Gap box */}
        {gap !== null ? (
          <div className="cp-gap-box" style={{ background: gapZero ? 'rgba(31,168,154,.09)' : 'rgba(229,80,43,.08)', marginTop: '1rem' }}>
            <span>Quantity gap (claimed − dispatched)</span>
            <strong style={{ color: gapZero ? '#087b70' : gapPositive ? '#a33720' : '#087b70' }}>
              {gap > 0 ? `+${gap}` : gap}t
            </strong>
            <small>
              {gapZero
                ? 'Claimed and dispatched quantities match exactly.'
                : gapPositive
                ? 'Claimed exceeds dispatched — gap requires explanation.'
                : 'Dispatched exceeds claimed — review for data entry error.'}
            </small>
          </div>
        ) : (
          <div className="cp-gap-box" style={{ marginTop: '1rem' }}>
            <span>Quantity gap</span>
            <strong style={{ color: 'var(--muted)', fontSize: '1.4rem' }}>—</strong>
            <small>Dispatched data not available yet.</small>
          </div>
        )}

        {/* Evidence */}
        <div className="cp-evidence-label">
          <p className="cp-eyebrow">
            Evidence ({claim.evidenceAttached}/{claim.evidenceCount})
          </p>
        </div>
        {claimEvidence.length === 0 ? (
          <p className="cp-disclaimer">No evidence records linked.</p>
        ) : (
          claimEvidence.map(ev => (
            <div key={ev.id} className="cp-linked-file">
              <span className="cp-file-mark">{ev.stage.slice(0, 3).toUpperCase()}</span>
              <div>
                <b>
                  {ev.type} — {ev.reference}
                  {ev.missing && (
                    <span className="cp-missing-badge">⚠ Missing</span>
                  )}
                </b>
                <small>
                  {ev.stage} · {ev.quantityTonnes !== null ? `${ev.quantityTonnes}t` : '—'} · {ev.source}
                  {ev.notes ? ` · ${ev.notes}` : ''}
                </small>
              </div>
            </div>
          ))
        )}

        {/* Reviewer notes */}
        <div style={{ marginTop: '1.5rem' }}>
          <p className="cp-eyebrow">Reviewer Notes</p>
          <textarea
            className="cp-reviewer-notes"
            value={notes}
            onChange={e => { setNotes(e.target.value); setNotesSaved(false); }}
            placeholder="Add notes for this claim…"
            aria-label="Reviewer notes"
          />
          <div style={{ display: 'flex', gap: '.7rem', alignItems: 'center', marginTop: '.6rem' }}>
            <button className="cp-small-button" onClick={handleSaveNotes}>
              Save notes
            </button>
            {notesSaved && <span style={{ fontSize: '.78rem', color: '#087b70', fontWeight: 700 }}>✓ Saved</span>}
          </div>
        </div>

        {/* Status update */}
        <div style={{ marginTop: '1.5rem' }}>
          <p className="cp-eyebrow">Update Status</p>
          <select
            className="cp-status-select"
            value={newStatus}
            onChange={e => setNewStatus(e.target.value as ClaimStatus)}
            aria-label="New claim status"
          >
            <option value="Needs review">Needs review</option>
            <option value="In review">In review</option>
            <option value="Reconciled">Reconciled</option>
          </select>
          <button
            className="btn cp-review-btn"
            style={{ marginTop: '.7rem' }}
            onClick={handleStatusUpdate}
          >
            Update status
          </button>
        </div>

        {/* Export */}
        <div style={{ marginTop: '1.2rem', display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          {onOpenReport && (
            <button
              type="button"
              className="btn cp-small-button"
              onClick={() => onOpenReport(claim.id)}
            >
              Open Full Audit Report ↗
            </button>
          )}
          <button type="button" className="cp-export-btn" onClick={handleExportClaim}>
            ↓ Export claim CSV
          </button>
        </div>

        <p className="cp-disclaimer cp-detail" style={{ marginTop: '1rem' }}>
          Demo only. Changes are local to this browser session.
        </p>
      </div>
    </div>
  );
}

// ── ClaimsExplorer ─────────────────────────────────────────────────────────────

const ClaimsExplorer: React.FC<ClaimsExplorerProps> = ({
  state,
  selectedClaimId,
  onSelectClaim,
  updateClaimStatus,
  updateClaimReviewerNotes,
  onNavigate,
  onOpenReport,
}) => {
  const { claims, evidence } = state;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('All');
  const [sort, setSort] = useState<SortKey>('date');
  const [exported, setExported] = useState(false);

  // ── Derived list ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = claims;

    // Search by ID or partner
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        c => c.id.toLowerCase().includes(q) || c.partner.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filter !== 'All') {
      list = list.filter(c => c.status === filter);
    }

    // Sort
    if (sort === 'date') {
      list = [...list].sort(
        (a, b) => new Date(b.submittedIso).getTime() - new Date(a.submittedIso).getTime()
      );
    } else if (sort === 'claimed') {
      list = [...list].sort((a, b) => b.claimed - a.claimed);
    } else {
      // variance desc — null last
      list = [...list].sort((a, b) => {
        const va = variance(a);
        const vb = variance(b);
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        return vb - va;
      });
    }

    return list;
  }, [claims, search, filter, sort]);

  const selectedClaim = useMemo(
    () => claims.find(c => c.id === selectedClaimId) ?? filtered[0] ?? null,
    [claims, selectedClaimId, filtered]
  );

  const handleExportCSV = useCallback(() => {
    const csv = claimsToCSV(filtered);
    triggerCSVDownload(csv, `cycleproof-claims-${Date.now()}.csv`);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  }, [filtered]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <section>
      <div className="cp-page-heading">
        <p className="cp-eyebrow">Claims Management</p>
        <h1>Claims Explorer</h1>
        <p className="lead">
          Browse, filter, and review all material claims. Select a claim to inspect its evidence and quantities.
        </p>
      </div>

      <div className="cp-claim-layout">
        {/* Left: list */}
        <div className="cp-panel cp-claim-list">
          {/* Search + controls */}
          <div className="cp-claims-header">
            <span style={{ fontSize: '.8rem', color: 'var(--muted)', fontWeight: 600 }}>
              {filtered.length} of {claims.length} claims
            </span>
            <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="cp-sort-select"
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                aria-label="Sort claims"
              >
                <option value="date">Sort: Date ↓</option>
                <option value="claimed">Sort: Claimed ↓</option>
                <option value="variance">Sort: Variance ↓</option>
              </select>
              <button
                className="cp-export-btn"
                onClick={handleExportCSV}
                title="Export visible claims as CSV"
              >
                {exported ? '✓ Downloaded' : '↓ Export CSV'}
              </button>
              <button
                type="button"
                className="cp-small-button"
                onClick={() => onNavigate('EVIDENCE')}
              >
                ＋ Add evidence
              </button>
            </div>
          </div>

          <input
            className="field"
            type="search"
            placeholder="Search by claim ID or partner…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search claims"
          />

          {/* Filter row */}
          <div className="cp-filter-row">
            {(['All', 'Needs review', 'In review', 'Reconciled'] as FilterKey[]).map(f => (
              <button
                key={f}
                className={filter === f ? 'active' : ''}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <p className="cp-disclaimer">No claims match your current filters.</p>
          ) : (
            <div className="cp-table-scroll">
              <table className="cp-table">
                <thead>
                  <tr>
                    <th>Claim / Partner</th>
                    <th>Period</th>
                    <th>Claimed</th>
                    <th>Dispatched</th>
                    <th>Variance</th>
                    <th>Status</th>
                    <th aria-label="Open"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(claim => {
                    const v = variance(claim);
                    const isSelected = claim.id === selectedClaim?.id;
                    return (
                      <tr
                        key={claim.id}
                        className={isSelected ? 'is-selected' : ''}
                        onClick={() => onSelectClaim(claim.id)}
                      >
                        <td>
                          <b>{claim.id}</b>
                          <small>{claim.partner}</small>
                        </td>
                        <td>{claim.period}</td>
                        <td>{fmtQty(claim.claimed)}</td>
                        <td>{fmtQty(claim.dispatched)}</td>
                        <td>
                          {v === null ? (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          ) : (
                            <span className={`cp-variance${v <= 0 ? ' good' : ''}`}>
                              {v > 0 ? `+${v}` : v}t
                            </span>
                          )}
                        </td>
                        <td><StatusBadge status={claim.status} /></td>
                        <td>
                          <button
                            className="cp-arrow"
                            onClick={e => { e.stopPropagation(); onSelectClaim(claim.id); }}
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
          )}
        </div>

        {/* Right: detail panel */}
        {selectedClaim ? (
          <ClaimDetail
            claim={selectedClaim}
            evidence={evidence}
            updateClaimStatus={updateClaimStatus}
            updateClaimReviewerNotes={updateClaimReviewerNotes}
            onOpenReport={onOpenReport}
          />
        ) : (
          <div className="cp-panel cp-detail">
            <p className="cp-disclaimer">Select a claim to view its details.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export { ClaimsExplorer };
export default ClaimsExplorer;
