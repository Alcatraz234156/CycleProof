// CycleProof — ReviewWorkspace (Review Workspace Core Screen)
// Auditor command deck with triage queue, reviewer assignment, integrated material journey,
// activity timeline, and strict separation between algorithmic flags and human decisions.

import React, { useState, useMemo } from 'react';
import type { AppStateReturn } from '../store/useAppState';
import type { ClaimStatus } from '../types';
import { MaterialJourney } from './MaterialJourney';
import { ActivityTimeline } from './ActivityTimeline';

export interface ReviewWorkspaceProps {
  state: AppStateReturn['state'];
  updateClaimStatus: AppStateReturn['updateClaimStatus'];
  updateClaimReviewerNotes: AppStateReturn['updateClaimReviewerNotes'];
  assignReviewer: AppStateReturn['assignReviewer'];
  addTimelineEvent: AppStateReturn['addTimelineEvent'];
  onClaimSelect: (id: string) => void;
  onNavigate: (tab: string) => void;
}

const REVIEWERS = ['Aarav Bose', 'Sunita Reddy', 'Meera Patel'];

function timeAgo(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const ReviewWorkspace: React.FC<ReviewWorkspaceProps> = ({
  state,
  updateClaimStatus,
  updateClaimReviewerNotes,
  assignReviewer,
  addTimelineEvent,
  onClaimSelect,
  onNavigate,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    state.claims.find((c) => c.status === 'Needs review')?.id ?? state.claims[0]?.id ?? ''
  );
  const [notesDraft, setNotesDraft] = useState<string>('');
  const [statusSelect, setStatusSelect] = useState<ClaimStatus>('Needs review');
  const [notesSaved, setNotesSaved] = useState(false);

  const selectedClaim = useMemo(
    () => state.claims.find((c) => c.id === selectedId) ?? state.claims[0],
    [state.claims, selectedId]
  );

  // Sync draft notes whenever selected claim changes
  React.useEffect(() => {
    if (selectedClaim) {
      setNotesDraft(selectedClaim.reviewerNotes || '');
      setStatusSelect(selectedClaim.status);
    }
  }, [selectedClaim]);

  // Claims requiring attention
  const needsReviewList = useMemo(
    () => state.claims.filter((c) => c.status === 'Needs review'),
    [state.claims]
  );

  const inReviewList = useMemo(
    () => state.claims.filter((c) => c.status === 'In review'),
    [state.claims]
  );

  const claimDiscrepancies = useMemo(
    () => state.discrepancies.filter((d) => d.claimId === selectedClaim?.id),
    [state.discrepancies, selectedClaim]
  );

  const claimEvidence = useMemo(
    () => state.evidence.filter((e) => e.claimId === selectedClaim?.id),
    [state.evidence, selectedClaim]
  );

  const handleSaveNotes = () => {
    if (!selectedClaim) return;
    updateClaimReviewerNotes(selectedClaim.id, notesDraft, 'Lead Auditor');
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };

  const handleUpdateStatus = () => {
    if (!selectedClaim) return;
    updateClaimStatus(selectedClaim.id, statusSelect, 'Lead Auditor');
  };

  const handleAddTimelineNote = (cId: string, text: string) => {
    addTimelineEvent({
      claimId: cId,
      type: 'comment_added',
      title: 'Auditor memorandum added',
      description: text,
      actorRole: 'Reviewer',
    });
  };

  return (
    <section>
      <div className="cp-page-heading">
        <p className="cp-eyebrow">HUMAN-IN-THE-LOOP VERIFICATION</p>
        <h1>Review Workspace.</h1>
        <p className="lead">
          Investigate flagged inconsistencies, examine material chain transitions, coordinate evidentiary findings, and record formal reconciliation decisions.
        </p>
      </div>

      <div className="cp-review-disclaimer">
        ⚖️ <b>Audit Protocol Directive:</b> Algorithmic flags highlight variances requiring investigation. System detections are never automatic determinations of fraud or procedural fault. Formal certification requires affirmative human reconciliation.
      </div>

      <div className="cp-review-layout">
        {/* Left Column: Triage Queues */}
        <div className="cp-review-queue">
          <div className="cp-review-section-head">
            CRITICAL ATTENTION REQUIRED ({needsReviewList.length})
          </div>

          {needsReviewList.length === 0 ? (
            <p className="cp-empty" style={{ padding: '.5rem 0' }}>All pending claims triaged.</p>
          ) : (
            needsReviewList.map((c) => {
              const isSelected = c.id === selectedClaim?.id;
              const openDiscs = state.discrepancies.filter((d) => d.claimId === c.id && d.status === 'Open').length;
              const missingDocs = c.evidenceCount - c.evidenceAttached;

              return (
                <div
                  key={c.id}
                  className={`cp-review-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="cp-review-card-id">{c.id}</span>
                    <span className="cp-status needs-review">Needs review</span>
                  </div>
                  <h4 className="cp-review-card-partner">{c.partner}</h4>

                  <div className="cp-review-card-stats">
                    <span><b>{c.claimed} t</b> claimed</span>
                    <span style={{ color: openDiscs > 0 ? '#a33720' : 'inherit' }}>
                      <b>{openDiscs}</b> open alert{openDiscs !== 1 ? 's' : ''}
                    </span>
                    <span style={{ color: missingDocs > 0 ? '#a33720' : 'inherit' }}>
                      <b>{missingDocs}</b> missing doc{missingDocs !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="cp-review-card-actions" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="cp-review-assign"
                      value={c.assignedReviewer || ''}
                      onChange={(e) => assignReviewer(c.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {REVIEWERS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="cp-small-button"
                      onClick={() => updateClaimStatus(c.id, 'In review', 'Reviewer')}
                    >
                      Move to In Review →
                    </button>
                  </div>
                </div>
              );
            })
          )}

          <div className="cp-review-section-head" style={{ marginTop: '2rem' }}>
            ACTIVE INVESTIGATIONS ({inReviewList.length})
          </div>

          {inReviewList.length === 0 ? (
            <p className="cp-empty" style={{ padding: '.5rem 0' }}>No active investigations ongoing.</p>
          ) : (
            inReviewList.map((c) => {
              const isSelected = c.id === selectedClaim?.id;
              return (
                <div
                  key={c.id}
                  className={`cp-review-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="cp-review-card-id">{c.id}</span>
                    <span className="cp-status in-review">In review</span>
                  </div>
                  <h4 className="cp-review-card-partner">{c.partner}</h4>

                  <div className="cp-review-card-stats">
                    <span>Assigned: <b>{c.assignedReviewer || 'Unassigned'}</b></span>
                    <span>Submitted {timeAgo(c.submittedIso)}</span>
                  </div>

                  <div className="cp-review-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="cp-small-button"
                      style={{ background: '#087b70' }}
                      onClick={() => updateClaimStatus(c.id, 'Reconciled', 'Lead Auditor')}
                    >
                      Mark Reconciled ✓
                    </button>
                    <button
                      type="button"
                      className="cp-text-button"
                      style={{ fontSize: '.75rem', padding: '0 .4rem' }}
                      onClick={() => updateClaimStatus(c.id, 'Needs review', 'Lead Auditor')}
                    >
                      Revert
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Claim Dossier & Workbench */}
        {selectedClaim ? (
          <div className="cp-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p className="cp-eyebrow">ACTIVE INVESTIGATION DOSSIER</p>
                <div className="cp-detail-id" style={{ fontSize: '1.2rem', margin: '0 0 .2rem' }}>
                  {selectedClaim.id}
                </div>
                <h3>{selectedClaim.partner}</h3>
                <p className="cp-muted" style={{ margin: 0 }}>
                  Reporting period: {selectedClaim.period} • Assigned Auditor: <b>{selectedClaim.assignedReviewer || 'None'}</b>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                <span className={`cp-status ${selectedClaim.status.toLowerCase().replace(' ', '-')}`}>
                  {selectedClaim.status}
                </span>
                <button
                  type="button"
                  className="btn cp-small-button"
                  onClick={() => {
                    onClaimSelect(selectedClaim.id);
                    onNavigate('CLAIMS');
                  }}
                >
                  Inspect in Claims ↗
                </button>
              </div>
            </div>

            {/* Material Journey Flow */}
            <div style={{ margin: '1.5rem 0' }}>
              <p className="cp-eyebrow">MATERIAL FLOW RECONCILIATION</p>
              <MaterialJourney
                claim={selectedClaim}
                evidence={claimEvidence}
                discrepancies={claimDiscrepancies}
              />
            </div>

            {/* Algorithmic Flags vs Human Decision Section */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <p className="cp-eyebrow">AUTOMATED DETECTIONS &amp; AUDIT SIGNALS</p>
              {claimDiscrepancies.length === 0 ? (
                <div style={{ background: 'rgba(31,168,154,.1)', padding: '.8rem 1rem', borderRadius: '12px', fontSize: '.84rem', color: '#087b70' }}>
                  ✓ No automated variance flags detected for this claim. All records reconcile within tolerance.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '.6rem' }}>
                  {claimDiscrepancies.map((disc) => (
                    <div
                      key={disc.id}
                      style={{
                        background: 'rgba(255,255,255,.5)',
                        border: '1px solid var(--line)',
                        borderLeft: `4px solid ${disc.status === 'Resolved' ? '#1fa89a' : '#e5502b'}`,
                        borderRadius: '12px',
                        padding: '.8rem 1rem',
                        fontSize: '.84rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.3rem' }}>
                        <b>{disc.type} ({disc.id})</b>
                        <span className={`cp-status ${disc.status.toLowerCase().replace(' ', '-')}`}>
                          {disc.status}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 .4rem', color: 'var(--muted)' }}>{disc.description}</p>
                      <small style={{ color: 'var(--ink)', fontSize: '.75rem' }}>
                        <b>Explanation:</b> {disc.detectionExplanation}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Human Verification Findings Notes */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
              <p className="cp-eyebrow">AUDITOR INVESTIGATION RECORD</p>
              <textarea
                className="cp-reviewer-notes"
                placeholder="Document your findings, conversations with the recyclers, justification for variances, or reasons for closure…"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={4}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.8rem', flexWrap: 'wrap', gap: '.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <button
                    type="button"
                    className="btn cp-small-button"
                    onClick={handleSaveNotes}
                  >
                    Save audit notes
                  </button>
                  {notesSaved && <span style={{ fontSize: '.8rem', color: '#087b70', fontWeight: 700 }}>✓ Notes saved!</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <span style={{ fontSize: '.8rem', color: 'var(--muted)', fontWeight: 600 }}>Decision:</span>
                  <select
                    className="cp-sort-select"
                    value={statusSelect}
                    onChange={(e) => setStatusSelect(e.target.value as ClaimStatus)}
                  >
                    <option value="Needs review">Needs review</option>
                    <option value="In review">In review</option>
                    <option value="Reconciled">Reconciled</option>
                  </select>
                  <button
                    type="button"
                    className="cp-small-button"
                    style={{ background: 'var(--ink)' }}
                    onClick={handleUpdateStatus}
                  >
                    Commit status
                  </button>
                </div>
              </div>
            </div>

            {/* Activity History for this Claim */}
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
              <p className="cp-eyebrow">AUDIT TRAIL &amp; TIMELINE</p>
              <ActivityTimeline
                events={state.timeline}
                claimId={selectedClaim.id}
                onAddComment={handleAddTimelineNote}
              />
            </div>
          </div>
        ) : (
          <div className="cp-panel" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <p style={{ fontWeight: 600 }}>Select a claim to review</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default ReviewWorkspace;
