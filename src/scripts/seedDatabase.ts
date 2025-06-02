
// src/scripts/seedDatabase.ts

import { db } from '@/lib/firebase';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment, YesNoOptional, VesselDepartment, VesselRegion, RiskAssessmentStatus, ApprovalDecision, ApprovalLevel } from '@/lib/types';
import { doc, setDoc, Timestamp, FieldValue, serverTimestamp } from 'firebase/firestore';
import { config } from 'dotenv';

config(); // Load environment variables from .env

const DEBUG_SIMPLIFY_RA_001 = true; // Keep this true for now

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
const VALID_YES_NO_OPTIONAL: ReadonlyArray<YesNoOptional | ''> = ['Yes', 'No', undefined, '']; // Allow empty string for initial coercion
const VALID_APPROVAL_DECISIONS: ReadonlyArray<ApprovalDecision | ''> = ['Approved', 'Rejected', 'Needs Information', '']; // Allow empty string
const VALID_APPROVAL_LEVELS: ReadonlyArray<ApprovalLevel> = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];

function validateAndCoerceEnum<T extends string>(
  value: string | undefined,
  validValues: readonly (T | '' | undefined)[], // Accept '' during coercion
  fieldName: string,
  assessmentId: string,
  isOptional: boolean = true
): T | null {
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  if (trimmedValue === undefined || trimmedValue === null || (isOptional && trimmedValue === "")) {
    return null;
  }
  if (validValues.includes(trimmedValue as T)) { // Check if the trimmed value is a valid enum
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
        return null; // Default to null if empty or undefined
    }
    console.warn(`Invalid value "${value}" (trimmed: "${trimmedValue}") for YesNoOptional field "${fieldName}" in assessment "${assessmentId}". Coercing to null.`);
    return null;
}

