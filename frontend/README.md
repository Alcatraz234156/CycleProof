# CycleProof — Environmental Claims Verification Platform

CycleProof is an environmental claim verification and evidence reconciliation platform focused on e-waste recycling, built for the **AWS Environmental Hacks** hackathon by WeMakeDevs.

This frontend application adapts and extends the **ShiftCool** liquid-glass design system (React 18 + TypeScript + Vite) to provide an evidence-backed audit and verification experience.

---

## 🌟 The Eight Core Features

1. **Activity Timeline (`ActivityTimeline.tsx`)**
   - Chronological audit log for each claim (and system-wide).
   - Distinct icons and color tokens for events: creation, evidence added, status changes, discrepancies detected, comments, resolutions.
   - Newest/oldest sort toggle, time-ago formatting, and interactive reviewer note additions.

2. **Notifications Center (`NotificationCenter.tsx`)**
   - Header bell icon with real-time unread badge counter.
   - Slide-in glass notification drawer with category filters: *All*, *Unread*, *Discrepancies*, and *Evidence Gaps*.
   - Mark as read/unread, mark all as read, and direct navigation links to flagged claims.

3. **Organizations & Facilities (`Organizations.tsx`)**
   - Complete registry of entities across the e-waste chain: Collection Centers, E-Waste Recyclers, Processing Facilities, Material Recovery Facilities, Dispatch Destinations.
   - Search by facility name, city, or registration ID; filter by facility type; sort by discrepancies.
   - Visual mass ratio bar (`recorded / claimed`) and drilldown links to associated claim dossiers.

4. **Signature Material Journey (`MaterialJourney.tsx`)**
   - 5-stage interactive mass balance flow: **Collected → Received → Processed → Recovered → Dispatched**.
   - Clear indicators for missing evidence documents and detected stage variances.
   - Clickable stage inspection detailing attached records and associated alerts.
   - Missing data is explicitly displayed as `—` (no data) and never silently coerced to zero.

5. **Discrepancy Explorer (`DiscrepancyExplorer.tsx`)**
   - Investigation workspace isolating variances, missing paperwork, and unreconciled losses.
   - Absolute and safe relative percentage variances (with zero-division protection).
   - Configurable demo tolerance thresholds with explicit "demo rule" labeling.
   - Status transitions (*Open*, *Under Review*, *Resolved*, *Needs Information*) with reviewer rationale recording.

6. **Settings & Preferences (`Settings.tsx`)**
   - Unit toggle (Metric Tonnes vs. Kilograms) affecting application-wide presentations.
   - Configurable demo discrepancy tolerance slider (0% to 20%).
   - Notification switches for new discrepancies, missing evidence, and overdue triage.
   - Reset demo state with an accessible confirmation dialog (`ConfirmDialog.tsx`).
   - Browser persistence via `localStorage`.

7. **Report Preview & Export Studio (`ReportPreview.tsx`)**
   - Comprehensive audit report generator for individual claims and batches.
   - Customizable inclusion checkboxes: summary, mass balance journey, evidence manifest, discrepancies, reviewer memorandum, and activity history.
   - Working client-side CSV downloads.
   - Print-friendly layout supporting browser PDF generation (`window.print()` with `@media print` styling).

8. **Interactive Onboarding Tour (`OnboardingTour.tsx`)**
   - 7-step guided walkthrough introducing CycleProof's philosophy and key workflows.
   - Automatically guides first-time users through the interface; restartable anytime from Settings.
   - Preserves completion status in browser storage.

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)

### Quick Start
```bash
# Navigate to the project directory
cd shift-cool-v6

# Install dependencies (if not already installed)
npm install

# Start the Vite development server
npm run dev

# Build for production
npm run build
```

Open `http://localhost:5173` in your browser to explore CycleProof.

---

## 🔒 Scope & Technical Boundaries

- **Strictly Frontend Only**: All data models, verification rules, timeline events, and CSV processing run entirely in the browser client using realistic, fictional mock datasets.
- **Zero Cloud / Backend Dependencies**: No AWS Lambda, API Gateway, DynamoDB, S3, or external APIs are connected.
- **Auditor Philosophy**: Discrepancies and evidence gaps are highlighted as prompts for human investigation, not automatic proof of fraud.
