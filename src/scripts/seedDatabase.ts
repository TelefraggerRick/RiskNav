
// src/scripts/seedDatabase.ts

import { db } from '@/lib/firebase'; // Ensure this path is correct
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment, YesNoOptional, VesselDepartment, VesselRegion, RiskAssessmentStatus, ApprovalDecision, ApprovalLevel } from '@/lib/types';
import { doc, setDoc, Timestamp, FieldValue, serverTimestamp } from 'firebase/firestore';
import { config } from 'dotenv';

config(); // Load environment variables from .env

const DEBUG_SIMPLIFY_RA_001 = true; // <-- DEBUG FLAG: Set to true to test ra-001 with minimal fields

// --- Helper to safely create Firestore Timestamps from date strings ---
function safeCreateTimestamp(dateString: string | undefined): Timestamp | null {
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

const VALID_VESSEL_DEPARTMENTS: ReadonlyArray<VesselDepartment> = ['Navigation', 'Deck', 'Engine Room', 'Logistics', 'Other'];
const VALID_VESSEL_REGIONS: ReadonlyArray<VesselRegion> = ['Atlantic', 'Central', 'Western', 'Arctic'];
const VALID_STATUSES: ReadonlyArray<RiskAssessmentStatus> = ['Draft', 'Pending Crewing Standards and Oversight', 'Pending Senior Director', 'Pending Director General', 'Needs Information', 'Approved', 'Rejected'];
const VALID_YES_NO_OPTIONAL: ReadonlyArray<YesNoOptional | ''> = ['Yes', 'No', undefined, ''];
const VALID_APPROVAL_DECISIONS: ReadonlyArray<ApprovalDecision | ''> = ['Approved', 'Rejected', 'Needs Information', ''];
const VALID_APPROVAL_LEVELS: ReadonlyArray<ApprovalLevel> = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];


