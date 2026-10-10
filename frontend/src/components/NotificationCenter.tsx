// CycleProof — NotificationCenter (Feature 2)
// Slide-in notification drawer with category filters, read/unread states, and direct navigation links.

import React, { useState, useMemo } from 'react';
import type { Notification, NotifType } from '../types';

export interface NotificationCenterProps {
  notifications: Notification[];
  open: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (tab: string, claimId?: string) => void;
}

type FilterTab = 'ALL' | 'UNREAD' | 'DISCREPANCIES' | 'EVIDENCE_GAPS';

function timeAgo(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function typeClass(type: NotifType): string {
  switch (type) {
    case 'discrepancy':
      return 'type-discrepancy';
    case 'missing_evidence':
      return 'type-missing_evidence';
    case 'review_required':
      return 'type-review_required';
    case 'overdue':
      return 'type-overdue';
    case 'resolved':
      return 'type-resolved';
    default:
      return '';
  }
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  open,
  onClose,
  onMarkRead,
  onMarkUnread,
  onMarkAllRead,
  onNavigate,
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'UNREAD') return !n.read;
      if (activeFilter === 'DISCREPANCIES') return n.type === 'discrepancy' || n.type === 'overdue';
      if (activeFilter === 'EVIDENCE_GAPS') return n.type === 'missing_evidence';
      return true;
    });
  }, [notifications, activeFilter]);

  const handleItemClick = (n: Notification) => {
    if (!n.read) onMarkRead(n.id);
    if (n.claimId) {
      onNavigate('CLAIMS', n.claimId);
    } else if (n.discrepancyId) {
      onNavigate('DISCREPANCIES');
    }
    onClose();
  };

  return (
    <>
      <div
        className={`cp-notif-backdrop ${open ? 'is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`cp-notif-panel ${open ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Notifications Center"
        aria-hidden={!open}
      >
        <div className="cp-notif-header">
          <h3>Notifications ({unreadCount} unread)</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              className="cp-text-button"
              style={{ fontSize: '.76rem', padding: '0 .4rem' }}
              onClick={onMarkAllRead}
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            className="cp-arrow"
            onClick={onClose}
            aria-label="Close notification panel"
            style={{ width: '28px', height: '28px', fontSize: '.9rem' }}
          >
            ✕
          </button>
        </div>

        <div className="cp-notif-filters">
          <div className="cp-filter-row" style={{ margin: 0 }}>
            <button
              type="button"
              className={activeFilter === 'ALL' ? 'active' : ''}
              onClick={() => setActiveFilter('ALL')}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={activeFilter === 'UNREAD' ? 'active' : ''}
              onClick={() => setActiveFilter('UNREAD')}
            >
              Unread ({unreadCount})
            </button>
            <button
              type="button"
              className={activeFilter === 'DISCREPANCIES' ? 'active' : ''}
              onClick={() => setActiveFilter('DISCREPANCIES')}
            >
              Discrepancies
            </button>
            <button
              type="button"
              className={activeFilter === 'EVIDENCE_GAPS' ? 'active' : ''}
              onClick={() => setActiveFilter('EVIDENCE_GAPS')}
            >
              Evidence gaps
            </button>
          </div>
        </div>

        <div className="cp-notif-list">
          {filteredList.length === 0 ? (
            <div className="cp-empty" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ fontWeight: 600, color: 'var(--ink)' }}>No notifications</p>
              <small className="cp-muted">You are up to date on all items in this filter.</small>
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                className={`cp-notif-item ${item.read ? 'is-read' : 'unread'} ${typeClass(item.type)}`}
                onClick={() => handleItemClick(item)}
              >
                <div className={`cp-notif-dot ${item.read ? 'hidden' : ''}`} />
                <div className="cp-notif-body">
                  <b>{item.title}</b>
                  <p>{item.body}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="cp-notif-time">{timeAgo(item.timestamp)}</span>
                    <button
                      type="button"
                      className="cp-notif-unread-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.read) onMarkUnread(item.id);
                        else onMarkRead(item.id);
                      }}
                    >
                      {item.read ? 'Mark unread' : 'Mark read'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
};

export default NotificationCenter;

