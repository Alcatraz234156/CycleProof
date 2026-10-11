
 // CycleProof — Central state store using localStorage persistence
// Provides a single useAppState hook consumed by App.tsx and passed down as props.

import { useState, useCallback, useEffect } from 'react';
import type {
  AppState,
  ClaimStatus,
  DiscrepancyStatus,
  Notification,
  TimelineEvent,
  UserPreferences,
} from '../types';
import { INITIAL_APP_STATE } from '../data/mockData';
import { fetchBootstrap } from '../services/api';

const STORAGE_KEY = 'cycleproof_state_v1';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_APP_STATE;

    const parsed = JSON.parse(raw) as AppState;

    // Merge preferences defensively — new keys added to DEFAULT get their defaults.
    return {
      ...INITIAL_APP_STATE,
      ...parsed,
      preferences: {
        ...INITIAL_APP_STATE.preferences,
        ...parsed.preferences,
      },
    };
  } catch {
    return INITIAL_APP_STATE;
  }
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — silently ignore.
  }
}

export function useAppState() {
  const [state, setStateRaw] = useState<AppState>(loadState);

  // Persist every change.
  useEffect(() => {
    saveState(state);
  }, [state]);

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw(updater);
  }, []);

  // ── AWS bootstrap: load data from the deployed backend ─────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadFromAWS() {
      try {
        const data = await fetchBootstrap();

        if (cancelled) return;

        setStateRaw((previous) => ({
          ...previous,
          claims: data.claims ?? previous.claims,
          organizations: data.organizations ?? previous.organizations,
          evidence: data.evidence ?? previous.evidence,
          discrepancies: data.discrepancies ?? previous.discrepancies,
          timeline: data.timeline ?? previous.timeline,
          notifications: data.notifications ?? previous.notifications,
        }));
      } catch (error) {
        console.error(
          'Failed to load CycleProof data from AWS. Keeping existing local data.',
          error
        );
      }
    }

    void loadFromAWS();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Claim actions ──────────────────────────────────────────────────────────

  const updateClaimStatus = useCallback(
    (claimId: string, status: ClaimStatus, actorRole: string) => {
      setState((prev) => {
        const now = new Date().toISOString();

        const newEvent: TimelineEvent = {
          id: `tl-${Date.now()}`,
          claimId,
          type: status === 'Reconciled' ? 'review_completed' : 'status_changed',
          title: `Status changed to: ${status}`,
          description: `Claim status updated to "${status}" by ${actorRole}.`,
          actorRole,
          timestamp: now,
        };

        return {
          ...prev,
          claims: prev.claims.map((c) =>
            c.id === claimId ? { ...c, status } : c
          ),
          timeline: [...prev.timeline, newEvent],
        };
      });
    },
    [setState]
  );

  const updateClaimReviewerNotes = useCallback(
    (claimId: string, notes: string, actorRole: string) => {
      setState((prev) => {
        const now = new Date().toISOString();

        const newEvent: TimelineEvent = {
          id: `tl-${Date.now()}`,
          claimId,
          type: 'comment_added',
          title: 'Reviewer note added',
          description: notes.length > 120 ? notes.slice(0, 117) + '…' : notes,
          actorRole,
          timestamp: now,
        };

        return {
          ...prev,
          claims: prev.claims.map((c) =>
            c.id === claimId ? { ...c, reviewerNotes: notes } : c
          ),
          timeline: [...prev.timeline, newEvent],
        };
      });
    },
    [setState]
  );

  const assignReviewer = useCallback(
    (claimId: string, reviewer: string) => {
      setState((prev) => ({
        ...prev,
        claims: prev.claims.map((c) =>
          c.id === claimId ? { ...c, assignedReviewer: reviewer } : c
        ),
      }));
    },
    [setState]
  );

  // ── Discrepancy actions ────────────────────────────────────────────────────

  const updateDiscrepancyStatus = useCallback(
    (discId: string, status: DiscrepancyStatus, notes: string) => {
      setState((prev) => {
        const disc = prev.discrepancies.find((d) => d.id === discId);
        if (!disc) return prev;

        const now = new Date().toISOString();

        const newEvent: TimelineEvent = {
          id: `tl-${Date.now()}`,
          claimId: disc.claimId,
          type: status === 'Resolved' ? 'evidence_resolved' : 'status_changed',
          title: `Discrepancy ${status.toLowerCase()}`,
          description: `Discrepancy ${disc.id} updated to "${status}".${
            notes ? ` Note: ${notes.slice(0, 80)}` : ''
          }`,
          actorRole: 'Reviewer',
          timestamp: now,
        };

        return {
          ...prev,
          discrepancies: prev.discrepancies.map((d) =>
            d.id === discId
              ? {
                  ...d,
                  status,
                  reviewerNotes: notes,
                  ...(status === 'Resolved' ? { resolvedAt: now } : {}),
                }
              : d
          ),
          timeline: [...prev.timeline, newEvent],
        };
      });
    },
    [setState]
  );

  // ── Notification actions ───────────────────────────────────────────────────

  const markNotificationRead = useCallback(
    (notifId: string) => {
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notifId ? { ...n, read: true } : n
        ),
      }));
    },
    [setState]
  );

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, [setState]);

  const markNotificationUnread = useCallback(
    (notifId: string) => {
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === notifId ? { ...n, read: false } : n
        ),
      }));
    },
    [setState]
  );

  const addNotification = useCallback(
    (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      setState((prev) => ({
        ...prev,
        notifications: [
          {
            ...notif,
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
            read: false,
          },
          ...prev.notifications,
        ],
      }));
    },
    [setState]
  );

  // ── Timeline actions ──────────────────────────────────────────────────────

  const addTimelineEvent = useCallback(
    (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
      setState((prev) => ({
        ...prev,
        timeline: [
          ...prev.timeline,
          {
            ...event,
            id: `tl-${Date.now()}`,
            timestamp: new Date().toISOString(),
          },
        ],
      }));
    },
    [setState]
  );

  // ── Preferences actions ───────────────────────────────────────────────────

  const updatePreferences = useCallback(
    (patch: Partial<UserPreferences>) => {
      setState((prev) => ({
        ...prev,
        preferences: { ...prev.preferences, ...patch },
      }));
    },
    [setState]
  );

  // ── CSV evidence import ───────────────────────────────────────────────────

  const importEvidenceFromCSV = useCallback(
    (claimId: string, rows: Record<string, string>[]) => {
      setState((prev) => {
        const now = new Date().toISOString();

        const newRecords = rows.map((row, i) => ({
          id: `ev-csv-${Date.now()}-${i}`,
          claimId,
          type: 'CSV Import' as const,
          reference: row['reference_id'] ?? `CSV-${i + 1}`,
          stage: (row['record_type'] ?? 'Received') as
            | 'Collected'
            | 'Received'
            | 'Processed'
            | 'Recovered'
            | 'Dispatched',
          dateIso: row['date'] ? `${row['date']}T00:00:00Z` : now,
          quantityTonnes: row['quantity_tonnes']
            ? parseFloat(row['quantity_tonnes'])
            : null,
          source: row['source'] ?? 'CSV Import',
          missing: false,
        }));

        const newEvent: TimelineEvent = {
          id: `tl-${Date.now()}`,
          claimId,
          type: 'evidence_added',
          title: 'Evidence imported from CSV',
          description: `${newRecords.length} record${
            newRecords.length !== 1 ? 's' : ''
          } imported via CSV upload.`,
          actorRole: 'Data Importer',
          timestamp: now,
        };

        return {
          ...prev,
          evidence: [...prev.evidence, ...newRecords],
          timeline: [...prev.timeline, newEvent],
        };
      });
    },
    [setState]
  );

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetToDemo = useCallback(() => {
    setStateRaw(INITIAL_APP_STATE);
    saveState(INITIAL_APP_STATE);
  }, []);

  return {
    state,

    // Claim actions.
    updateClaimStatus,
    updateClaimReviewerNotes,
    assignReviewer,

    // Discrepancy actions.
    updateDiscrepancyStatus,

    // Notification actions.
    markNotificationRead,
    markAllNotificationsRead,
    markNotificationUnread,
    addNotification,

    // Timeline actions.
    addTimelineEvent,

    // Preferences actions.
    updatePreferences,

    // CSV import.
    importEvidenceFromCSV,

    // Reset.
    resetToDemo,
  };
}

export type AppStateReturn = ReturnType<typeof useAppState>;
