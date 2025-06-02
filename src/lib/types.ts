
export interface Attachment {
  id: string;
  name: string;
  url: string; // Could be a data URI for mock, or actual URL for real files
  type: string;
  size: number; // in bytes
  uploadedAt: string; // ISO date string
  file?: File; // For new uploads, not stored in localStorage directly
  dataAiHint?: string; // for placeholder images
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
  workedInDepartmentDetails?: string; // Position and duration if Yes
  similarResponsibilityExperience?: YesNoOptional;
  similarResponsibilityDetails?: string; // Details if Yes
  individualHasRequiredSeaService?: YesNoOptional;
  individualWorkingTowardsCertification?: YesNoOptional;
  certificationProgressSummary?: string; // Summary if Yes
}

export interface OperationalConsiderationsData {
  // Crew/Team
  requestCausesVacancyElsewhere?: YesNoOptional;
  crewCompositionSufficientForSafety?: YesNoOptional;
  detailedCrewCompetencyAssessment?: string;
  crewContinuityAsPerProfile?: YesNoOptional;
  crewContinuityDetails?: string; // If not, provide details.
  // Voyage
  specialVoyageConsiderations?: string;
  reductionInVesselProgramRequirements?: YesNoOptional;
  rocNotificationOfLimitations?: YesNoOptional; // If yes to reduction, is ROC notified?
}


export type ApprovalDecision = 'Approved' | 'Rejected' | 'Needs Information';
export type ApprovalLevel = 'Crewing Standards and Oversight' | 'Senior Director' | 'Director General';

export interface ApprovalStep {
  level: ApprovalLevel;
  decision?: ApprovalDecision;
  userId?: string; // ID of the user who made the decision
  userName?: string; // Name of the user
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
  id: string;
  referenceNumber: string;
  maritimeExemptionNumber?: string; // New optional field
  vesselName: string;
  imoNumber?: string; // Optional
  department?: VesselDepartment;
  region?: VesselRegion;
  voyageDetails: string;
  reasonForRequest: string;
  personnelShortages: string;
  proposedOperationalDeviations: string;
  submittedBy: string; // Name of the submitter (from UserContext)
  submissionDate: string; // ISO date string
  status: RiskAssessmentStatus;
  attachments: Attachment[];
  approvalSteps: ApprovalStep[];
  aiRiskScore?: number;
  aiGeneratedSummary?: string;
  aiSuggestedMitigations?: string;
  aiRegulatoryConsiderations?: string;
  aiLikelihoodScore?: number; // New field for 1-5 likelihood
  aiConsequenceScore?: number; // New field for 1-5 consequence
  lastModified: string; // ISO date string

  // Optional patrol specific fields
  patrolStartDate?: string; // ISO date string
  patrolEndDate?: string; // ISO date string
  patrolLengthDays?: number;
}

// This is used by the client-side form, which deals with File objects
// before they are processed (e.g. uploaded or converted to data URI for mock)
export interface RiskAssessmentFormData extends Omit<RiskAssessment, 'id' | 'referenceNumber' | 'submissionDate' | 'lastModified' | 'attachments' | 'approvalSteps' | 'status' | 'submittedBy' | 'patrolLengthDays'> {
  attachments?: Array<Partial<Attachment> & { file?: File }>; // file is present for new uploads
}


export type UserRole =
  | ApprovalLevel // e.g. 'Crewing Standards and Oversight', 'Senior Director', 'Director General'
  | 'Atlantic Region Submitter'
  | 'Central Region Submitter'
  | 'Western Region Submitter'
  | 'Arctic Region Submitter' // Corrected from 'Arctic Operations' for consistency if needed
  | 'Generic Submitter'
  | 'Admin'
  | 'Unauthenticated';

export interface User {
  id: string;
  name: string;
  email?: string; // Optional
  role: UserRole;
}

export type Language = 'en' | 'fr';
