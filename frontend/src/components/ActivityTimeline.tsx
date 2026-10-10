// CycleProof — ActivityTimeline (Feature 1)
// Displays a chronological history of claim lifecycle events with sorting, filtering, and note-adding.

import React, { useState, useMemo } from 'react';
import type { TimelineEvent, EventType } from '../types';

export interface ActivityTimelineProps {
  events: TimelineEvent[];
  claimId?: string;
  onAddComment?: (claimId: string, comment: string) => void;
  showAll?: boolean;
  defaultOrder?: 'newest' | 'oldest';
}

function formatDate(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function timeAgo(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface EventMeta {
  icon: string;
  badgeBg: string;
  badgeColor: string;
}

const EVENT_META: Record<EventType, EventMeta> = {
  claim_created: { icon: '📋', badgeBg: 'rgba(42,111,219,.15)', badgeColor: 'var(--water)' },
  evidence_added: { icon: '📎', badgeBg: 'rgba(31,168,154,.15)', badgeColor: '#087b70' },
  evidence_removed: { icon: '🗑️', badgeBg: 'rgba(229,80,43,.15)', badgeColor: '#a33720' },
  quantity_updated: { icon: '⚖️', badgeBg: 'rgba(255,182,39,.18)', badgeColor: '#7a5500' },
  discrepancy_detected: { icon: '⚠️', badgeBg: 'rgba(229,80,43,.15)', badgeColor: '#a33720' },
  comment_added: { icon: '💬', badgeBg: 'rgba(12,43,51,.08)', badgeColor: 'var(--ink)' },
  status_changed: { icon: '🔄', badgeBg: 'rgba(42,111,219,.15)', badgeColor: 'var(--water)' },
  evidence_resolved: { icon: '✓', badgeBg: 'rgba(31,168,154,.2)', badgeColor: '#087b70' },
  review_completed: { icon: '✅', badgeBg: 'rgba(31,168,154,.25)', badgeColor: '#087b70' },
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  events,
  claimId,
  onAddComment,
  showAll = false,
  defaultOrder = 'newest',
}) => {
  const [order, setOrder] = useState<'newest' | 'oldest'>(defaultOrder);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredEvents = useMemo(() => {
    let list = showAll || !claimId ? events : events.filter((e) => e.claimId === claimId);
    return [...list].sort((a, b) => {
      const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      return order === 'newest' ? diff : -diff;
    });
  }, [events, claimId, showAll, order]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !onAddComment || !claimId) return;
    setSubmitting(true);
    onAddComment(claimId, newComment.trim());
    setNewComment('');
    setSubmitting(false);
  };

  return (
    <div className="cp-timeline-wrapper">
      <div className="cp-tl-order-toggle">
        <button
          type="button"
          className={order === 'newest' ? 'active' : ''}
          onClick={() => setOrder('newest')}
        >
          ↓ Newest first
        </button>
        <button
          type="button"
          className={order === 'oldest' ? 'active' : ''}
          onClick={() => setOrder('oldest')}
        >
          ↑ Oldest first
        </button>
      </div>

      {filteredEvents.length === 0 ? (
        <p className="cp-empty" style={{ padding: '1rem 0' }}>No activity recorded yet for this claim.</p>
      ) : (
        <div className="cp-timeline">
          {filteredEvents.map((evt) => {
            const meta = EVENT_META[evt.type] || { icon: '•', badgeBg: 'rgba(12,43,51,.08)', badgeColor: 'var(--ink)' };
            return (
              <div key={evt.id} className="cp-tl-item">
                <div
                  className="cp-tl-dot"
                  style={{ background: meta.badgeBg, color: meta.badgeColor }}
                  title={evt.type}
                >
                  {meta.icon}
                </div>
                <div className="cp-tl-content">
                  <div className="cp-tl-title">{evt.title}</div>
                  <div className="cp-tl-desc">{evt.description}</div>
                  <div className="cp-tl-footer">
                    <span className="cp-tl-role">{evt.actorRole}</span>
                    <span className="cp-tl-time" title={formatDate(evt.timestamp)}>
                      {timeAgo(evt.timestamp)}
                    </span>
                    {showAll && evt.claimId && (
                      <span className="cp-detail-id" style={{ margin: 0, fontSize: '.68rem' }}>
                        {evt.claimId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onAddComment && claimId && (
        <form onSubmit={handleAddComment} className="cp-tl-add-note">
          <label htmlFor={`tl-note-${claimId}`} className="cp-eyebrow" style={{ display: 'block', marginBottom: '.4rem' }}>
            ADD REVIEWER NOTE
          </label>
          <textarea
            id={`tl-note-${claimId}`}
            className="cp-tl-textarea"
            placeholder="Record an investigation update, communication with facility, or verification finding…"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.5rem' }}>
            <button
              type="submit"
              className="btn cp-small-button"
              disabled={submitting || !newComment.trim()}
              style={{ padding: '.5rem 1.1rem' }}
            >
              Post note
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ActivityTimeline;

