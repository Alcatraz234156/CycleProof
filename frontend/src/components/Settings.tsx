// CycleProof — Settings & Preferences (Feature 6)
// Fully interactive configuration panel controlling display units, demo discrepancy tolerances,
// notification switches, and demo state reset with confirmation dialogs.

import React, { useState } from 'react';
import type { UserPreferences } from '../types';
import type { AppStateReturn } from '../store/useAppState';
import { ConfirmDialog } from './shared/ConfirmDialog';

export interface SettingsProps {
  preferences: UserPreferences;
  updatePreferences: AppStateReturn['updatePreferences'];
  resetToDemo: AppStateReturn['resetToDemo'];
  onRestartOnboarding: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  preferences,
  updatePreferences,
  resetToDemo,
  onRestartOnboarding,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedBanner, setSavedBanner] = useState('');

  const showFeedback = (msg: string) => {
    setSavedBanner(msg);
    setTimeout(() => setSavedBanner(''), 2500);
  };

  const handleUnitChange = (unit: 'tonnes' | 'kg') => {
    updatePreferences({ unit });
    showFeedback(`Unit changed to ${unit}.`);
  };

  const handleThemeChange = (theme: UserPreferences['theme']) => {
    updatePreferences({ theme });
    showFeedback(`Theme switched to ${theme === 'dark' ? 'Dark mode' : 'Light glass'}.`);
  };

  const handleDateFormatChange = (dateFormat: UserPreferences['dateFormat']) => {
    updatePreferences({ dateFormat });
    showFeedback(`Date format updated to ${dateFormat}.`);
  };

  const handleToleranceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    updatePreferences({ discrepancyTolerancePct: val });
  };

  const handleTogglePct = () => {
    updatePreferences({ showPctInDiscrepancies: !preferences.showPctInDiscrepancies });
  };

  const handleConfirmReset = () => {
    resetToDemo();
    setShowResetConfirm(false);
    showFeedback('Reset successful! All records restored to initial demo state.');
  };

  return (
    <section>
      <div className="cp-page-heading">
        <p className="cp-eyebrow">APPLICATION PREFERENCES</p>
        <h1>System Settings.</h1>
        <p className="lead">
          Adjust review tolerances, presentation units, verification heuristics, and client-side storage states.
        </p>
      </div>

      {savedBanner && (
        <div className="cp-notice" style={{ marginBottom: '1.2rem', padding: '.6rem 1rem', background: 'rgba(31,168,154,.15)', borderRadius: '12px' }}>
          ✓ {savedBanner}
        </div>
      )}

      <div className="cp-settings-sections">
        {/* Section 1: Appearance */}
        <div className="cp-settings-section">
          <h3>Display &amp; Appearance</h3>
          <div className="cp-settings-row">
            <div>
              <div className="cp-settings-label">Color Theme</div>
              <div className="cp-settings-desc">Choose between liquid glass light aesthetic and dark mode</div>
            </div>
            <div className="cp-radio-group">
              {(['light', 'dark'] as const).map((theme) => (
                <label key={theme} className="cp-radio-option">
                  <input
                    type="radio"
                    name="theme"
                    checked={preferences.theme === theme}
                    onChange={() => handleThemeChange(theme)}
                  />
                  {theme === 'light' ? 'Light Glass' : 'Dark'}
                </label>
              ))}
            </div>
          </div>

          <div className="cp-settings-row">
            <div>
              <div className="cp-settings-label">Mass Display Unit</div>
              <div className="cp-settings-desc">Select default unit for material flows and reports</div>
            </div>
            <div className="cp-radio-group">
              <label className="cp-radio-option">
                <input
                  type="radio"
                  name="unit"
                  checked={preferences.unit === 'tonnes'}
                  onChange={() => handleUnitChange('tonnes')}
                />
                Tonnes (t)
              </label>
              <label className="cp-radio-option">
                <input
                  type="radio"
                  name="unit"
                  checked={preferences.unit === 'kg'}
                  onChange={() => handleUnitChange('kg')}
                />
                Kilograms (kg)
              </label>
            </div>
          </div>

          <div className="cp-settings-row">
            <div>
              <div className="cp-settings-label">Date Presentation Format</div>
              <div className="cp-settings-desc">Display timestamp formatting across timelines and tables</div>
            </div>
            <select
              className="cp-sort-select"
              value={preferences.dateFormat}
              onChange={(e) => handleDateFormatChange(e.target.value as UserPreferences['dateFormat'])}
            >
              <option value="DD MMM YYYY">DD MMM YYYY (e.g., 07 Oct 2026)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (US standard)</option>
            </select>
          </div>
        </div>

        {/* Section 2: Demo Discrepancy Tolerance Rules */}
        <div className="cp-settings-section">
          <h3>Discrepancy Heuristics (Demo Engine)</h3>
          <div className="cp-demo-note">
            ⚠️ <b>Demo rule indicator:</b> Tolerances configured here are browser-side simulation thresholds. They do not constitute official environmental regulatory boundaries.
          </div>

          <div className="cp-settings-row" style={{ marginTop: '1rem' }}>
            <div style={{ flex: 1, paddingRight: '1rem' }}>
              <div className="cp-settings-label">
                Discrepancy Tolerance Threshold: <b>{preferences.discrepancyTolerancePct}%</b>
              </div>
              <div className="cp-settings-desc">
                Variances between declared and recorded tonnage exceeding this threshold are flagged as active review alerts.
              </div>
              <div style={{ marginTop: '.6rem' }}>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  className="cp-slider"
                  value={preferences.discrepancyTolerancePct}
                  onChange={handleToleranceChange}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--muted)', marginTop: '.2rem' }}>
                  <span>0% (Strict)</span>
                  <span>5% (Default)</span>
                  <span>20% (Permissive)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cp-settings-row">
            <div>
              <div className="cp-settings-label">Show Percentage Variances</div>
              <div className="cp-settings-desc">Display relative % difference alongside absolute tonnages in discrepancies</div>
            </div>
            <div
              className={`cp-toggle ${preferences.showPctInDiscrepancies ? 'on' : ''}`}
              onClick={handleTogglePct}
              role="switch"
              aria-checked={preferences.showPctInDiscrepancies}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleTogglePct(); }}
            />
          </div>
        </div>

        {/* Section 3: Notification Preferences */}
        <div className="cp-settings-section">
          <h3>Alert Notifications</h3>

          <div className="cp-settings-row">
            <div>
              <div className="cp-settings-label">Discrepancy Alerts</div>
              <div className="cp-settings-desc">Trigger notification when a new variance crosses tolerance</div>
            </div>
            <div
              className={`cp-toggle ${preferences.notifyDiscrepancies ? 'on' : ''}`}
              onClick={() => updatePreferences({ notifyDiscrepancies: !preferences.notifyDiscrepancies })}
              role="switch"
              aria-checked={preferences.notifyDiscrepancies}
              tabIndex={0}
            />
          </div>

          <div className="cp-settings-row">
            <div>
              <div className="cp-settings-label">Missing Evidence Alerts</div>
              <div className="cp-settings-desc">Notify reviewers when submitted claims have incomplete dossiers</div>
            </div>
            <div
              className={`cp-toggle ${preferences.notifyMissingEvidence ? 'on' : ''}`}
              onClick={() => updatePreferences({ notifyMissingEvidence: !preferences.notifyMissingEvidence })}
              role="switch"
              aria-checked={preferences.notifyMissingEvidence}
              tabIndex={0}
            />
          </div>

          <div className="cp-settings-row">
            <div>
              <div className="cp-settings-label">Overdue Review Reminders</div>
              <div className="cp-settings-desc">Alert when claims remain unassigned for over 72 hours</div>
            </div>
            <div
              className={`cp-toggle ${preferences.notifyOverdue ? 'on' : ''}`}
              onClick={() => updatePreferences({ notifyOverdue: !preferences.notifyOverdue })}
              role="switch"
              aria-checked={preferences.notifyOverdue}
              tabIndex={0}
            />
          </div>
        </div>

        {/* Section 4: Onboarding & Demo Reset */}
        <div className="cp-settings-section">
          <h3>Simulation Control &amp; Demo Storage</h3>
          <div className="cp-settings-row">
            <div>
              <div className="cp-settings-label">Interactive Guided Walkthrough</div>
              <div className="cp-settings-desc">Rerun the first-time tour showcasing the 8 core features of CycleProof</div>
            </div>
            <button
              type="button"
              className="btn cp-small-button"
              onClick={onRestartOnboarding}
            >
              Restart tour ↺
            </button>
          </div>

          <div className="cp-settings-row">
            <div>
              <div className="cp-settings-label" style={{ color: '#a33720' }}>
                Reset Synthetic Demo State
              </div>
              <div className="cp-settings-desc">
                Clear all imported CSVs, reviewer notes, status changes, and restored factory demo claims.
              </div>
            </div>
            <button
              type="button"
              className="cp-small-button"
              style={{ background: '#a33720', color: '#fff' }}
              onClick={() => setShowResetConfirm(true)}
            >
              Reset all data ⚠
            </button>
          </div>
        </div>
      </div>

      <p className="cp-disclaimer">
        Architecture note: CycleProof is operating in pure frontend demo mode. All preferences are persisted directly within your browser's LocalStorage.
      </p>

      {/* Confirmation modal for reset */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset Demo Dataset?"
        body="This will revert all claims, discrepancies, notes, and imported evidence back to their initial demo baseline. This browser-only action cannot be undone."
        confirmLabel="Yes, reset everything"
        destructive={true}
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </section>
  );
};

export default Settings;

