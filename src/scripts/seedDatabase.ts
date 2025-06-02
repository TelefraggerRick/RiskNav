
import { db } from '@/lib/firebase';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment, YesNoOptional, VesselDepartment, VesselRegion, RiskAssessmentStatus, ApprovalDecision, ApprovalLevel } from '@/lib/types';
import { doc, setDoc, Timestamp, FieldValue } from 'firebase/firestore';
import { config } from 'dotenv';

config(); // Load environment variables from .env

// --- Helper to safely create Firestore Timestamps from date strings ---
function safeCreateTimestamp(dateString: string | undefined): Timestamp | null {
  if (!dateString) {
    return null;
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string encountered: "${dateString}". Storing as null.`);
      return null;
    }
    return Timestamp.fromDate(date);
  } catch (error) {
    console.warn(`Error parsing date string "${dateString}":`, error, ". Storing as null.");
    return null;
  }
}

// --- Helper to validate and coerce enum values ---
const VALID_VESSEL_DEPARTMENTS: VesselDepartment[] = ['Navigation', 'Deck', 'Engine Room', 'Logistics', 'Other'];
const VALID_VESSEL_REGIONS: VesselRegion[] = ['Atlantic', 'Central', 'Western', 'Arctic'];
const VALID_STATUSES: RiskAssessmentStatus[] = ['Draft', 'Pending Crewing Standards and Oversight', 'Pending Senior Director', 'Pending Director General', 'Needs Information', 'Approved', 'Rejected'];
const VALID_YES_NO: YesNoOptional[] = ['Yes', 'No', undefined]; // Firestore will store undefined as omitted or handle based on rules
const VALID_APPROVAL_DECISIONS: ApprovalDecision[] = ['Approved', 'Rejected', 'Needs Information'];
const VALID_APPROVAL_LEVELS: ApprovalLevel[] = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];

function validateAndCoerceEnum<T extends string>(
  value: string | undefined,
  validValues: readonly T[],
  fieldName: string,
  assessmentId: string
): T | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  if (validValues.includes(value as T)) {
    return value as T;
  }
  console.warn(`Invalid value "${value}" for enum field "${fieldName}" in assessment "${assessmentId}". Storing as null.`);
  return null;
}

function coerceYesNoOptional(value: any, fieldName: string, assessmentId: string): 'Yes' | 'No' | null {
    if (value === 'Yes' || value === 'No') {
        return value;
    }
    if (value === undefined || value === null || value === '') {
        return null;
    }
    console.warn(`Invalid value "${value}" for YesNoOptional field "${fieldName}" in assessment "${assessmentId}". Coercing to null.`);
    return null;
}


async function seedDatabase() {
  console.log('Starting database seed process...');
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error("Firebase project ID is not configured in .env file. Aborting seed.");
    return;
  }
  console.log(`Targeting Firebase project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

  let successCount = 0;
  let errorCount = 0;

  for (const mockAssessment of mockRiskAssessments) {
    try {
      const assessmentId = mockAssessment.id;
      console.log(`Processing assessment: ${assessmentId} - ${mockAssessment.vesselName}`);

      const dataToSet: any = {
        // Core fields
        id: assessmentId,
        referenceNumber: mockAssessment.referenceNumber || null,
        maritimeExemptionNumber: mockAssessment.maritimeExemptionNumber || null,
        vesselName: mockAssessment.vesselName || null,
        imoNumber: mockAssessment.imoNumber || null,
        department: validateAndCoerceEnum(mockAssessment.department, VALID_VESSEL_DEPARTMENTS, 'department', assessmentId),
        region: validateAndCoerceEnum(mockAssessment.region, VALID_VESSEL_REGIONS, 'region', assessmentId),
        patrolStartDate: mockAssessment.patrolStartDate || null, // Keep as string or use safeCreateTimestamp if you want Timestamp
        patrolEndDate: mockAssessment.patrolEndDate || null,   // Keep as string or use safeCreateTimestamp
        patrolLengthDays: typeof mockAssessment.patrolLengthDays === 'number' ? mockAssessment.patrolLengthDays : null,
        voyageDetails: mockAssessment.voyageDetails || null,
        reasonForRequest: mockAssessment.reasonForRequest || null,
        personnelShortages: mockAssessment.personnelShortages || null,
        proposedOperationalDeviations: mockAssessment.proposedOperationalDeviations || null,
        submittedBy: mockAssessment.submittedBy || null,
        submissionDate: safeCreateTimestamp(mockAssessment.submissionDate),
        status: validateAndCoerceEnum(mockAssessment.status, VALID_STATUSES, 'status', assessmentId),
        lastModified: safeCreateTimestamp(mockAssessment.lastModified),

        // AI Generated Fields
        aiRiskScore: typeof mockAssessment.aiRiskScore === 'number' ? mockAssessment.aiRiskScore : null,
        aiGeneratedSummary: mockAssessment.aiGeneratedSummary || null,
        aiSuggestedMitigations: mockAssessment.aiSuggestedMitigations || null,
        aiRegulatoryConsiderations: mockAssessment.aiRegulatoryConsiderations || null,
        aiLikelihoodScore: typeof mockAssessment.aiLikelihoodScore === 'number' ? mockAssessment.aiLikelihoodScore : null,
        aiConsequenceScore: typeof mockAssessment.aiConsequenceScore === 'number' ? mockAssessment.aiConsequenceScore : null,

        // ExemptionIndividualAssessmentData
        employeeName: mockAssessment.employeeName || null,
        certificateHeld: mockAssessment.certificateHeld || null,
        requiredCertificate: mockAssessment.requiredCertificate || null,
        coDeptHeadSupportExemption: coerceYesNoOptional(mockAssessment.coDeptHeadSupportExemption, 'coDeptHeadSupportExemption', assessmentId),
        deptHeadConfidentInIndividual: coerceYesNoOptional(mockAssessment.deptHeadConfidentInIndividual, 'deptHeadConfidentInIndividual', assessmentId),
        deptHeadConfidenceReason: mockAssessment.deptHeadConfidenceReason || null,
        employeeFamiliarizationProvided: coerceYesNoOptional(mockAssessment.employeeFamiliarizationProvided, 'employeeFamiliarizationProvided', assessmentId),
        workedInDepartmentLast12Months: coerceYesNoOptional(mockAssessment.workedInDepartmentLast12Months, 'workedInDepartmentLast12Months', assessmentId),
        workedInDepartmentDetails: mockAssessment.workedInDepartmentDetails || null,
        similarResponsibilityExperience: coerceYesNoOptional(mockAssessment.similarResponsibilityExperience, 'similarResponsibilityExperience', assessmentId),
        similarResponsibilityDetails: mockAssessment.similarResponsibilityDetails || null,
        individualHasRequiredSeaService: coerceYesNoOptional(mockAssessment.individualHasRequiredSeaService, 'individualHasRequiredSeaService', assessmentId),
        individualWorkingTowardsCertification: coerceYesNoOptional(mockAssessment.individualWorkingTowardsCertification, 'individualWorkingTowardsCertification', assessmentId),
        certificationProgressSummary: mockAssessment.certificationProgressSummary || null,

        // OperationalConsiderationsData
        requestCausesVacancyElsewhere: coerceYesNoOptional(mockAssessment.requestCausesVacancyElsewhere, 'requestCausesVacancyElsewhere', assessmentId),
        crewCompositionSufficientForSafety: coerceYesNoOptional(mockAssessment.crewCompositionSufficientForSafety, 'crewCompositionSufficientForSafety', assessmentId),
        detailedCrewCompetencyAssessment: mockAssessment.detailedCrewCompetencyAssessment || null,
        crewContinuityAsPerProfile: coerceYesNoOptional(mockAssessment.crewContinuityAsPerProfile, 'crewContinuityAsPerProfile', assessmentId),
        crewContinuityDetails: mockAssessment.crewContinuityDetails || null,
        specialVoyageConsiderations: mockAssessment.specialVoyageConsiderations || null,
        reductionInVesselProgramRequirements: coerceYesNoOptional(mockAssessment.reductionInVesselProgramRequirements, 'reductionInVesselProgramRequirements', assessmentId),
        rocNotificationOfLimitations: coerceYesNoOptional(mockAssessment.rocNotificationOfLimitations, 'rocNotificationOfLimitations', assessmentId),

        // Arrays - Attachments
        attachments: (mockAssessment.attachments || []).map(att => ({
          id: att.id || null,
          name: att.name || null,
          url: att.url || null,
          type: att.type || null,
          size: typeof att.size === 'number' ? att.size : null,
          uploadedAt: safeCreateTimestamp(att.uploadedAt),
          dataAiHint: att.dataAiHint || null,
          // Ensure 'file' property is not included
        })),

        // Arrays - ApprovalSteps
        approvalSteps: (mockAssessment.approvalSteps || []).map(step => ({
          level: validateAndCoerceEnum(step.level, VALID_APPROVAL_LEVELS, `approvalSteps[${step.level}].level`, assessmentId),
          decision: validateAndCoerceEnum(step.decision, VALID_APPROVAL_DECISIONS, `approvalSteps[${step.level}].decision`, assessmentId),
          userId: step.userId || null,
          userName: step.userName || null,
          date: safeCreateTimestamp(step.date),
          notes: step.notes || null,
        })),
      };

      // Remove top-level null properties to avoid storing them unless explicitly intended
      // (Firestore typically omits undefined, but nulls are stored)
      // However, for this seed, explicit nulls from coercion are intended.

      const docRef = doc(db, 'riskAssessments', assessmentId);
      await setDoc(docRef, dataToSet);
      console.log(`SUCCESS: Seeded assessment ${assessmentId}`);
      successCount++;
    } catch (error: any) {
      console.error(`ERROR seeding assessment ${mockAssessment.id}:`, error.message);
      // console.error("Full error object:", error);
      // const dataBeingSent = { ... }; // Construct this similar to dataToSet for logging
      // console.error("Data object attempted for setDoc:", JSON.stringify(dataBeingSent, null, 2));
      errorCount++;
    }
  }

  console.log('-------------------------------------');
  console.log('Database Seed Process Complete.');
  console.log(`Successfully seeded: ${successCount} assessments.`);
  console.log(`Failed to seed: ${errorCount} assessments.`);
  console.log('-------------------------------------');
}

seedDatabase().catch(err => {
  console.error('Unhandled error during seeding process:', err);
});