function cleanUndefinedRecursively(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedRecursively(item)).filter(item => item !== undefined); // Filter out undefined items from arrays
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: {[key: string]: any} = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (value !== undefined) { // Only process if value is not undefined
            const cleanedValue = cleanUndefinedRecursively(value);
            if (cleanedValue !== undefined) { // Only add if cleaned value is not undefined
                 newObj[key] = cleanedValue;
            } else {
                 newObj[key] = null; // Convert explicitly undefined nested properties to null
            }
        } else {
            newObj[key] = null; // Convert top-level undefined to null
        }
      }
    }
    return newObj;
  }
  return obj; // Return as is if not array/object or if it's null
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
    
    // Clean the entire mock assessment object first
    const cleanedMock = cleanUndefinedRecursively(mockAssessment);

    if (DEBUG_SIMPLIFY_RA_001 && assessmentId === 'ra-001') {
      console.log(`DEBUG: Radically simplifying data for assessment ${assessmentId}.`);
      dataToSet = {
        id: assessmentId,
        referenceNumber: String(cleanedMock.referenceNumber || 'REF_MISSING_MOCK'),
        vesselName: String(cleanedMock.vesselName || 'VESSEL_NAME_MISSING_MOCK'),
        status: validateAndCoerceEnum(cleanedMock.status, VALID_STATUSES, 'status', assessmentId, false) || 'Draft',
        submissionDate: safeCreateTimestamp(cleanedMock.submissionDate) || serverTimestamp(),
        lastModified: serverTimestamp(),
        // All other fields are deliberately omitted for this debug case
      };
    } else {
      // Full data construction for other assessments or if debug flag is off
      dataToSet = {
        id: assessmentId,
        referenceNumber: String(cleanedMock.referenceNumber || ''),
        maritimeExemptionNumber: (typeof cleanedMock.maritimeExemptionNumber === 'string' && cleanedMock.maritimeExemptionNumber.trim() !== "") ? cleanedMock.maritimeExemptionNumber.trim() : null,
        vesselName: String(cleanedMock.vesselName || ''),
        imoNumber: (typeof cleanedMock.imoNumber === 'string' && cleanedMock.imoNumber.trim() !== "") ? cleanedMock.imoNumber.trim() : null,
        department: validateAndCoerceEnum(cleanedMock.department, VALID_VESSEL_DEPARTMENTS, 'department', assessmentId),
        region: validateAndCoerceEnum(cleanedMock.region, VALID_VESSEL_REGIONS, 'region', assessmentId),
        
        patrolStartDate: (typeof cleanedMock.patrolStartDate === 'string' && cleanedMock.patrolStartDate.trim() !== "") ? cleanedMock.patrolStartDate.trim() : null,
        patrolEndDate: (typeof cleanedMock.patrolEndDate === 'string' && cleanedMock.patrolEndDate.trim() !== "") ? cleanedMock.patrolEndDate.trim() : null,
        patrolLengthDays: typeof cleanedMock.patrolLengthDays === 'number' ? cleanedMock.patrolLengthDays : null,
        
        voyageDetails: String(cleanedMock.voyageDetails || ''),
        reasonForRequest: String(cleanedMock.reasonForRequest || ''),
        personnelShortages: String(cleanedMock.personnelShortages || ''),
        proposedOperationalDeviations: String(cleanedMock.proposedOperationalDeviations || ''),
        submittedBy: String(cleanedMock.submittedBy || ''),
        submissionDate: safeCreateTimestamp(cleanedMock.submissionDate),
        status: validateAndCoerceEnum(cleanedMock.status, VALID_STATUSES, 'status', assessmentId, false),
        lastModified: serverTimestamp(), // Use serverTimestamp for lastModified

        aiRiskScore: typeof cleanedMock.aiRiskScore === 'number' ? cleanedMock.aiRiskScore : null,
        aiGeneratedSummary: (typeof cleanedMock.aiGeneratedSummary === 'string' && cleanedMock.aiGeneratedSummary.trim() !== "") ? cleanedMock.aiGeneratedSummary.trim() : null,
        aiSuggestedMitigations: (typeof cleanedMock.aiSuggestedMitigations === 'string' && cleanedMock.aiSuggestedMitigations.trim() !== "") ? cleanedMock.aiSuggestedMitigations.trim() : null,
        aiRegulatoryConsiderations: (typeof cleanedMock.aiRegulatoryConsiderations === 'string' && cleanedMock.aiRegulatoryConsiderations.trim() !== "") ? cleanedMock.aiRegulatoryConsiderations.trim() : null,
        aiLikelihoodScore: typeof cleanedMock.aiLikelihoodScore === 'number' ? cleanedMock.aiLikelihoodScore : null,
        aiConsequenceScore: typeof cleanedMock.aiConsequenceScore === 'number' ? cleanedMock.aiConsequenceScore : null,
        
        employeeName: (typeof cleanedMock.employeeName === 'string' && cleanedMock.employeeName.trim() !== "") ? cleanedMock.employeeName.trim() : null,
        certificateHeld: (typeof cleanedMock.certificateHeld === 'string' && cleanedMock.certificateHeld.trim() !== "") ? cleanedMock.certificateHeld.trim() : null,
        requiredCertificate: (typeof cleanedMock.requiredCertificate === 'string' && cleanedMock.requiredCertificate.trim() !== "") ? cleanedMock.requiredCertificate.trim() : null,
        
        coDeptHeadSupportExemption: coerceYesNoOptional(cleanedMock.coDeptHeadSupportExemption, 'coDeptHeadSupportExemption', assessmentId),
        deptHeadConfidentInIndividual: coerceYesNoOptional(cleanedMock.deptHeadConfidentInIndividual, 'deptHeadConfidentInIndividual', assessmentId),
        deptHeadConfidenceReason: (typeof cleanedMock.deptHeadConfidenceReason === 'string' && cleanedMock.deptHeadConfidenceReason.trim() !== "") ? cleanedMock.deptHeadConfidenceReason.trim() : null,
        employeeFamiliarizationProvided: coerceYesNoOptional(cleanedMock.employeeFamiliarizationProvided, 'employeeFamiliarizationProvided', assessmentId),
        workedInDepartmentLast12Months: coerceYesNoOptional(cleanedMock.workedInDepartmentLast12Months, 'workedInDepartmentLast12Months', assessmentId),
        workedInDepartmentDetails: (typeof cleanedMock.workedInDepartmentDetails === 'string' && cleanedMock.workedInDepartmentDetails.trim() !== "") ? cleanedMock.workedInDepartmentDetails.trim() : null,
        similarResponsibilityExperience: coerceYesNoOptional(cleanedMock.similarResponsibilityExperience, 'similarResponsibilityExperience', assessmentId),
        similarResponsibilityDetails: (typeof cleanedMock.similarResponsibilityDetails === 'string' && cleanedMock.similarResponsibilityDetails.trim() !== "") ? cleanedMock.similarResponsibilityDetails.trim() : null,
        individualHasRequiredSeaService: coerceYesNoOptional(cleanedMock.individualHasRequiredSeaService, 'individualHasRequiredSeaService', assessmentId),
        individualWorkingTowardsCertification: coerceYesNoOptional(cleanedMock.individualWorkingTowardsCertification, 'individualWorkingTowardsCertification', assessmentId),
        certificationProgressSummary: (typeof cleanedMock.certificationProgressSummary === 'string' && cleanedMock.certificationProgressSummary.trim() !== "") ? cleanedMock.certificationProgressSummary.trim() : null,
        
        requestCausesVacancyElsewhere: coerceYesNoOptional(cleanedMock.requestCausesVacancyElsewhere, 'requestCausesVacancyElsewhere', assessmentId),
        crewCompositionSufficientForSafety: coerceYesNoOptional(cleanedMock.crewCompositionSufficientForSafety, 'crewCompositionSufficientForSafety', assessmentId),
        detailedCrewCompetencyAssessment: (typeof cleanedMock.detailedCrewCompetencyAssessment === 'string' && cleanedMock.detailedCrewCompetencyAssessment.trim() !== "") ? cleanedMock.detailedCrewCompetencyAssessment.trim() : null,
        crewContinuityAsPerProfile: coerceYesNoOptional(cleanedMock.crewContinuityAsPerProfile, 'crewContinuityAsPerProfile', assessmentId),
        crewContinuityDetails: (typeof cleanedMock.crewContinuityDetails === 'string' && cleanedMock.crewContinuityDetails.trim() !== "") ? cleanedMock.crewContinuityDetails.trim() : null,
        
        specialVoyageConsiderations: (typeof cleanedMock.specialVoyageConsiderations === 'string' && cleanedMock.specialVoyageConsiderations.trim() !== "") ? cleanedMock.specialVoyageConsiderations.trim() : null,
        reductionInVesselProgramRequirements: coerceYesNoOptional(cleanedMock.reductionInVesselProgramRequirements, 'reductionInVesselProgramRequirements', assessmentId),
        rocNotificationOfLimitations: coerceYesNoOptional(cleanedMock.rocNotificationOfLimitations, 'rocNotificationOfLimitations', assessmentId),

        attachments: Array.isArray(cleanedMock.attachments) ? cleanedMock.attachments.map((att: any) => ({
          id: String(att.id || ''),
          name: String(att.name || ''),
          url: String(att.url || ''),
          type: String(att.type || ''),
          size: typeof att.size === 'number' ? att.size : null,
          uploadedAt: safeCreateTimestamp(att.uploadedAt),
          dataAiHint: (typeof att.dataAiHint === 'string' && att.dataAiHint.trim() !== "") ? att.dataAiHint.trim() : null,
        })) : [],
        approvalSteps: Array.isArray(cleanedMock.approvalSteps) ? cleanedMock.approvalSteps.map((step: any) => ({
          level: validateAndCoerceEnum(step.level, VALID_APPROVAL_LEVELS, `approvalSteps[${step.level}].level`, assessmentId, false),
          decision: validateAndCoerceEnum(step.decision, VALID_APPROVAL_DECISIONS, `approvalSteps[${step.level}].decision`, assessmentId),
          userId: (typeof step.userId === 'string' && step.userId.trim() !== "") ? step.userId.trim() : null,
          userName: (typeof step.userName === 'string' && step.userName.trim() !== "") ? step.userName.trim() : null,
          date: safeCreateTimestamp(step.date),
          notes: (typeof step.notes === 'string' && step.notes.trim() !== "") ? step.notes.trim() : null,
        })) : [],
      };
    }
    
    // Ensure no undefined values are sent to Firestore at the top level.
    const finalFirestoreData: {[key: string]: any} = {};
    for (const key in dataToSet) {
      if (Object.prototype.hasOwnProperty.call(dataToSet, key)) {
        finalFirestoreData[key] = dataToSet[key] === undefined ? null : dataToSet[key];
      }
    }

    try {
      const docRef = doc(db, 'riskAssessments', assessmentId);
      
      // Log the exact data object being sent to Firestore
      const replacerForLog = (key: string, value: any) => {
        if (value instanceof Timestamp) {
          return `Timestamp(${value.toDate().toISOString()})`;
        }
        if (value && typeof value === 'object' && typeof value.isEqual === 'function' && value.type === 'serverTimestamp') { // Basic check for FieldValue.serverTimestamp()
            return 'FieldValue.serverTimestamp()';
        }
        return value;
      };
      console.log(`Attempting to set document ${assessmentId} with data:`, JSON.stringify(finalFirestoreData, replacerForLog, 2));
      
      await setDoc(docRef, finalFirestoreData);
      console.log(`SUCCESS: Seeded assessment ${assessmentId}`);
      successCount++;
    } catch (error: any) {
      console.error(`ERROR seeding assessment ${assessmentId}.`);
      console.error("Error message:", error.message);
      if (error.code) console.error("Error code:", error.code);
      
      const replacer = (key: string, value: any) => {
        if (value instanceof Timestamp) {
          return `Timestamp(${value.toDate().toISOString()})`;
        }
        if (value && typeof value === 'object' && typeof value.isEqual === 'function' && value.type === 'serverTimestamp') { // Basic check for FieldValue.serverTimestamp()
            return 'FieldValue.serverTimestamp()';
        }
        return value;
      };
      console.error("Data object ATTEMPTED for setDoc (from catch block):", JSON.stringify(finalFirestoreData, replacer, 2));
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
