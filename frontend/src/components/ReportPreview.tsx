// CycleProof — ReportPreview (Feature 7)
// Audit dossier export studio supporting customizable section inclusion, print-to-PDF formatting, and CSV data dumping.

import React, { useState, useMemo } from 'react';
import type { AppStateReturn } from '../store/useAppState';
import type { UserPreferences } from '../types';

export interface ReportPreviewProps {
  state: AppStateReturn['state'];
  claimId?: string;
  onClose: () => void;
  preferences: UserPreferences;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  state,
  claimId,
  onClose,
  preferences,
}) => {
  const [selectedClaimId, setSelectedClaimId] = useState<string>(claimId || state.claims[0]?.id || '');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeJourney, setIncludeJourney] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeDiscrepancies, setIncludeDiscrepancies] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [exportNotice, setExportNotice] = useState('');

  const claim = useMemo(
    () => state.claims.find((c) => c.id === selectedClaimId) ?? state.claims[0],
    [state.claims, selectedClaimId]
  );

  const org = useMemo(
    () => state.organizations.find((o) => o.id === claim?.orgId),
    [state.organizations, claim]
  );

  const evidenceList = useMemo(
    () => state.evidence.filter((e) => e.claimId === claim?.id),
    [state.evidence, claim]
  );

  const discrepancyList = useMemo(
    () => state.discrepancies.filter((d) => d.claimId === claim?.id),
    [state.discrepancies, claim]
  );

  const timelineList = useMemo(
    () => state.timeline.filter((t) => t.claimId === claim?.id),
    [state.timeline, claim]
  );

  const nowIso = useMemo(() => new Date().toISOString(), []);
  const formattedDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return nowIso;
    }
  }, [nowIso]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!claim) return;
    try {
      const rows: string[][] = [
        ['CYCLEPROOF VERIFICATION AUDIT DOSSIER'],
        ['Generated', formattedDate],
        ['Disclaimer', 'Synthetic demonstration data only'],
        [],
        ['CLAIM OVERVIEW'],
        ['Claim ID', claim.id],
        ['Partner Organization', claim.partner],
        ['Organization ID', org?.registrationId ?? 'N/A'],
        ['Reporting Period', claim.period],
        ['Audit Status', claim.status],
        ['Assigned Reviewer', claim.assignedReviewer || 'Unassigned'],
        [],
      ];

      if (includeJourney) {
        rows.push(
          ['MATERIAL MASS BALANCE (TONNES)'],
          ['Collected', claim.collected !== null ? String(claim.collected) : 'N/A'],
          ['Claimed', String(claim.claimed)],
          ['Received', claim.received !== null ? String(claim.received) : 'N/A'],
          ['Processed', claim.processed !== null ? String(claim.processed) : 'N/A'],
          ['Recovered', claim.recovered !== null ? String(claim.recovered) : 'N/A'],
          ['Dispatched', claim.dispatched !== null ? String(claim.dispatched) : 'N/A'],
          ['Net Variance (Claimed - Dispatched)', claim.dispatched !== null ? String(claim.claimed - claim.dispatched) : 'N/A'],
          []
        );
      }

      if (includeEvidence) {
        rows.push(['SUPPORTING EVIDENCE RECORDS']);
        rows.push(['Reference ID', 'Stage', 'Document Type', 'Quantity (t)', 'Source', 'Status']);
        evidenceList.forEach((e) => {
          rows.push([
            e.reference,
            e.stage,
            e.type,
            e.quantityTonnes !== null ? String(e.quantityTonnes) : 'N/A',
            `"${e.source.replace(/"/g, '""')}"`,
            e.missing ? 'Missing Document Gap' : 'Verified',
          ]);
        });
        rows.push([]);
      }

      if (includeDiscrepancies) {
        rows.push(['RECORDED AUDIT DISCREPANCIES']);
        rows.push(['ID', 'Type', 'Description', 'Expected', 'Observed', 'Status']);
        discrepancyList.forEach((d) => {
          rows.push([
            d.id,
            d.type,
            `"${d.description.replace(/"/g, '""')}"`,
            d.expectedValue !== null ? String(d.expectedValue) : 'N/A',
            d.observedValue !== null ? String(d.observedValue) : 'N/A',
            d.status,
          ]);
        });
        rows.push([]);
      }

      if (includeNotes && claim.reviewerNotes) {
        rows.push(['AUDITOR INVESTIGATION MEMORANDUM']);
        rows.push([`"${claim.reviewerNotes.replace(/"/g, '""')}"`]);
        rows.push([]);
      }

      const csvString = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cycleproof_audit_report_${claim.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setExportNotice('CSV report generated and downloaded.');
      setTimeout(() => setExportNotice(''), 3000);
    } catch (e) {
      setExportNotice('Failed to generate export file.');
    }
  };

  if (!claim) {
    return (
      <div className="cp-report-overlay" onClick={onClose}>
        <div className="cp-report-shell" style={{ padding: '2rem' }}>
          <h3>No claim selected</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="cp-report-overlay">
      <div className="cp-report-shell">
        {/* Controls Header (hidden during window.print) */}
        <div className="cp-report-controls">
          <h3>Audit Dossier Generator: <b>{claim.id}</b></h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Select claim:</span>
            <select
              className="cp-sort-select"
              value={selectedClaimId}
              onChange={(e) => setSelectedClaimId(e.target.value)}
            >
              {state.claims.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} ({c.partner})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '.6rem', marginLeft: 'auto' }}>
            <button type="button" className="cp-small-button" onClick={handleExportCSV}>
              ↓ Download CSV
            </button>
            <button type="button" className="btn cp-small-button" onClick={handlePrint}>
              ⎙ Print / Save PDF
            </button>
            <button
              type="button"
              className="cp-small-button"
              style={{ background: 'rgba(12,43,51,.08)', color: 'var(--ink)' }}
              onClick={onClose}
            >
              Close ✕
            </button>
          </div>
        </div>

        {/* Section Inclusion Checkboxes */}
        <div style={{ background: '#f5faf9', padding: '.8rem 1.5rem', borderBottom: '1px solid #e0e8e6' }} className="cp-report-controls">
          <span style={{ fontSize: '.76rem', fontWeight: 800, color: 'var(--muted)', display: 'block', marginBottom: '.4rem' }}>
            INCLUDE DOSSIER SECTIONS:
          </span>
          <div className="cp-section-checks">
            <label className="cp-section-check">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={() => setIncludeSummary(!includeSummary)}
              />
              Claim Summary
            </label>
            <label className="cp-section-check">
              <input
                type="checkbox"
                checked={includeJourney}
                onChange={() => setIncludeJourney(!includeJourney)}
              />
              Mass Balance Journey
            </label>
            <label className="cp-section-check">
              <input
                type="checkbox"
                checked={includeEvidence}
                onChange={() => setIncludeEvidence(!includeEvidence)}
              />
              Evidence Manifest
            </label>
            <label className="cp-section-check">
              <input
                type="checkbox"
                checked={includeDiscrepancies}
                onChange={() => setIncludeDiscrepancies(!includeDiscrepancies)}
              />
              Audit Discrepancies
            </label>
            <label className="cp-section-check">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={() => setIncludeNotes(!includeNotes)}
              />
              Auditor Notes
            </label>
            <label className="cp-section-check">
              <input
                type="checkbox"
                checked={includeTimeline}
                onChange={() => setIncludeTimeline(!includeTimeline)}
              />
              Timeline History
            </label>
          </div>
          {exportNotice && <small style={{ color: '#087b70', fontWeight: 700 }}>✓ {exportNotice}</small>}
        </div>

        {/* Document Body (Printed / Viewed) */}
        <div className="cp-report-body" id="print-area">
          <div className="cp-report-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="cp-report-title">CycleProof Environmental Reconciliation Report</h2>
                <div className="cp-report-meta">
                  Official Verification Record ID: <code>CPR-{claim.id}-{nowIso.slice(0, 10)}</code>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '.8rem' }}>
                <b>Date Issued:</b> {formattedDate}<br />
                <b>Verification Authority:</b> CycleProof Demo Engine
              </div>
            </div>
          </div>

          <div className="cp-report-demo-banner">
            ⚠️ SIMULATION NOTICE: This document was produced by the CycleProof frontend demonstration workspace. All facilities, mass values, and audit judgments are synthetic.
          </div>

          {/* Section: Summary */}
          {includeSummary && (
            <div className="cp-report-section">
              <h4>1. Organization &amp; Claim Overview</h4>
              <table className="cp-report-table">
                <tbody>
                  <tr>
                    <td style={{ width: '25%', fontWeight: 700 }}>Claim Identifier</td>
                    <td style={{ width: '25%' }}>{claim.id}</td>
                    <td style={{ width: '25%', fontWeight: 700 }}>Auditor Status</td>
                    <td style={{ width: '25%' }}><b>{claim.status}</b></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Recycling Partner</td>
                    <td>{claim.partner}</td>
                    <td style={{ fontWeight: 700 }}>Registration ID</td>
                    <td>{org?.registrationId || 'MH-EWR-2021-0047'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Facility Type</td>
                    <td>{org?.type || 'Processing Unit'}</td>
                    <td style={{ fontWeight: 700 }}>Facility Location</td>
                    <td>{org?.location || 'India'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Reporting Period</td>
                    <td>{claim.period}</td>
                    <td style={{ fontWeight: 700 }}>Assigned Lead Auditor</td>
                    <td>{claim.assignedReviewer || 'Unassigned'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Mass Balance */}
          {includeJourney && (
            <div className="cp-report-section">
              <h4>2. Material Mass Flow Balance</h4>
              <p style={{ fontSize: '.82rem', color: '#4f6b72', marginBottom: '.8rem' }}>
                Verification stages trace physical recovery from collection weighbridges to authorized dispatch destinations.
              </p>
              <table className="cp-report-table">
                <thead>
                  <tr>
                    <th>Flow Stage</th>
                    <th>Recorded Mass ({preferences.unit})</th>
                    <th>Baseline Delta</th>
                    <th>Status / Completeness</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><b>Collected</b></td>
                    <td>{claim.collected !== null ? `${claim.collected} t` : 'Data Unavailable'}</td>
                    <td>—</td>
                    <td>{claim.collected !== null ? 'Verified manifest' : 'Gap noted'}</td>
                  </tr>
                  <tr>
                    <td><b>Declared Claim</b></td>
                    <td><b>{claim.claimed} t</b></td>
                    <td>Baseline (100%)</td>
                    <td>Declared by Submitter</td>
                  </tr>
                  <tr>
                    <td><b>Received</b></td>
                    <td>{claim.received !== null ? `${claim.received} t` : 'Data Unavailable'}</td>
                    <td>{claim.received !== null ? `${claim.claimed - claim.received} t net diff` : '—'}</td>
                    <td>Weighbridge Ticket</td>
                  </tr>
                  <tr>
                    <td><b>Processed</b></td>
                    <td>{claim.processed !== null ? `${claim.processed} t` : 'Data Unavailable'}</td>
                    <td>—</td>
                    <td>Shredder Batch Log</td>
                  </tr>
                  <tr>
                    <td><b>Recovered</b></td>
                    <td>{claim.recovered !== null ? `${claim.recovered} t` : 'Data Unavailable'}</td>
                    <td>—</td>
                    <td>Secondary Recovery Ticket</td>
                  </tr>
                  <tr style={{ background: '#f5faf9' }}>
                    <td><b>Final Dispatched</b></td>
                    <td><b>{claim.dispatched !== null ? `${claim.dispatched} t` : 'Data Unavailable'}</b></td>
                    <td><b>{claim.dispatched !== null ? `${claim.claimed - claim.dispatched} t total gap` : '—'}</b></td>
                    <td>Chain of Custody</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Supporting Evidence */}
          {includeEvidence && (
            <div className="cp-report-section">
              <h4>3. Verified Supporting Evidence Dossier</h4>
              <table className="cp-report-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Stage</th>
                    <th>Classification</th>
                    <th>Quantity</th>
                    <th>Issuer / Source</th>
                    <th>Audit Finding</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceList.map((e) => (
                    <tr key={e.id}>
                      <td><code>{e.reference}</code></td>
                      <td>{e.stage}</td>
                      <td>{e.type}</td>
                      <td>{e.quantityTonnes !== null ? `${e.quantityTonnes} t` : '—'}</td>
                      <td>{e.source}</td>
                      <td>
                        {e.missing ? (
                          <span style={{ color: '#a33720', fontWeight: 700 }}>⚠️ Missing Document</span>
                        ) : (
                          <span style={{ color: '#087b70', fontWeight: 700 }}>✓ Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Section: Discrepancies */}
          {includeDiscrepancies && (
            <div className="cp-report-section">
              <h4>4. Logged Audit Discrepancies &amp; Findings</h4>
              {discrepancyList.length === 0 ? (
                <p style={{ fontSize: '.84rem', color: '#087b70' }}>✓ No discrepancies logged for this claim.</p>
              ) : (
                <table className="cp-report-table">
                  <thead>
                    <tr>
                      <th>Flag ID</th>
                      <th>Category</th>
                      <th>Investigation Description</th>
                      <th>Tolerance / Variance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discrepancyList.map((d) => (
                      <tr key={d.id}>
                        <td><code>{d.id}</code></td>
                        <td><b>{d.type}</b></td>
                        <td>
                          {d.description}<br />
                          <small style={{ color: '#4f6b72' }}>{d.detectionExplanation}</small>
                        </td>
                        <td>
                          {d.absoluteDiff !== null ? `${d.absoluteDiff} t` : 'Doc gap'}&nbsp;
                          {d.pctDiff !== null && `(${d.pctDiff}%)`}
                        </td>
                        <td><b>{d.status}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Section: Reviewer Notes */}
          {includeNotes && (
            <div className="cp-report-section">
              <h4>5. Auditor Concluding Memorandum</h4>
              <div style={{ background: '#f8faf9', borderLeft: '4px solid #0c2b33', padding: '1rem', fontStyle: claim.reviewerNotes ? 'normal' : 'italic' }}>
                {claim.reviewerNotes || 'No formal auditor notes recorded to date.'}
              </div>
            </div>
          )}

          {/* Section: Timeline */}
          {includeTimeline && (
            <div className="cp-report-section">
              <h4>6. Complete Activity Audit Trail</h4>
              <table className="cp-report-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Role</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {timelineList.map((t) => (
                    <tr key={t.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{t.timestamp.slice(0, 16).replace('T', ' ')}</td>
                      <td><b>{t.title}</b></td>
                      <td>{t.actorRole}</td>
                      <td>{t.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '3rem', borderTop: '1px solid #e0e8e6', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: '#4f6b72' }}>
            <span>CycleProof Verification Engine • WeMakeDevs Environmental Hack</span>
            <span>Page 1 of 1 • Certified Demonstration Document</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;
