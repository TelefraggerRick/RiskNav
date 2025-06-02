
// src/scripts/seedDatabase.ts

import { db } from '@/lib/firebase'; // Ensure this path is correct
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment, YesNoOptional, VesselDepartment, VesselRegion, RiskAssessmentStatus, ApprovalDecision, ApprovalLevel } from '@/lib/types';
import { doc, setDoc, Timestamp, FieldValue, serverTimestamp } from 'firebase/firestore'; // Added serverTimestamp
import { config } from 'dotenv';

config(); // Load environment variables from .env

const DEBUG_SIMPLIFY_RA_001 = true; // <-- DEBUG FLAG: Set to true to test ra-001 with empty arrays

// --- Helper to safely create Firestore Timestamps from date strings ---
function safeCreateTimestamp(dateString: string | undefined): Timestamp | null {
  if (!dateString) {
    return null;
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { // More robust check for invalid date
      console.warn(`Invalid date string encountered for Timestamp: "${dateString}". Storing as null.`);
      return null;
    }
    return Timestamp.fromDate(date);
  } catch (error) {
    console.warn(`Error parsing date string "${dateString}" for Timestamp:`, error, ". Storing as null.");
    return null;
  }
}

const VALID_VESSEL_DEPARTMENTS: ReadonlyArray<VesselDepartment> = ['Navigation', 'Deck', 'Engine Room', 'Logistics', 'Other'];
const VALID_VESSEL_REGIONS: ReadonlyArray<VesselRegion> = ['Atlantic', 'Central', 'Western', 'Arctic'];
const VALID_STATUSES: ReadonlyArray<RiskAssessmentStatus> = ['Draft', 'Pending Crewing Standards and Oversight', 'Pending Senior Director', 'Pending Director General', 'Needs Information', 'Approved', 'Rejected'];
const VALID_YES_NO_OPTIONAL: ReadonlyArray<YesNoOptional | ''> = ['Yes', 'No', undefined, '']; // Include empty string for coercion
const VALID_APPROVAL_DECISIONS: ReadonlyArray<ApprovalDecision | ''> = ['Approved', 'Rejected', 'Needs Information', ''];
const VALID_APPROVAL_LEVELS: ReadonlyArray<ApprovalLevel> = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];


