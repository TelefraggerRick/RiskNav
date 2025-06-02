
import type { Timestamp } from 'firebase/firestore';

export interface Attachment {
  id: string; // Can be client-generated for new items, or from Firestore for existing
  name: string;
  url: string; // Cloud Storage URL after upload
  type: string;
  size: number; // in bytes
  uploadedAt: string; // ISO date string
  file?: File; // For new uploads not yet persisted, removed after upload
  storagePath?: string; // Optional: to help with deleting from Cloud Storage
}

export type YesNoOptional = 'Yes' | 'No' | undefined;

export interface ExemptionIndividualAssessmentData {
  employeeName?: string;
  certificateHeld?: string;
  requiredCertificate?: string;
  coDeptHeadSupportExemption?: YesNoOptional;
  deptHeadConfidentInIndividual?: YesNoOptional;
  deptHeadConfidenceReason?: string;
  employeeFamiliarizationProvided?: YesNoOptional;
  workedInDepartmentLast12Months?: YesNoOptional;
  workedInDepartmentDetails?: string;
  similarResponsibilityExperience?: YesNoOptional;
  similarResponsibilityDetails?: string;
  individualHasRequiredSeaService?: YesNoOptional;
  individualWorkingTowardsCertification?: YesNoOptional;
  certificationProgressSummary?: string;
}

export interface OperationalConsiderationsData {
  // Crew/Team
  requestCausesVacancyElsewhere?: YesNoOptional;
  crewCompositionSufficientForSafety?: YesNoOptional;
  detailedCrewCompetencyAssessment?: string;
  crewContinuityAsPerProfile?: YesNoOptional;
  crewContinuityDetails?: string;
  // Voyage
  specialVoyageConsiderations?: string;
  reductionInVesselProgramRequirements?: YesNoOptional;
  rocNotificationOfLimitations?: YesNoOptional;
}


export type ApprovalDecision = 'Approved' | 'Rejected' | 'Needs Information';
export type ApprovalLevel = 'Crewing Standards and Oversight' | 'Senior Director' | 'Director General';

export interface ApprovalStep {
  level: ApprovalLevel;
  decision?: ApprovalDecision;
  userId?: string;
  userName?: string;
  date?: string; // ISO date string
  notes?: string;
}

export type RiskAssessmentStatus =
  | 'Draft'
  | 'Pending Crewing Standards and Oversight'
  | 'Pending Senior Director'
  | 'Pending Director General'
  | 'Needs Information'
  | 'Approved'
  | 'Rejected';

export type VesselDepartment = 'Navigation' | 'Deck' | 'Engine Room' | 'Logistics' | 'Other';
export type VesselRegion = 'Atlantic' | 'Central' | 'Western' | 'Arctic';

export interface RiskAssessment extends ExemptionIndividualAssessmentData, OperationalConsiderationsData {
  id: string; // Firestore document ID
  referenceNumber: string;
  maritimeExemptionNumber?: string;
  vesselName: string;
  imoNumber?: string;
  department?: VesselDepartment;
  region?: VesselRegion;
  voyageDetails: string;
  reasonForRequest: string;
  personnelShortages: string;
  proposedOperationalDeviations: string;
  submittedBy: string;
  submissionDate: string; // ISO string
  status: RiskAssessmentStatus;
  attachments: Attachment[];
  approvalSteps: ApprovalStep[];
  aiRiskScore?: number;
  aiGeneratedSummary?: string;
  aiSuggestedMitigations?: string;
  aiRegulatoryConsiderations?: string;
  aiLikelihoodScore?: number;
  aiConsequenceScore?: number;
  lastModified: string; // ISO string
  submissionTimestamp: number; // Unix millis
  lastModifiedTimestamp: number; // Unix millis
  patrolStartDate?: string;
  patrolEndDate?: string;
  patrolLengthDays?: number;
}

// This is used by the client-side form, which deals with ISO strings for dates
// and File objects for attachments before they are processed by the service.
export interface RiskAssessmentFormData extends Omit<RiskAssessment, 'id' | 'submissionDate' | 'lastModified' | 'submissionTimestamp' | 'lastModifiedTimestamp' | 'attachments' | 'approvalSteps' | 'status'> {
  attachments?: Array<Partial<Attachment> & { file?: File }>; // file is present for new uploads
  patrolStartDate?: string;
  patrolEndDate?: string;
  // Fields from RiskAssessment that are set by system/workflow
  referenceNumber?: string;
  status?: RiskAssessmentStatus;
  approvalSteps?: ApprovalStep[];
}


export type UserRole =
  | ApprovalLevel
  | 'Atlantic Region Submitter'
  | 'Central Region Submitter'
  | 'Western Region Submitter'
  | 'Arctic Region Submitter'
  | 'Generic Submitter'
  | 'Admin'
  | 'Unauthenticated';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
}

export type Language = 'en' | 'fr';
