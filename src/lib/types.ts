
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number; // in bytes
  uploadedAt: string; // ISO date string
  file?: File; // For new uploads not yet persisted
}

export type ApprovalDecision = 'Approved' | 'Rejected' | 'Needs Information';
export type ApprovalLevel = 'Crewing Standards and Oversight' | 'Senior Director' | 'Director General';

export interface ApprovalStep {
  level: ApprovalLevel;
  decision?: ApprovalDecision;
  userId?: string; // Optional: ID of the user who made the decision
  userName?: string; // Optional: Name of the user
  date?: string; // ISO date string of when the decision was made
  notes?: string;
}

export type RiskAssessmentStatus =
  | 'Draft'
  | 'Pending Crewing Standards and Oversight'
  | 'Pending Senior Director'
  | 'Pending Director General'
  | 'Needs Information'
  | 'Approved' // Final approval by Director General
  | 'Rejected'; // If rejected at any level

export interface RiskAssessment {
  id: string;
  referenceNumber: string;
  vesselName: string;
  vesselIMO?: string;
  voyageDetails: string;
  reasonForRequest: string;
  personnelShortages: string;
  proposedOperationalDeviations: string;
  submittedBy: string;
  submissionDate: string; // ISO date string
  status: RiskAssessmentStatus;
  attachments: Attachment[];
  approvalSteps: ApprovalStep[]; // Array to track each step, replaces approvalDetails
  aiRiskScore?: number;
  aiGeneratedSummary?: string;
  aiSuggestedMitigations?: string;
  aiRegulatoryConsiderations?: string;
  lastModified: string; // ISO date string
  submissionTimestamp: number; // For sorting
  lastModifiedTimestamp: number; // For sorting
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Submitter' | 'Approver' | 'Admin' | ApprovalLevel; // Approver role can be more specific
}
