export interface Attachment {
  id: string;
  name: string;
  url: string; 
  type: string; 
  size: number; // in bytes
  uploadedAt: string; // ISO date string
  file?: File; // For new uploads not yet persisted
}

export interface Approval {
  approvedBy: string; 
  approvalDate: string; // ISO date string
  notes: string;
  decision: 'Approved' | 'Rejected';
}

export type RiskAssessmentStatus = 'Pending' | 'Under Review' | 'Needs Information' | 'Approved' | 'Rejected';

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
  aiRiskScore?: number;
  aiGeneratedSummary?: string; 
  aiSuggestedMitigations?: string; 
  aiRegulatoryConsiderations?: string; 
  approvalDetails?: Approval;
  lastModified: string; // ISO date string
  submissionTimestamp: number; // For sorting
  lastModifiedTimestamp: number; // For sorting
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Submitter' | 'Approver' | 'Admin';
}
