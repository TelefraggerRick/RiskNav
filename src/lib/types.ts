
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  file?: File;
  dataAiHint?: string;
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
  date?: string;
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
export type VesselRegion = 'Atlantic' | 'Central' | 'Western' | 'Arctic' | 'National HQ';
export const ALL_VESSEL_REGIONS: [VesselRegion, ...VesselRegion[]] = ['Atlantic', 'Central', 'Western', 'Arctic', 'National HQ'];


export interface RiskAssessment extends ExemptionIndividualAssessmentData, OperationalConsiderationsData {
  id: string;
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
  submittedByUid?: string;
  submissionDate: string;
  status: RiskAssessmentStatus;
  attachments: Attachment[];
  approvalSteps: ApprovalStep[];
  aiRiskScore?: number;
  aiGeneratedSummary?: string;
  aiSuggestedMitigations?: string;
  aiRegulatoryConsiderations?: string;
  aiLikelihoodScore?: number;
  aiConsequenceScore?: number;
  lastModified: string;

  patrolStartDate?: string;
  patrolEndDate?: string;
  patrolLengthDays?: number;
}

export interface RiskAssessmentFormData extends Omit<RiskAssessment, 'id' | 'referenceNumber' | 'submissionDate' | 'lastModified' | 'attachments' | 'approvalSteps' | 'status' | 'submittedBy' | 'submittedByUid' | 'patrolLengthDays'> {
  attachments?: Array<Partial<Attachment> & { file?: File }>;
}


export type UserRole =
  | 'Submitter'
  | 'CSO Officer'
  | 'Senior Director'
  | 'Director General'
  | 'Admin'
  | 'Unauthenticated';

// Array of assignable roles, excluding 'Unauthenticated'
export const assignableUserRoles: Exclude<UserRole, 'Unauthenticated'>[] = [
  'Submitter',
  'CSO Officer',
  'Senior Director',
  'Director General',
  'Admin',
];

// This will represent the user profile stored in Firestore
export interface AppUser {
  uid: string; // Firebase Auth UID
  name: string;
  email: string;
  role: UserRole;
  region?: VesselRegion; // Added region to user profile
  fcmTokens?: string[]; // For storing FCM registration tokens
}

export type Language = 'en' | 'fr';