function validateAndCoerceEnum<T extends string>(
  value: string | undefined,
  validValues: readonly (T | '' | undefined)[], // Allow empty string and undefined for initial check
  fieldName: string,
  assessmentId: string,
  isOptional: boolean = true
): T | null {
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  if (trimmedValue === undefined || trimmedValue === null || (isOptional && trimmedValue === "")) {
    return null;
  }
  if (validValues.includes(trimmedValue as T)) {
    // Ensure we don't return an empty string if it's not a valid enum value itself,
    // but was used for coercion check.
    return trimmedValue === "" ? null : (trimmedValue as T);
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

function cleanUndefinedRecursively(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedRecursively(item));
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: {[key: string]: any} = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        // Recursively clean, and if the result of cleaning is undefined, map to null
        const cleanedValue = cleanUndefinedRecursively(value);
        newObj[key] = cleanedValue === undefined ? null : cleanedValue;
      }
    }
    return newObj;
  }
  return obj === undefined ? null : obj; // Ensure top-level undefined also becomes null
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

      // Apply cleaning first to handle undefined at any level
      const cleanedMock = cleanUndefinedRecursively(mockAssessment);
      
      let dataToSet: any = {
        id: assessmentId,
        referenceNumber: String(cleanedMock.referenceNumber || ''), // Ensure string or empty
        maritimeExemptionNumber: cleanedMock.maritimeExemptionNumber && String(cleanedMock.maritimeExemptionNumber).trim() !== "" ? String(cleanedMock.maritimeExemptionNumber) : null,
        vesselName: String(cleanedMock.vesselName || ''),
        imoNumber: cleanedMock.imoNumber && String(cleanedMock.imoNumber).trim() !== "" ? String(cleanedMock.imoNumber) : null,
        
        department: validateAndCoerceEnum(cleanedMock.department, VALID_VESSEL_DEPARTMENTS, 'department', assessmentId),
        region: validateAndCoerceEnum(cleanedMock.region, VALID_VESSEL_REGIONS, 'region', assessmentId),
        
        patrolStartDate: cleanedMock.patrolStartDate || null,
        patrolEndDate: cleanedMock.patrolEndDate || null,
        patrolLengthDays: typeof cleanedMock.patrolLengthDays === 'number' ? cleanedMock.patrolLengthDays : null,

        voyageDetails: String(cleanedMock.voyageDetails || ''),
        reasonForRequest: String(cleanedMock.reasonForRequest || ''),
        personnelShortages: String(cleanedMock.personnelShortages || ''),
        proposedOperationalDeviations: String(cleanedMock.proposedOperationalDeviations || ''),
        submittedBy: String(cleanedMock.submittedBy || ''),
        
        submissionDate: safeCreateTimestamp(cleanedMock.submissionDate),
        status: validateAndCoerceEnum(cleanedMock.status, VALID_STATUSES, 'status', assessmentId, false), // Status is not optional
        lastModified: serverTimestamp(), // Use Firestore server timestamp

        aiRiskScore: typeof cleanedMock.aiRiskScore === 'number' ? cleanedMock.aiRiskScore : null,
        aiGeneratedSummary: cleanedMock.aiGeneratedSummary || null,
        aiSuggestedMitigations: cleanedMock.aiSuggestedMitigations || null,
        aiRegulatoryConsiderations: cleanedMock.aiRegulatoryConsiderations || null,
        aiLikelihoodScore: typeof cleanedMock.aiLikelihoodScore === 'number' ? cleanedMock.aiLikelihoodScore : null,
        aiConsequenceScore: typeof cleanedMock.aiConsequenceScore === 'number' ? cleanedMock.aiConsequenceScore : null,

        employeeName: cleanedMock.employeeName || null,
        certificateHeld: cleanedMock.certificateHeld || null,
        requiredCertificate: cleanedMock.requiredCertificate || null,
        coDeptHeadSupportExemption: coerceYesNoOptional(cleanedMock.coDeptHeadSupportExemption, 'coDeptHeadSupportExemption', assessmentId),
        deptHeadConfidentInIndividual: coerceYesNoOptional(cleanedMock.deptHeadConfidentInIndividual, 'deptHeadConfidentInIndividual', assessmentId),
        deptHeadConfidenceReason: cleanedMock.deptHeadConfidenceReason || null,
        employeeFamiliarizationProvided: coerceYesNoOptional(cleanedMock.employeeFamiliarizationProvided, 'employeeFamiliarizationProvided', assessmentId),
        workedInDepartmentLast12Months: coerceYesNoOptional(cleanedMock.workedInDepartmentLast12Months, 'workedInDepartmentLast12Months', assessmentId),
        workedInDepartmentDetails: cleanedMock.workedInDepartmentDetails || null,
        similarResponsibilityExperience: coerceYesNoOptional(cleanedMock.similarResponsibilityExperience, 'similarResponsibilityExperience', assessmentId),
        similarResponsibilityDetails: cleanedMock.similarResponsibilityDetails || null,
        individualHasRequiredSeaService: coerceYesNoOptional(cleanedMock.individualHasRequiredSeaService, 'individualHasRequiredSeaService', assessmentId),
        individualWorkingTowardsCertification: coerceYesNoOptional(cleanedMock.individualWorkingTowardsCertification, 'individualWorkingTowardsCertification', assessmentId),
        certificationProgressSummary: cleanedMock.certificationProgressSummary || null,
        
        requestCausesVacancyElsewhere: coerceYesNoOptional(cleanedMock.requestCausesVacancyElsewhere, 'requestCausesVacancyElsewhere', assessmentId),
        crewCompositionSufficientForSafety: coerceYesNoOptional(cleanedMock.crewCompositionSufficientForSafety, 'crewCompositionSufficientForSafety', assessmentId),
        detailedCrewCompetencyAssessment: cleanedMock.detailedCrewCompetencyAssessment || null,
        crewContinuityAsPerProfile: coerceYesNoOptional(cleanedMock.crewContinuityAsPerProfile, 'crewContinuityAsPerProfile', assessmentId),
        crewContinuityDetails: cleanedMock.crewContinuityDetails || null,
        specialVoyageConsiderations: cleanedMock.specialVoyageConsiderations || null,
        reductionInVesselProgramRequirements: coerceYesNoOptional(cleanedMock.reductionInVesselProgramRequirements, 'reductionInVesselProgramRequirements', assessmentId),
        rocNotificationOfLimitations: coerceYesNoOptional(cleanedMock.rocNotificationOfLimitations, 'rocNotificationOfLimitations', assessmentId),

        attachments: (cleanedMock.attachments || []).map((att: any) => ({
          id: String(att.id || ''),
          name: String(att.name || ''),
          url: String(att.url || ''),
          type: String(att.type || ''),
          size: typeof att.size === 'number' ? att.size : null,
          uploadedAt: safeCreateTimestamp(att.uploadedAt),
          dataAiHint: att.dataAiHint || null,
        })),
        approvalSteps: (cleanedMock.approvalSteps || []).map((step: any) => ({
          level: validateAndCoerceEnum(step.level, VALID_APPROVAL_LEVELS, `approvalSteps[${step.level}].level`, assessmentId, false),
          decision: validateAndCoerceEnum(step.decision, VALID_APPROVAL_DECISIONS, `approvalSteps[${step.level}].decision`, assessmentId),
          userId: step.userId || null,
          userName: step.userName || null,
          date: safeCreateTimestamp(step.date),
          notes: step.notes || null,
        })),
      };
      
      if (DEBUG_SIMPLIFY_RA_001 && assessmentId === 'ra-001') {
        console.log(`DEBUG: Simplifying data for assessment ${assessmentId} by emptying arrays.`);
        dataToSet.attachments = [];
        dataToSet.approvalSteps = [];
      }

      // Final check to ensure no undefined values are being sent at the top level
      const finalFirestoreData: {[key: string]: any} = {};
      for (const key in dataToSet) {
        if (Object.prototype.hasOwnProperty.call(dataToSet, key)) {
          finalFirestoreData[key] = dataToSet[key] === undefined ? null : dataToSet[key];
        }
      }
      
      const docRef = doc(db, 'riskAssessments', assessmentId);
      await setDoc(docRef, finalFirestoreData);
      console.log(`SUCCESS: Seeded assessment ${assessmentId}`);
      successCount++;
    } catch (error: any) {
      console.error(`ERROR seeding assessment ${mockAssessment.id}.`);
      console.error("Error message:", error.message);
      if (error.code) console.error("Error code:", error.code);
      // Attempt to log the object that was being processed, if it helps
      // Convert Timestamps to strings for logging if they exist in error.customData or similar
      // This is a generic way; specific error objects might have data structured differently
      const dataForLogError = { ...mockAssessment };
      if (dataForLogError.submissionDate) dataForLogError.submissionDate = String(new Date(dataForLogError.submissionDate));
      if (dataForLogError.lastModified) dataForLogError.lastModified = String(new Date(dataForLogError.lastModified));
      // Add more for nested dates if necessary for debugging
      console.error("Problematic mock data (dates as strings):", JSON.stringify(dataForLogError, null, 2));
      errorCount++;
    }
  }

  console.log('-------------------------------------');
  console.log('Database Seed Process Complete.');
  console.log(`Successfully seeded: ${successCount} assessments.`);
  console.log(`Failed to seed: ${errorCount} assessments.`);
  if (errorCount > 0) {
    console.log("Review the logged 'Problematic mock data' for assessments that failed.");
  }
  console.log('-------------------------------------');
}

seedDatabase().catch(err => {
  console.error('Unhandled critical error during seeding process:', err);
});

