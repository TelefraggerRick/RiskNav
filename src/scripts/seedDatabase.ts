
// src/scripts/seedDatabase.ts

import { db } from '@/lib/firebase';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment, YesNoOptional, VesselDepartment, VesselRegion, RiskAssessmentStatus, ApprovalDecision, ApprovalLevel } from '@/lib/types';
import { doc, setDoc, Timestamp, FieldValue, serverTimestamp } from 'firebase/firestore'; // Added serverTimestamp
import { config } from 'dotenv';

config(); // Load environment variables from .env

const DEBUG_SIMPLIFY_RA_001 = true; // Keep this true for testing

// --- Helper to safely create Firestore Timestamps from date strings ---
function safeCreateTimestamp(dateString: string | undefined | null): Timestamp | null {
  if (!dateString) {
    return null;
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string encountered for Timestamp: "${dateString}". Storing as null.`);
      return null;
    }
    return Timestamp.fromDate(date);
  } catch (error) {
    console.warn(`Error parsing date string "${dateString}" for Timestamp:`, error, ". Storing as null.");
    return null;
  }
}

// --- Helper to recursively convert undefined to null ---
function cleanUndefinedRecursively(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedRecursively(item));
  } else if (typeof obj === 'object' && obj !== null) {
    // Check if it's a Firestore Timestamp or FieldValue, and leave it alone
    if (obj instanceof Timestamp || (obj && typeof obj === 'object' && '_methodName' in obj && typeof obj._methodName === 'string' && obj._methodName.includes('timestamp'))) {
        return obj;
    }
    const newObj: {[key: string]: any} = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = cleanUndefinedRecursively(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}


const VALID_VESSEL_DEPARTMENTS: ReadonlyArray<VesselDepartment | '' | null | undefined> = ['Navigation', 'Deck', 'Engine Room', 'Logistics', 'Other', '', null, undefined];
const VALID_VESSEL_REGIONS: ReadonlyArray<VesselRegion | '' | null | undefined> = ['Atlantic', 'Central', 'Western', 'Arctic', '', null, undefined];
const VALID_STATUSES: ReadonlyArray<RiskAssessmentStatus | '' | null | undefined> = ['Draft', 'Pending Crewing Standards and Oversight', 'Pending Senior Director', 'Pending Director General', 'Needs Information', 'Approved', 'Rejected', '', null, undefined];
const VALID_YES_NO_OPTIONAL: ReadonlyArray<YesNoOptional | '' | null | undefined> = ['Yes', 'No', null, undefined, '']; // Already includes null/undefined
const VALID_APPROVAL_DECISIONS: ReadonlyArray<ApprovalDecision | '' | null | undefined> = ['Approved', 'Rejected', 'Needs Information', '', null, undefined];
const VALID_APPROVAL_LEVELS: ReadonlyArray<ApprovalLevel> = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];

function validateAndCoerceEnum<T extends string>(
  value: any,
  validValues: readonly (T | '' | null | undefined)[],
  fieldName: string,
  assessmentId: string,
  allowNull: boolean = true
): T | null {
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  if (trimmedValue === undefined || trimmedValue === null || (allowNull && trimmedValue === "")) {
    return null;
  }
  // Check if the trimmed value is among the valid enum string values
  if (validValues.some(valid => typeof valid === 'string' && valid === trimmedValue)) {
    return trimmedValue as T;
  }
  console.warn(`Invalid value "${value}" (trimmed: "${trimmedValue}") for enum field "${fieldName}" in assessment "${assessmentId}". Storing as null.`);
  return null;
}

function coerceYesNoOptional(value: any, fieldName: string, assessmentId: string): 'Yes' | 'No' | null {
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    if (trimmedValue === 'Yes' || trimmedValue === 'No') {
        return trimmedValue;
    }
    if (trimmedValue === undefined || trimmedValue === null || trimmedValue === '') {
        return null;
    }
    console.warn(`Invalid value "${value}" (trimmed: "${trimmedValue}") for YesNoOptional field "${fieldName}" in assessment "${assessmentId}". Coercing to null.`);
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
    const assessmentId = mockAssessment.id;
    console.log(`Processing assessment: ${assessmentId} - ${mockAssessment.vesselName}`);

    let dataToSet: any = {};
    const cleanedMockInitial = cleanUndefinedRecursively(mockAssessment);

    if (DEBUG_SIMPLIFY_RA_001 && assessmentId === 'ra-001') {
      console.log(`DEBUG: Radically simplifying data for assessment ${assessmentId}, using native Dates, and REMOVING 'id' from data payload.`);
      dataToSet = {
        // id: assessmentId, // REMOVED from data payload for this debug step
        referenceNumber: String(cleanedMockInitial.referenceNumber || 'REF_MISSING_DEBUG'),
        vesselName: String(cleanedMockInitial.vesselName || 'VESSEL_NAME_MISSING_DEBUG'),
        status: validateAndCoerceEnum(cleanedMockInitial.status, VALID_STATUSES, 'status', assessmentId, false) || 'Draft',
        submissionDate: new Date(cleanedMockInitial.submissionDate || Date.now()), // Native JS Date
        lastModified: new Date(), // Native JS Date
      };
    } else {
      // Full data construction for other assessments or if debug flag is off
      dataToSet = {
        id: assessmentId, // Keep ID in data for non-debug cases or other assessments
        referenceNumber: String(cleanedMockInitial.referenceNumber || ''),
        maritimeExemptionNumber: (typeof cleanedMockInitial.maritimeExemptionNumber === 'string' && cleanedMockInitial.maritimeExemptionNumber.trim() !== "") ? cleanedMockInitial.maritimeExemptionNumber.trim() : null,
        vesselName: String(cleanedMockInitial.vesselName || ''),
        imoNumber: (typeof cleanedMockInitial.imoNumber === 'string' && cleanedMockInitial.imoNumber.trim() !== "") ? cleanedMockInitial.imoNumber.trim() : null,
        department: validateAndCoerceEnum(cleanedMockInitial.department, VALID_VESSEL_DEPARTMENTS, 'department', assessmentId),
        region: validateAndCoerceEnum(cleanedMockInitial.region, VALID_VESSEL_REGIONS, 'region', assessmentId),

        patrolStartDate: (typeof cleanedMockInitial.patrolStartDate === 'string' && cleanedMockInitial.patrolStartDate.trim() !== "") ? cleanedMockInitial.patrolStartDate.trim() : null,
        patrolEndDate: (typeof cleanedMockInitial.patrolEndDate === 'string' && cleanedMockInitial.patrolEndDate.trim() !== "") ? cleanedMockInitial.patrolEndDate.trim() : null,
        patrolLengthDays: typeof cleanedMockInitial.patrolLengthDays === 'number' ? cleanedMockInitial.patrolLengthDays : null,

        voyageDetails: String(cleanedMockInitial.voyageDetails || ''),
        reasonForRequest: String(cleanedMockInitial.reasonForRequest || ''),
        personnelShortages: String(cleanedMockInitial.personnelShortages || ''),
        proposedOperationalDeviations: String(cleanedMockInitial.proposedOperationalDeviations || ''),
        submittedBy: String(cleanedMockInitial.submittedBy || ''),
        submissionDate: safeCreateTimestamp(cleanedMockInitial.submissionDate) || serverTimestamp(),
        status: validateAndCoerceEnum(cleanedMockInitial.status, VALID_STATUSES, 'status', assessmentId, false) || 'Draft', // Status is not optional
        lastModified: serverTimestamp(), // Use serverTimestamp for lastModified

        aiRiskScore: typeof cleanedMockInitial.aiRiskScore === 'number' ? cleanedMockInitial.aiRiskScore : null,
        aiGeneratedSummary: (typeof cleanedMockInitial.aiGeneratedSummary === 'string' && cleanedMockInitial.aiGeneratedSummary.trim() !== "") ? cleanedMockInitial.aiGeneratedSummary.trim() : null,
        aiSuggestedMitigations: (typeof cleanedMockInitial.aiSuggestedMitigations === 'string' && cleanedMockInitial.aiSuggestedMitigations.trim() !== "") ? cleanedMockInitial.aiSuggestedMitigations.trim() : null,
        aiRegulatoryConsiderations: (typeof cleanedMockInitial.aiRegulatoryConsiderations === 'string' && cleanedMockInitial.aiRegulatoryConsiderations.trim() !== "") ? cleanedMockInitial.aiRegulatoryConsiderations.trim() : null,
        aiLikelihoodScore: typeof cleanedMockInitial.aiLikelihoodScore === 'number' ? cleanedMockInitial.aiLikelihoodScore : null,
        aiConsequenceScore: typeof cleanedMockInitial.aiConsequenceScore === 'number' ? cleanedMockInitial.aiConsequenceScore : null,

        employeeName: (typeof cleanedMockInitial.employeeName === 'string' && cleanedMockInitial.employeeName.trim() !== "") ? cleanedMockInitial.employeeName.trim() : null,
        certificateHeld: (typeof cleanedMockInitial.certificateHeld === 'string' && cleanedMockInitial.certificateHeld.trim() !== "") ? cleanedMockInitial.certificateHeld.trim() : null,
        requiredCertificate: (typeof cleanedMockInitial.requiredCertificate === 'string' && cleanedMockInitial.requiredCertificate.trim() !== "") ? cleanedMockInitial.requiredCertificate.trim() : null,

        coDeptHeadSupportExemption: coerceYesNoOptional(cleanedMockInitial.coDeptHeadSupportExemption, 'coDeptHeadSupportExemption', assessmentId),
        deptHeadConfidentInIndividual: coerceYesNoOptional(cleanedMockInitial.deptHeadConfidentInIndividual, 'deptHeadConfidentInIndividual', assessmentId),
        deptHeadConfidenceReason: (typeof cleanedMockInitial.deptHeadConfidenceReason === 'string' && cleanedMockInitial.deptHeadConfidenceReason.trim() !== "") ? cleanedMockInitial.deptHeadConfidenceReason.trim() : null,
        employeeFamiliarizationProvided: coerceYesNoOptional(cleanedMockInitial.employeeFamiliarizationProvided, 'employeeFamiliarizationProvided', assessmentId),
        workedInDepartmentLast12Months: coerceYesNoOptional(cleanedMockInitial.workedInDepartmentLast12Months, 'workedInDepartmentLast12Months', assessmentId),
        workedInDepartmentDetails: (typeof cleanedMockInitial.workedInDepartmentDetails === 'string' && cleanedMockInitial.workedInDepartmentDetails.trim() !== "") ? cleanedMockInitial.workedInDepartmentDetails.trim() : null,
        similarResponsibilityExperience: coerceYesNoOptional(cleanedMockInitial.similarResponsibilityExperience, 'similarResponsibilityExperience', assessmentId),
        similarResponsibilityDetails: (typeof cleanedMockInitial.similarResponsibilityDetails === 'string' && cleanedMockInitial.similarResponsibilityDetails.trim() !== "") ? cleanedMockInitial.similarResponsibilityDetails.trim() : null,
        individualHasRequiredSeaService: coerceYesNoOptional(cleanedMockInitial.individualHasRequiredSeaService, 'individualHasRequiredSeaService', assessmentId),
        individualWorkingTowardsCertification: coerceYesNoOptional(cleanedMockInitial.individualWorkingTowardsCertification, 'individualWorkingTowardsCertification', assessmentId),
        certificationProgressSummary: (typeof cleanedMockInitial.certificationProgressSummary === 'string' && cleanedMockInitial.certificationProgressSummary.trim() !== "") ? cleanedMockInitial.certificationProgressSummary.trim() : null,

        requestCausesVacancyElsewhere: coerceYesNoOptional(cleanedMockInitial.requestCausesVacancyElsewhere, 'requestCausesVacancyElsewhere', assessmentId),
        crewCompositionSufficientForSafety: coerceYesNoOptional(cleanedMockInitial.crewCompositionSufficientForSafety, 'crewCompositionSufficientForSafety', assessmentId),
        detailedCrewCompetencyAssessment: (typeof cleanedMockInitial.detailedCrewCompetencyAssessment === 'string' && cleanedMockInitial.detailedCrewCompetencyAssessment.trim() !== "") ? cleanedMockInitial.detailedCrewCompetencyAssessment.trim() : null,
        crewContinuityAsPerProfile: coerceYesNoOptional(cleanedMockInitial.crewContinuityAsPerProfile, 'crewContinuityAsPerProfile', assessmentId),
        crewContinuityDetails: (typeof cleanedMockInitial.crewContinuityDetails === 'string' && cleanedMockInitial.crewContinuityDetails.trim() !== "") ? cleanedMockInitial.crewContinuityDetails.trim() : null,

        specialVoyageConsiderations: (typeof cleanedMockInitial.specialVoyageConsiderations === 'string' && cleanedMockInitial.specialVoyageConsiderations.trim() !== "") ? cleanedMockInitial.specialVoyageConsiderations.trim() : null,
        reductionInVesselProgramRequirements: coerceYesNoOptional(cleanedMockInitial.reductionInVesselProgramRequirements, 'reductionInVesselProgramRequirements', assessmentId),
        rocNotificationOfLimitations: coerceYesNoOptional(cleanedMockInitial.rocNotificationOfLimitations, 'rocNotificationOfLimitations', assessmentId),

        attachments: Array.isArray(cleanedMockInitial.attachments) ? cleanedMockInitial.attachments.map((att: any) => ({
          id: String(att.id || ''),
          name: String(att.name || ''),
          url: String(att.url || ''),
          type: String(att.type || ''),
          size: typeof att.size === 'number' ? att.size : null,
          uploadedAt: safeCreateTimestamp(att.uploadedAt),
          dataAiHint: (typeof att.dataAiHint === 'string' && att.dataAiHint.trim() !== "") ? att.dataAiHint.trim() : null,
        })) : [],
        approvalSteps: Array.isArray(cleanedMockInitial.approvalSteps) ? cleanedMockInitial.approvalSteps.map((step: any) => ({
          level: validateAndCoerceEnum(step.level, VALID_APPROVAL_LEVELS, `approvalSteps[${step.level}].level`, assessmentId, false) || 'Crewing Standards and Oversight', // Default if invalid
          decision: validateAndCoerceEnum(step.decision, VALID_APPROVAL_DECISIONS, `approvalSteps[${step.level}].decision`, assessmentId),
          userId: (typeof step.userId === 'string' && step.userId.trim() !== "") ? step.userId.trim() : null,
          userName: (typeof step.userName === 'string' && step.userName.trim() !== "") ? step.userName.trim() : null,
          date: safeCreateTimestamp(step.date),
          notes: (typeof step.notes === 'string' && step.notes.trim() !== "") ? step.notes.trim() : null,
        })) : [],
      };
    }

    const finalFirestoreData: {[key: string]: any} = {};
    for (const key in dataToSet) {
      if (Object.prototype.hasOwnProperty.call(dataToSet, key)) {
        finalFirestoreData[key] = dataToSet[key] === undefined ? null : dataToSet[key];
      }
    }

    const replacerForLog = (key: string, value: any) => {
      if (value instanceof Timestamp) {
        return `FirestoreTimestamp(seconds=${value.seconds}, nanoseconds=${value.nanoseconds})`;
      }
      if (value instanceof Date) { // For native JS Date logging
        return `NativeDate(${value.toISOString()})`;
      }
      if (value && typeof value === 'object' && '_methodName' in value && typeof value._methodName === 'string' && value._methodName.includes('timestamp')) {
          return `FieldValue.serverTimestamp()`;
      }
      return value;
    };
    console.log(`Attempting to set document ${assessmentId} with data:`, JSON.stringify(finalFirestoreData, replacerForLog, 2));

    try {
      const docRef = doc(db, 'riskAssessments', assessmentId);
      await setDoc(docRef, finalFirestoreData);
      console.log(`SUCCESS: Seeded assessment ${assessmentId}`);
      successCount++;
    } catch (error: any) {
      console.error(`ERROR seeding assessment ${assessmentId}.`);
      console.error("Error message:", error.message);
      if (error.code) console.error("Error code:", error.code);
      // Log the finalFirestoreData object that was attempted
      console.error("Data object ATTEMPTED for setDoc (from catch block):", JSON.stringify(finalFirestoreData, replacerForLog, 2));
      errorCount++;
    }
  }

  console.log('-------------------------------------');
  console.log('Database Seed Process Complete.');
  console.log(`Successfully seeded: ${successCount} assessments.`);
  console.log(`Failed to seed: ${errorCount} assessments.`);
  if (errorCount > 0) {
    console.log("Review the logged 'Data object ATTEMPTED for setDoc' for assessments that failed.");
  }
  console.log('-------------------------------------');
}

seedDatabase().catch(err => {
  console.error('Unhandled critical error during seeding process:', err);
});
