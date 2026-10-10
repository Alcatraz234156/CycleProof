// CycleProof — Shared TypeScript types
// All interfaces used across the application live here.

export type ClaimStatus = 'Needs review' | 'In review' | 'Reconciled';
export type DiscrepancyStatus = 'Open' | 'Under Review' | 'Resolved' | 'Needs Information';
export type OrgType = 'Collection Center' | 'E-Waste Recycler' | 'Processing Facility' | 'Material Recovery Facility' | 'Dispatch Destination';
export type EventType =
  | 'claim_created'
  | 'evidence_added'
  | 'evidence_removed'
  | 'quantity_updated'
  | 'discrepancy_detected'
  | 'comment_added'
  | 'status_changed'
  | 'evidence_resolved'
  | 'review_completed';

export type NotifType = 'discrepancy' | 'missing_evidence' | 'review_required' | 'overdue' | 'resolved';

// A single stage in the material journey
export interface MaterialStage {
  label: 'Collected' | 'Received' | 'Processed' | 'Recovered' | 'Dispatched';
  quantityTonnes: number | null; // null = no data, not zero
  recordCount: number;
  evidenceMissing: boolean;
  referenceIds: string[];
}

// Evidence record attached to a claim
export interface EvidenceRecord {
  id: string;
  claimId: string;
  type: 'Weighbridge Ticket' | 'Processing Batch Summary' | 'Dispatch Receipt' | 'Collection Log' | 'Chain of Custody' | 'CSV Import';
  reference: string;
  stage: MaterialStage['label'];
  dateIso: string; // ISO date string
  quantityTonnes: number | null;
  source: string; // org or person who issued it
  missing: boolean; // true = expected but not yet uploaded
  notes?: string;
}

// A discrepancy flagged between claimed and recorded values
export interface Discrepancy {
  id: string;
  claimId: string;
  orgId: string;
  type: 'Quantity Mismatch' | 'Missing Evidence' | 'Duplicate Record' | 'Date Inconsistency' | 'Unreconciled Loss' | 'ID Mismatch';
  description: string;
  expectedValue: number | null;
  observedValue: number | null;
  unit: string;
  absoluteDiff: number | null;
  pctDiff: number | null; // null when denominator is 0 or values unavailable
  tolerancePct: number | null; // null = no tolerance applied
  detectionExplanation: string;
  relevantEvidenceIds: string[];
  status: DiscrepancyStatus;
  reviewerNotes: string;
  detectedAt: string; // ISO date
  resolvedAt?: string;
}

// Activity timeline event
export interface TimelineEvent {
  id: string;
  claimId: string;
  type: EventType;
  title: string;
  description: string;
  actorRole: string; // e.g. "Reviewer", "System", "Data Importer"
  timestamp: string; // ISO date
}

// A notification in the notification center
export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  claimId?: string;
  discrepancyId?: string;
  read: boolean;
  timestamp: string; // ISO date
}

// An organization (collection center, recycler, etc.)
export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  location: string;
  registrationId: string; // fictional
  contactName: string;
  claimIds: string[];
  totalClaimedTonnes: number;
  totalRecordedTonnes: number;
  openDiscrepancies: number;
  evidenceGaps: number;
  lastActivityIso: string;
  status: 'Active' | 'Under Review' | 'Suspended';
}

// The main claim record
export interface Claim {
  id: string;
  orgId: string;
  partner: string; // denormalized org name for quick display
  period: string; // e.g. "Oct 2026"
  submittedIso: string;
  status: ClaimStatus;
  // Material journey quantities (null = data not available, not zero)
  collected: number | null;
  claimed: number; // the declared quantity
  received: number | null;
  processed: number | null;
  recovered: number | null;
  dispatched: number | null;
  evidenceCount: number; // total expected
  evidenceAttached: number; // actually uploaded/linked
  reviewerNotes: string;
  assignedReviewer: string;
}

// CSV import preview row
export interface CsvImportRow {
  [key: string]: string;
}

// App-level preferences stored in localStorage
export interface UserPreferences {
  theme: 'light' | 'dark'; // future-proofed; only light implemented
  unit: 'tonnes' | 'kg';
  dateFormat: 'DD MMM YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
  showPctInDiscrepancies: boolean;
  discrepancyTolerancePct: number; // demo rule
  notifyDiscrepancies: boolean;
  notifyMissingEvidence: boolean;
  notifyOverdue: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
}

// Full app state shape persisted in localStorage
export interface AppState {
  claims: Claim[];
  organizations: Organization[];
  evidence: EvidenceRecord[];
  discrepancies: Discrepancy[];
  timeline: TimelineEvent[];
  notifications: Notification[];
  preferences: UserPreferences;
}

// Legacy ShiftCool exports preserved for backwards compatibility
export * from './heatRisk';
export * from './shift';
export * from './waterMap';