function validateAndCoerceEnum<T extends string>(
  value: string | undefined,
  validValues: readonly (T | '' | undefined)[],
  fieldName: string,
  assessmentId: string,
  isOptional: boolean = true
): T | null {
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  if (trimmedValue === undefined || trimmedValue === null || (isOptional && trimmedValue === "")) {
    return null;
  }
  // Check if the trimmed value is one of the valid enum values
  if (validValues.some(valid => valid === trimmedValue)) {
    // Ensure we don't return an empty string if it's not a valid enum value itself,
    // but was used for coercion check. This check is a bit redundant now with the .some above.
    return trimmedValue === "" && !validValues.includes("" as T) ? null : (trimmedValue as T);
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
    return obj.map(item => cleanUndefinedRecursively(item)).filter(item => item !== null); // Filter out nulls if they were originally undefined in an array context
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: {[key: string]: any} = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const cleanedValue = cleanUndefinedRecursively(value);
        if (cleanedValue !== undefined) { // Only add the key if the cleaned value is not undefined
          newObj[key] = cleanedValue === undefined ? null : cleanedValue; // Ensure final undefined becomes null
        }
      }
    }
    return newObj;
  }
  return obj === undefined ? null : obj;
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

      const cleanedMock = cleanUndefinedRecursively(mockAssessment);
      
      let dataToSet: any = {};

      if (DEBUG_SIMPLIFY_RA_001 && assessmentId === 'ra-001') {
        console.log(`DEBUG: Radically simplifying data for assessment ${assessmentId}.`);
        dataToSet = {
          id: assessmentId,
          referenceNumber: String(cleanedMock.referenceNumber || 'REF_MISSING_IN_MOCK'),
          vesselName: String(cleanedMock.vesselName || 'VESSEL_NAME_MISSING_IN_MOCK'),
          status: validateAndCoerceEnum(cleanedMock.status, VALID_STATUSES, 'status', assessmentId, false) || 'Draft', // Fallback to a valid default
          submissionDate: safeCreateTimestamp(cleanedMock.submissionDate) || serverTimestamp(), // Fallback to serverTimestamp
          lastModified: serverTimestamp(),
          // All other fields are deliberately omitted for this debug case
        };
      } else {
        // Full data construction for other assessments or if debug flag is off
        dataToSet = {
          id: assessmentId,
          referenceNumber: String(cleanedMock.referenceNumber || ''),
          maritimeExemptionNumber: cleanedMock.maritimeExemptionNumber && String(cleanedMock.maritimeExemptionNumber).trim() !== "" ? String(cleanedMock.maritimeExemptionNumber).trim() : null,
          vesselName: String(cleanedMock.vesselName || ''),
          imoNumber: cleanedMock.imoNumber && String(cleanedMock.imoNumber).trim() !== "" ? String(cleanedMock.imoNumber).trim() : null,
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
          status: validateAndCoerceEnum(cleanedMock.status, VALID_STATUSES, 'status', assessmentId, false),
          lastModified: serverTimestamp(),
          aiRiskScore: typeof cleanedMock.aiRiskScore === 'number' ? cleanedMock.aiRiskScore : null,
          aiGeneratedSummary: cleanedMock.aiGeneratedSummary && String(cleanedMock.aiGeneratedSummary).trim() !== "" ? String(cleanedMock.aiGeneratedSummary).trim() : null,
          aiSuggestedMitigations: cleanedMock.aiSuggestedMitigations && String(cleanedMock.aiSuggestedMitigations).trim() !== "" ? String(cleanedMock.aiSuggestedMitigations).trim() : null,
          aiRegulatoryConsiderations: cleanedMock.aiRegulatoryConsiderations && String(cleanedMock.aiRegulatoryConsiderations).trim() !== "" ? String(cleanedMock.aiRegulatoryConsiderations).trim() : null,
          aiLikelihoodScore: typeof cleanedMock.aiLikelihoodScore === 'number' ? cleanedMock.aiLikelihoodScore : null,
          aiConsequenceScore: typeof cleanedMock.aiConsequenceScore === 'number' ? cleanedMock.aiConsequenceScore : null,
          employeeName: cleanedMock.employeeName && String(cleanedMock.employeeName).trim() !== "" ? String(cleanedMock.employeeName).trim() : null,
          certificateHeld: cleanedMock.certificateHeld && String(cleanedMock.certificateHeld).trim() !== "" ? String(cleanedMock.certificateHeld).trim() : null,
          requiredCertificate: cleanedMock.requiredCertificate && String(cleanedMock.requiredCertificate).trim() !== "" ? String(cleanedMock.requiredCertificate).trim() : null,
          coDeptHeadSupportExemption: coerceYesNoOptional(cleanedMock.coDeptHeadSupportExemption, 'coDeptHeadSupportExemption', assessmentId),
          deptHeadConfidentInIndividual: coerceYesNoOptional(cleanedMock.deptHeadConfidentInIndividual, 'deptHeadConfidentInIndividual', assessmentId),
          deptHeadConfidenceReason: cleanedMock.deptHeadConfidenceReason && String(cleanedMock.deptHeadConfidenceReason).trim() !== "" ? String(cleanedMock.deptHeadConfidenceReason).trim() : null,
          employeeFamiliarizationProvided: coerceYesNoOptional(cleanedMock.employeeFamiliarizationProvided, 'employeeFamiliarizationProvided', assessmentId),
          workedInDepartmentLast12Months: coerceYesNoOptional(cleanedMock.workedInDepartmentLast12Months, 'workedInDepartmentLast12Months', assessmentId),
          workedInDepartmentDetails: cleanedMock.workedInDepartmentDetails && String(cleanedMock.workedInDepartmentDetails).trim() !== "" ? String(cleanedMock.workedInDepartmentDetails).trim() : null,
          similarResponsibilityExperience: coerceYesNoOptional(cleanedMock.similarResponsibilityExperience, 'similarResponsibilityExperience', assessmentId),
          similarResponsibilityDetails: cleanedMock.similarResponsibilityDetails && String(cleanedMock.similarResponsibilityDetails).trim() !== "" ? String(cleanedMock.similarResponsibilityDetails).trim() : null,
          individualHasRequiredSeaService: coerceYesNoOptional(cleanedMock.individualHasRequiredSeaService, 'individualHasRequiredSeaService', assessmentId),
          individualWorkingTowardsCertification: coerceYesNoOptional(cleanedMock.individualWorkingTowardsCertification, 'individualWorkingTowardsCertification', assessmentId),
          certificationProgressSummary: cleanedMock.certificationProgressSummary && String(cleanedMock.certificationProgressSummary).trim() !== "" ? String(cleanedMock.certificationProgressSummary).trim() : null,
          requestCausesVacancyElsewhere: coerceYesNoOptional(cleanedMock.requestCausesVacancyElsewhere, 'requestCausesVacancyElsewhere', assessmentId),
          crewCompositionSufficientForSafety: coerceYesNoOptional(cleanedMock.crewCompositionSufficientForSafety, 'crewCompositionSufficientForSafety', assessmentId),
          detailedCrewCompetencyAssessment: cleanedMock.detailedCrewCompetencyAssessment && String(cleanedMock.detailedCrewCompetencyAssessment).trim() !== "" ? String(cleanedMock.detailedCrewCompetencyAssessment).trim() : null,
          crewContinuityAsPerProfile: coerceYesNoOptional(cleanedMock.crewContinuityAsPerProfile, 'crewContinuityAsPerProfile', assessmentId),
          crewContinuityDetails: cleanedMock.crewContinuityDetails && String(cleanedMock.crewContinuityDetails).trim() !== "" ? String(cleanedMock.crewContinuityDetails).trim() : null,
          specialVoyageConsiderations: cleanedMock.specialVoyageConsiderations && String(cleanedMock.specialVoyageConsiderations).trim() !== "" ? String(cleanedMock.specialVoyageConsiderations).trim() : null,
          reductionInVesselProgramRequirements: coerceYesNoOptional(cleanedMock.reductionInVesselProgramRequirements, 'reductionInVesselProgramRequirements', assessmentId),
          rocNotificationOfLimitations: coerceYesNoOptional(cleanedMock.rocNotificationOfLimitations, 'rocNotificationOfLimitations', assessmentId),
          attachments: (cleanedMock.attachments || []).map((att: any) => ({
            id: String(att.id || ''),
            name: String(att.name || ''),
            url: String(att.url || ''),
            type: String(att.type || ''),
            size: typeof att.size === 'number' ? att.size : null, // Ensure number or null
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
      }
      
      // Final check: ensure no undefined values are sent to Firestore at the top level.
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
      
      // Log the data object that caused the error
      const dataForLogError = { ...mockAssessment };
      // Convert Timestamp and FieldValue to string for readable log
      const replacer = (key: string, value: any) => {
        if (value instanceof Timestamp) {
          return `Timestamp(${value.toDate().toISOString()})`;
        }
        if (value && typeof value === 'object' && value.isEqual && value.type === 'serverTimestamp') { // Basic check for FieldValue.serverTimestamp()
            return 'FieldValue.serverTimestamp()';
        }
        return value;
      };
      console.error("Data object attempted for setDoc:", JSON.stringify(dataToSet, replacer, 2));
      errorCount++;
    }
  }

  console.log('-------------------------------------');
  console.log('Database Seed Process Complete.');
  console.log(`Successfully seeded: ${successCount} assessments.`);
  console.log(`Failed to seed: ${errorCount} assessments.`);
  if (errorCount > 0) {
    console.log("Review the logged 'Data object attempted for setDoc' for assessments that failed.");
  }
  console.log('-------------------------------------');
}

seedDatabase().catch(err => {
  console.error('Unhandled critical error during seeding process:', err);
});

    

    