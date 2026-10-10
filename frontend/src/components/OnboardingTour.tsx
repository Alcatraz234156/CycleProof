// CycleProof — OnboardingTour (Feature 8)
// Step-by-step interactive onboarding modal introducing the verification workflow and navigating across tabs.

import React, { useState } from 'react';
import type { UserPreferences } from '../types';
import type { AppStateReturn } from '../store/useAppState';

export interface OnboardingTourProps {
  preferences: UserPreferences;
  updatePreferences: AppStateReturn['updatePreferences'];
  onNavigate: (tab: string) => void;
  onComplete: () => void;
  onSkip: () => void;
}

interface TourStep {
  title: string;
  tag: string;
  targetTab: string;
  body: string;
  tip?: string;
}

const STEPS: TourStep[] = [
  {
    tag: 'WELCOME TO CYCLEPROOF',
    title: 'Proof, not just promises.',
    targetTab: 'OVERVIEW',
    body: 'CycleProof is an environmental claim verification and evidence reconciliation platform for e-waste recycling. It helps auditors compare self-reported sustainability claims against real weighbridge tickets, processing batch summaries, and dispatch manifests.',
    tip: 'Important: In CycleProof, an inconsistency is a trigger for human investigation, not automatic proof of misconduct.',
  },
  {
    tag: 'CORE CLAIM REGISTER',
    title: 'Audit-ready recycling claims.',
    targetTab: 'CLAIMS',
    body: 'Every claim submitted by a collection center or recycling cooperative is tracked in the Claims Explorer. You can immediately see the declared tonnage, verified dispatched mass, outstanding variances, and evidence completeness.',
  },
  {
    tag: 'SIGNATURE ELEMENT',
    title: 'The Material Journey flow.',
    targetTab: 'CLAIMS',
    body: 'CycleProof traces physical e-waste through five rigorous stages: Collected → Received → Processed → Recovered → Dispatched. Interactive stage nodes highlight quantity drops and missing documents at each handover point.',
  },
  {
    tag: 'INVESTIGATION WORKSPACE',
    title: 'Investigating discrepancies.',
    targetTab: 'DISCREPANCIES',
    body: 'The Discrepancy Explorer isolates quantity mismatches, missing paperwork, and unreconciled losses. Each alert displays mathematical differences, configurable demo tolerance thresholds, and detailed detection rationales.',
  },
  {
    tag: 'DATA INGESTION',
    title: 'Client-side Evidence Vault.',
    targetTab: 'EVIDENCE',
    body: 'Bring in real-world CSV files exported from facilities. Map columns in real time, validate rows, and bind them directly to claims—completely in-browser with zero server upload required.',
  },
  {
    tag: 'HUMAN OVERSIGHT',
    title: 'Review Workspace & Auditor decisions.',
    targetTab: 'REVIEW',
    body: 'CycleProof strictly separates automated algorithmic signals from human review decisions. Reviewers assign cases, examine timelines, record investigative notes, and commit authoritative status updates.',
  },
  {
    tag: 'GETTING STARTED',
    title: 'You are ready to explore!',
    targetTab: 'OVERVIEW',
    body: 'Explore the pre-loaded synthetic claims, upload new manifests, tweak tolerance thresholds in Settings, and export comprehensive audit dossiers.',
    tip: 'Tip: You can re-launch this tour or reset demo state anytime in Settings.',
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  preferences,
  updatePreferences,
  onNavigate,
  onComplete,
  onSkip,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(preferences.onboardingStep || 0);

  const step = STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      onNavigate(STEPS[nextIdx].targetTab);
    } else {
      updatePreferences({ onboardingCompleted: true });
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      onNavigate(STEPS[prevIdx].targetTab);
    }
  };

  const handleSkip = () => {
    updatePreferences({ onboardingCompleted: true });
    onSkip();
  };

  return (
    <div className="cp-onboarding-overlay" role="dialog" aria-modal="true">
      <div className="cp-onboarding-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem' }}>
          <span className="cp-onboarding-step">{step.tag}</span>
          <span style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--muted)' }}>
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
        </div>

        <h2 className="cp-onboarding-title">{step.title}</h2>
        <p className="cp-onboarding-body">{step.body}</p>

        {step.tip && (
          <div
            style={{
              background: 'rgba(255,182,39,.12)',
              borderLeft: '3px solid var(--sun)',
              padding: '.7rem .9rem',
              borderRadius: '10px',
              fontSize: '.8rem',
              color: 'var(--ink)',
              marginBottom: '1.5rem',
            }}
          >
            {step.tip}
          </div>
        )}

        {/* Step dots */}
        <div className="cp-onboarding-dots">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`cp-onboarding-dot ${
                i === currentStepIndex ? 'active' : i < currentStepIndex ? 'done' : ''
              }`}
            />
          ))}
        </div>

        <div className="cp-onboarding-actions">
          <button
            type="button"
            className="cp-text-button cp-onboarding-skip"
            onClick={handleSkip}
          >
            Skip walkthrough
          </button>

          <div className="cp-onboarding-nav">
            {currentStepIndex > 0 && (
              <button
                type="button"
                className="cp-small-button"
                style={{ background: 'rgba(12,43,51,.08)', color: 'var(--ink)' }}
                onClick={handlePrev}
              >
                ← Back
              </button>
            )}
            <button type="button" className="btn cp-small-button" onClick={handleNext}>
              {currentStepIndex === STEPS.length - 1 ? 'Start Exploring →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
