// CycleProof — Complete Frontend Implementation (Root App Component)
// Fully integrates all 8 required features and core application screens with shared state,
// liquid-glass styling, real-time client-side synchronization, and zero backend dependencies.

import React, { useState, useCallback, useMemo } from 'react';
import { useAppState } from './store/useAppState';
import { Header } from './components/Header';
import type { Tab } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ClaimsExplorer } from './components/ClaimsExplorer';
import { EvidenceManager } from './components/EvidenceManager';
import { DiscrepancyExplorer } from './components/DiscrepancyExplorer';
import { Organizations } from './components/Organizations';
import { Analytics } from './components/Analytics';
import { ReviewWorkspace } from './components/ReviewWorkspace';
import { Settings } from './components/Settings';
import { NotificationCenter } from './components/NotificationCenter';
import { ReportPreview } from './components/ReportPreview';
import { OnboardingTour } from './components/OnboardingTour';

export const App: React.FC = () => {
  const {
    state,
    updateClaimStatus,
    updateClaimReviewerNotes,
    assignReviewer,
    updateDiscrepancyStatus,
    markNotificationRead,
    markAllNotificationsRead,
    markNotificationUnread,
    addTimelineEvent,
    updatePreferences,
    importEvidenceFromCSV,
    resetToDemo,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [selectedClaimId, setSelectedClaimId] = useState<string>(
    state.claims[0]?.id ?? 'CP-2026-014'
  );
  const [notifOpen, setNotifOpen] = useState(false);
  const [reportClaimId, setReportClaimId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    !state.preferences.onboardingCompleted
  );

  const unreadCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications]
  );

  const handleTabChange = useCallback((nextTab: Tab) => {
    setActiveTab(nextTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigate = useCallback((destination: string, claimId?: string) => {
    if (claimId) {
      setSelectedClaimId(claimId);
    }

    const norm = destination.toUpperCase();
    if (norm === 'OVERVIEW') setActiveTab('OVERVIEW');
    else if (norm === 'CLAIMS') setActiveTab('CLAIMS');
    else if (norm === 'EVIDENCE') setActiveTab('EVIDENCE');
    else if (norm === 'DISCREPANCIES') setActiveTab('DISCREPANCIES');
    else if (norm === 'ORGS' || norm === 'ORGANIZATIONS') setActiveTab('ORGS');
    else if (norm === 'ANALYTICS') setActiveTab('ANALYTICS');
    else if (norm === 'REVIEW') setActiveTab('REVIEW');
    else if (norm === 'SETTINGS') setActiveTab('SETTINGS');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClaimSelect = useCallback((claimId: string) => {
    setSelectedClaimId(claimId);
    setActiveTab('CLAIMS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Mouse movement tracking for ambient liquid glass spotlight effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty('--mouse-x', `${x}px`);
    el.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  return (
    <div
      className="app cycleproof"
      data-theme={state.preferences.theme}
      onMouseMove={handleMouseMove}
    >
      {/* Ambient background light orbs & micro-grid */}
      <div className="ambient" aria-hidden="true">
        <div className="ambient-grid" />
        <div className="ambient-spotlight" />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      <div className="wrap">
        {/* Navigation Header */}
        <Header
          active={activeTab}
          onChange={handleTabChange}
          unreadCount={unreadCount}
          onBellClick={() => setNotifOpen(true)}
          theme={state.preferences.theme}
          onToggleTheme={() =>
            updatePreferences({
              theme: state.preferences.theme === 'dark' ? 'light' : 'dark',
            })
          }
        />

        {/* Main Content Area */}
        <main id="main" key={activeTab}>
          {activeTab === 'OVERVIEW' && (
            <Dashboard
              state={state}
              onNavigate={handleNavigate}
              onClaimSelect={handleClaimSelect}
            />
          )}

          {activeTab === 'CLAIMS' && (
            <ClaimsExplorer
              state={state}
              selectedClaimId={selectedClaimId}
              onSelectClaim={setSelectedClaimId}
              updateClaimStatus={updateClaimStatus}
              updateClaimReviewerNotes={updateClaimReviewerNotes}
              onNavigate={handleNavigate}
              onOpenReport={(id: string) => setReportClaimId(id)}
            />
          )}

          {activeTab === 'EVIDENCE' && (
            <EvidenceManager
              state={state}
              importEvidenceFromCSV={importEvidenceFromCSV}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'DISCREPANCIES' && (
            <DiscrepancyExplorer
              state={state}
              updateDiscrepancyStatus={updateDiscrepancyStatus}
              onClaimSelect={handleClaimSelect}
              onNavigate={handleNavigate}
              preferences={state.preferences}
            />
          )}

          {activeTab === 'ORGS' && (
            <Organizations
              state={state}
              onClaimSelect={handleClaimSelect}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'ANALYTICS' && (
            <Analytics state={state} />
          )}

          {activeTab === 'REVIEW' && (
            <ReviewWorkspace
              state={state}
              updateClaimStatus={updateClaimStatus}
              updateClaimReviewerNotes={updateClaimReviewerNotes}
              assignReviewer={assignReviewer}
              addTimelineEvent={addTimelineEvent}
              onClaimSelect={handleClaimSelect}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'SETTINGS' && (
            <Settings
              preferences={state.preferences}
              updatePreferences={updatePreferences}
              resetToDemo={resetToDemo}
              onRestartOnboarding={() => setShowOnboarding(true)}
            />
          )}
        </main>

        {/* Global Footer */}
        <footer className="foot">
          <div>
            <b>CycleProof © 2026</b> &nbsp;•&nbsp; Built for AWS Environmental Hacks by WeMakeDevs
          </div>
          <div>
            Evidence-led reconciliation platform &nbsp;•&nbsp; Pure frontend execution &nbsp;•&nbsp; Synthetic demo data
          </div>
        </footer>
      </div>

      {/* Slide-in Notifications Center (Feature 2) */}
      <NotificationCenter
        notifications={state.notifications}
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onMarkRead={markNotificationRead}
        onMarkUnread={markNotificationUnread}
        onMarkAllRead={markAllNotificationsRead}
        onNavigate={handleNavigate}
      />

      {/* Report Preview & Export Modal (Feature 7) */}
      {reportClaimId !== null && (
        <ReportPreview
          state={state}
          claimId={reportClaimId}
          onClose={() => setReportClaimId(null)}
          preferences={state.preferences}
        />
      )}

      {/* First-Time Onboarding Tour (Feature 8) */}
      {showOnboarding && (
        <OnboardingTour
          preferences={state.preferences}
          updatePreferences={updatePreferences}
          onNavigate={handleNavigate}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
};

export default App;
