// CycleProof — MaterialJourney
// Renders the 5-stage material flow: Collected → Received → Processed → Recovered → Dispatched
// Quantities from claim fields. null means data unavailable — never treated as zero.

import React, { useState } from 'react';
import type { Claim, EvidenceRecord, Discrepancy } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type StageKey = 'collected' | 'received' | 'processed' | 'recovered' | 'dispatched';
type StageLabel = 'Collected' | 'Received' | 'Processed' | 'Recovered' | 'Dispatched';

export type MaterialJourneyProps = {
  claim: Claim;
  evidence: EvidenceRecord[];
  discrepancies: Discrepancy[];
  compact?: boolean;
};

// ─── Stage metadata ───────────────────────────────────────────────────────────

const STAGES: { key: StageKey; label: StageLabel; color: string }[] = [
  { key: 'collected',  label: 'Collected',  color: '#ffb627' },
  { key: 'received',   label: 'Received',   color: '#2a6fdb' },
  { key: 'processed',  label: 'Processed',  color: '#9b72cf' },
  { key: 'recovered',  label: 'Recovered',  color: '#1fa89a' },
  { key: 'dispatched', label: 'Dispatched', color: '#0c2b33' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtQty(val: number | null): string {
  if (val === null) return '—';
  return val.toLocaleString();
}

function buildArrowLabel(from: number | null, to: number | null): string {
  if (from === null || to === null) return '— (data unavailable)';
  const diff = from - to;
  if (diff === 0) return '±0 t';
  return `${diff > 0 ? '−' : '+'}${Math.abs(diff)} t`;
}

function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type StageBlockProps = {
  label: StageLabel;
  color: string;
  qty: number | null;
  evidenceCount: number;
  hasWarning: boolean;
  selected: boolean;
  compact: boolean;
  onClick: () => void;
};

const StageBlock: React.FC<StageBlockProps> = ({
  label, color, qty, evidenceCount, hasWarning, selected, compact, onClick,
}) => (
  <div
    className={`cp-mj-stage${selected ? ' is-selected' : ''}`}
    style={{ '--stage-color': color } as React.CSSProperties}
    onClick={onClick}
    role="button"
    tabIndex={0}
    aria-pressed={selected}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
  >
    {hasWarning && (
      <span className="cp-mj-stage-warn" title="Warning: missing evidence or discrepancy detected at this stage">
        ⚠️
      </span>
    )}
    <span className="cp-mj-stage-lbl">{label}</span>
    {qty !== null
      ? <span className="cp-mj-stage-qty">{fmtQty(qty)}<span style={{ fontSize: '.75rem', fontWeight: 600, opacity: .7, marginLeft: '.25rem' }}>t</span></span>
      : <span className="cp-mj-stage-null">No data</span>
    }
    {!compact && (
      <span className="cp-mj-stage-meta">
        {evidenceCount} evidence record{evidenceCount !== 1 ? 's' : ''}
      </span>
    )}
  </div>
);

type ArrowProps = {
  fromQty: number | null;
  toQty: number | null;
};

const Arrow: React.FC<ArrowProps> = ({ fromQty, toQty }) => {
  const label = buildArrowLabel(fromQty, toQty);
  const hasGap = fromQty !== null && toQty !== null && fromQty !== toQty;
  return (
    <div className="cp-mj-arrow">
      <span className="cp-mj-arrow-line">→</span>
      <span
        className="cp-mj-arrow-diff"
        style={{ color: hasGap ? 'var(--risk)' : undefined }}
        title={label}
      >
        {label}
      </span>
    </div>
  );
};

// ─── Detail panel ─────────────────────────────────────────────────────────────

type DetailPanelProps = {
  label: StageLabel;
  qty: number | null;
  stageEvidence: EvidenceRecord[];
  stageDiscrepancies: Discrepancy[];
};

const DetailPanel: React.FC<DetailPanelProps> = ({ label, qty, stageEvidence, stageDiscrepancies }) => (
  <div className="cp-mj-detail">
    <p className="cp-eyebrow" style={{ marginBottom: '.6rem' }}>
      {label.toUpperCase()} — STAGE DETAIL
    </p>
    <p style={{ fontSize: '.88rem', marginBottom: '1rem', color: 'var(--muted)' }}>
      Quantity: <strong style={{ color: 'var(--ink)' }}>
        {qty !== null ? `${fmtQty(qty)} t` : '—  (data not available)'}
      </strong>
    </p>

    {/* Evidence records */}
    {stageEvidence.length === 0 ? (
      <p style={{ fontSize: '.82rem', color: 'var(--muted)', fontStyle: 'italic' }}>
        No evidence records for this stage.
      </p>
    ) : (
      <>
        <p className="cp-eyebrow" style={{ marginBottom: '.4rem' }}>Evidence Records</p>
        <div className="cp-table-scroll" style={{ marginBottom: '1rem' }}>
          <table className="cp-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Date</th>
                <th>Qty (t)</th>
                <th>Source</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stageEvidence.map((ev) => (
                <tr key={ev.id}>
                  <td><b>{ev.reference}</b><small>{ev.id}</small></td>
                  <td>{ev.type}</td>
                  <td>{formatDate(ev.dateIso)}</td>
                  <td>{ev.quantityTonnes !== null ? `${ev.quantityTonnes} t` : '—'}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 160 }}>{ev.source}</td>
                  <td>
                    {ev.missing
                      ? <span className="cp-status needs-review">Missing</span>
                      : <span className="cp-status reconciled">Attached</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}

    {/* Discrepancies for this stage */}
    {stageDiscrepancies.length > 0 && (
      <>
        <p className="cp-eyebrow" style={{ marginBottom: '.4rem', color: 'var(--risk)' }}>
          Discrepancies Flagged for This Stage
        </p>
        <div style={{ display: 'grid', gap: '.5rem' }}>
          {stageDiscrepancies.map((d) => (
            <div key={d.id} style={{
              background: 'rgba(229,80,43,.07)', borderRadius: 14,
              padding: '.75rem 1rem', borderLeft: '3px solid var(--risk)',
              fontSize: '.82rem',
            }}>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.3rem' }}>
                <span style={{ fontWeight: 800, fontSize: '.7rem', color: 'var(--risk)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{d.type}</span>
                <span className={`cp-status ${d.status.toLowerCase().replace(' ', '-')}`}>{d.status}</span>
              </div>
              <p style={{ color: 'var(--ink)', marginBottom: '.2rem' }}>{d.description}</p>
              {d.absoluteDiff !== null && (
                <p style={{ color: 'var(--muted)' }}>
                  Diff: <strong style={{ color: 'var(--ink)' }}>{d.absoluteDiff} {d.unit}</strong>
                  {d.pctDiff !== null && ` (${d.pctDiff.toFixed(1)}%)`}
                </p>
              )}
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const MaterialJourney: React.FC<MaterialJourneyProps> = ({
  claim, evidence, discrepancies, compact = false,
}) => {
  const [selectedStage, setSelectedStage] = useState<StageLabel | null>(null);

  // Evidence keyed by stage
  const evidenceByStage = (label: StageLabel): EvidenceRecord[] =>
    evidence.filter((ev) => ev.claimId === claim.id && ev.stage === label);

  // Discrepancies that mention a given stage
  // A discrepancy is considered to flag a stage when its relevant evidence IDs include records for that stage
  const discrepanciesForStage = (label: StageLabel): Discrepancy[] => {
    const stageEvIds = new Set(evidenceByStage(label).map((ev) => ev.id));
    return discrepancies.filter(
      (d) => d.claimId === claim.id && d.relevantEvidenceIds.some((id) => stageEvIds.has(id))
    );
  };

  const hasWarning = (label: StageLabel): boolean => {
    const stageEv = evidenceByStage(label);
    if (stageEv.some((ev) => ev.missing)) return true;
    if (discrepanciesForStage(label).length > 0) return true;
    return false;
  };

  const handleStageClick = (label: StageLabel) => {
    if (compact) return;
    setSelectedStage((prev) => (prev === label ? null : label));
  };

  const selectedStageData = selectedStage
    ? STAGES.find((s) => s.label === selectedStage)
    : null;

  return (
    <div className="cp-mj-container">
      {/* Flow diagram */}
      <div className="cp-mj-flow">
        {STAGES.map((stage, idx) => {
          const stageQty = claim[stage.key];
          const prevQty = idx > 0 ? claim[STAGES[idx - 1].key] : null;
          return (
            <React.Fragment key={stage.key}>
              {idx > 0 && (
                <Arrow fromQty={prevQty} toQty={stageQty} />
              )}
              <StageBlock
                label={stage.label}
                color={stage.color}
                qty={stageQty}
                evidenceCount={evidenceByStage(stage.label).length}
                hasWarning={hasWarning(stage.label)}
                selected={selectedStage === stage.label}
                compact={compact}
                onClick={() => handleStageClick(stage.label)}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* Disclaimer note */}
      {!compact && (
        <p className="cp-mj-note">
          ℹ️ Material quantities shown are from submitted records. Differences are investigation triggers, not conclusions.
        </p>
      )}

      {/* Detail panel for selected stage */}
      {!compact && selectedStageData && selectedStage && (
        <DetailPanel
          label={selectedStage}
          qty={claim[selectedStageData.key]}
          stageEvidence={evidenceByStage(selectedStage)}
          stageDiscrepancies={discrepanciesForStage(selectedStage)}
        />
      )}
    </div>
  );
};

export { MaterialJourney };
export default MaterialJourney;
