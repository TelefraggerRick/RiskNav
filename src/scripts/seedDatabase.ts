
// src/scripts/seedDatabase.ts
import { admin, dbAdmin } from '@/lib/firebaseAdmin'; // Use firebase-admin
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment, YesNoOptional, VesselDepartment, VesselRegion, RiskAssessmentStatus, ApprovalDecision, ApprovalLevel } from '@/lib/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore'; // Import from firebase-admin/firestore

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
  } catch (error: any) {
    console.warn(`Error parsing date string "${dateString}" for Timestamp:`, error.message, ". Storing as null.");
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
  } else if (obj instanceof Date || obj instanceof Timestamp || (obj && typeof obj === 'object' && obj._methodName && typeof obj._methodName === 'string' && (obj._methodName.includes('timestamp') || obj._methodName.includes('FieldValue')) ) ) {
    return obj;
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: {[key: string]: any} = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        // Firestore cannot store `undefined` directly.
        // Also, don't store internal properties of mock File objects if they slip through.
        if (value !== undefined && key !== 'file') {
          newObj[key] = cleanUndefinedRecursively(value);
        } else if (value === undefined) {
          newObj[key] = null; // Explicitly set undefined to null
        }
      }
    }
    return newObj;
  }
  return obj;
}

const VALID_VESSEL_DEPARTMENTS: ReadonlyArray<VesselDepartment | '' | null | undefined> = ['Navigation', 'Deck', 'Engine Room', 'Logistics', 'Other', '', null, undefined];
const VALID_VESSEL_REGIONS: ReadonlyArray<VesselRegion | '' | null | undefined> = ['Atlantic', 'Central', 'Western', 'Arctic', '', null, undefined];
const VALID_STATUSES: ReadonlyArray<RiskAssessmentStatus | '' | null | undefined> = ['Draft', 'Pending Crewing Standards and Oversight', 'Pending Senior Director', 'Pending Director General', 'Needs Information', 'Approved', 'Rejected', '', null, undefined];
const VALID_YES_NO_OPTIONAL: ReadonlyArray<YesNoOptional | '' | null | undefined> = ['Yes', 'No', null, undefined, ''];
const VALID_APPROVAL_DECISIONS: ReadonlyArray<ApprovalDecision | '' | null | undefined> = ['Approved', 'Rejected', 'Needs Information', '', null, undefined];
const VALID_APPROVAL_LEVELS: ReadonlyArray<ApprovalLevel> = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];


function validateAndCoerceEnum<T extends string>(
  value: any,
  validValues: readonly (T | '' | null | undefined)[],
  fieldName: string,
  assessmentId: string,
  allowNullOrEmpty: boolean = true,
  defaultValue?: T
): T | null {
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  if (trimmedValue === undefined || trimmedValue === null || (allowNullOrEmpty && trimmedValue === "")) {
    return null;
  }
  if (validValues.some(valid => typeof valid === 'string' && valid === trimmedValue)) {
    return trimmedValue as T;
  }
  console.warn(`Invalid value "${value}" (trimmed: "${trimmedValue}") for enum field "${fieldName}" in assessment "${assessmentId}". Coercing to ${defaultValue !== undefined ? `default value "${defaultValue}"` : 'null'}.`);
  return defaultValue !== undefined ? defaultValue : null;
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

const replacerForLog = (key: string, value: any) => {
  if (value instanceof Timestamp) {
    return `FirestoreTimestamp(seconds=${value.seconds}, nanoseconds=${value.nanoseconds})`;
  }
  if (value instanceof Date) {
    return value.toISOString(); // Log native dates as ISO strings
  }
  if (value && typeof value === 'object' && value._methodName && value._methodName.startsWith('FieldValue.')) {
      return value._methodName; // For FieldValue.serverTimestamp()
  }
  return value;
};


async function seedDatabase() {
  console.log('Starting database seed process with firebase-admin...');
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error("Firebase project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not configured in .env file. Aborting seed.");
    return;
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for firebase-admin. Aborting seed.");
    return;
  }
  
  if (!dbAdmin) {
    console.error("Firestore admin instance (dbAdmin) is not available. Aborting seed. Check firebaseAdmin.ts initialization and logs.");
    return;
  }

  console.log(`Targeting Firebase project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`Using service account key from: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);


  let successCount = 0;
  let errorCount = 0;

  // Test with one minimal, hardcoded document first
  const TEST_DOCUMENT_ID = 'test-from-script-001-admin';
  let testDataToSet: any = {
    testName: "Admin SDK Minimal Script Test",
    testStatus: "Draft", // A valid enum value
    testDate: new Date(), // Native JS Date, Admin SDK will convert
    serverTimestampField: FieldValue.serverTimestamp() // Use FieldValue from admin SDK
  };

  console.log(`Attempting initial test write for document ID: ${TEST_DOCUMENT_ID}`);
  console.log(`Attempting to set document ${TEST_DOCUMENT_ID} with data:`, JSON.stringify(testDataToSet, replacerForLog, 2));

  try {
    const docRef = dbAdmin.collection('riskAssessments').doc(TEST_DOCUMENT_ID);
    await docRef.set(testDataToSet);
    console.log(`SUCCESS: Seeded test document ${TEST_DOCUMENT_ID} using admin SDK.`);
    successCount++;
  } catch (error: any) {
    console.error(`ERROR seeding test document ${TEST_DOCUMENT_ID} using admin SDK.`);
    console.error("Error message:", error.message);
    if (error.code) console.error("Error code:", error.code);
    if (error.details) console.error("Error details:", error.details);
    console.error("Data object ATTEMPTED for setDoc (from catch block):", JSON.stringify(testDataToSet, replacerForLog, 2));
    errorCount++;
  }

  if (errorCount > 0 && successCount === 0) {
    console.log("Initial test write with admin SDK failed. Aborting seeding of mock data.");
    console.log('-------------------------------------');
    console.log('Database Seed Process Finished (with errors).');
    console.log(`Successfully seeded: ${successCount} assessments.`);
    console.log(`Failed to seed: ${errorCount} assessments.`);
    console.log('-------------------------------------');
    return;
  } else if (successCount > 0) {
     console.log("Initial test write with admin SDK SUCCEEDED. Proceeding with mock data...");
  } else {
     console.log("Initial test write with admin SDK state is indeterminate. Proceeding with caution for mock data...");
  }


  for (const mockAssessment of mockRiskAssessments) {
    const assessmentId = mockAssessment.id;
    console.log(`Processing assessment: ${assessmentId} - ${mockAssessment.vesselName}`);

    const cleanedMockInitial = cleanUndefinedRecursively(mockAssessment);
    
    let dataToSet: any = {
      id: String(cleanedMockInitial.id || assessmentId),
      referenceNumber: String(cleanedMockInitial.referenceNumber || ''),
      maritimeExemptionNumber: cleanedMockInitial.maritimeExemptionNumber ? String(cleanedMockInitial.maritimeExemptionNumber) : null,
      vesselName: String(cleanedMockInitial.vesselName || ''),
      imoNumber: cleanedMockInitial.imoNumber ? String(cleanedMockInitial.imoNumber) : null,
      department: validateAndCoerceEnum(cleanedMockInitial.department, VALID_VESSEL_DEPARTMENTS, 'department', assessmentId),
      region: validateAndCoerceEnum(cleanedMockInitial.region, VALID_VESSEL_REGIONS, 'region', assessmentId),
      patrolStartDate: cleanedMockInitial.patrolStartDate ? String(cleanedMockInitial.patrolStartDate) : null,
      patrolEndDate: cleanedMockInitial.patrolEndDate ? String(cleanedMockInitial.patrolEndDate) : null,
      patrolLengthDays: typeof cleanedMockInitial.patrolLengthDays === 'number' ? cleanedMockInitial.patrolLengthDays : null,
      voyageDetails: String(cleanedMockInitial.voyageDetails || ''),
      reasonForRequest: String(cleanedMockInitial.reasonForRequest || ''),
      personnelShortages: String(cleanedMockInitial.personnelShortages || ''),
      proposedOperationalDeviations: String(cleanedMockInitial.proposedOperationalDeviations || ''),
      submittedBy: String(cleanedMockInitial.submittedBy || ''),
      submissionDate: safeCreateTimestamp(cleanedMockInitial.submissionDate),
      status: validateAndCoerceEnum(cleanedMockInitial.status, VALID_STATUSES, 'status', assessmentId, false, 'Draft'),
      
      aiRiskScore: typeof cleanedMockInitial.aiRiskScore === 'number' ? cleanedMockInitial.aiRiskScore : null,
      aiGeneratedSummary: cleanedMockInitial.aiGeneratedSummary ? String(cleanedMockInitial.aiGeneratedSummary) : null,
      aiSuggestedMitigations: cleanedMockInitial.aiSuggestedMitigations ? String(cleanedMockInitial.aiSuggestedMitigations) : null,
      aiRegulatoryConsiderations: cleanedMockInitial.aiRegulatoryConsiderations ? String(cleanedMockInitial.aiRegulatoryConsiderations) : null,
      aiLikelihoodScore: typeof cleanedMockInitial.aiLikelihoodScore === 'number' ? cleanedMockInitial.aiLikelihoodScore : null,
      aiConsequenceScore: typeof cleanedMockInitial.aiConsequenceScore === 'number' ? cleanedMockInitial.aiConsequenceScore : null,
      
      lastModified: FieldValue.serverTimestamp(),

      employeeName: cleanedMockInitial.employeeName ? String(cleanedMockInitial.employeeName) : null,
      certificateHeld: cleanedMockInitial.certificateHeld ? String(cleanedMockInitial.certificateHeld) : null,
      requiredCertificate: cleanedMockInitial.requiredCertificate ? String(cleanedMockInitial.requiredCertificate) : null,
      coDeptHeadSupportExemption: coerceYesNoOptional(cleanedMockInitial.coDeptHeadSupportExemption, 'coDeptHeadSupportExemption', assessmentId),
      deptHeadConfidentInIndividual: coerceYesNoOptional(cleanedMockInitial.deptHeadConfidentInIndividual, 'deptHeadConfidentInIndividual', assessmentId),
      deptHeadConfidenceReason: cleanedMockInitial.deptHeadConfidenceReason ? String(cleanedMockInitial.deptHeadConfidenceReason) : null,
      employeeFamiliarizationProvided: coerceYesNoOptional(cleanedMockInitial.employeeFamiliarizationProvided, 'employeeFamiliarizationProvided', assessmentId),
      workedInDepartmentLast12Months: coerceYesNoOptional(cleanedMockInitial.workedInDepartmentLast12Months, 'workedInDepartmentLast12Months', assessmentId),
      workedInDepartmentDetails: cleanedMockInitial.workedInDepartmentDetails ? String(cleanedMockInitial.workedInDepartmentDetails) : null,
      similarResponsibilityExperience: coerceYesNoOptional(cleanedMockInitial.similarResponsibilityExperience, 'similarResponsibilityExperience', assessmentId),
      similarResponsibilityDetails: cleanedMockInitial.similarResponsibilityDetails ? String(cleanedMockInitial.similarResponsibilityDetails) : null,
      individualHasRequiredSeaService: coerceYesNoOptional(cleanedMockInitial.individualHasRequiredSeaService, 'individualHasRequiredSeaService', assessmentId),
      individualWorkingTowardsCertification: coerceYesNoOptional(cleanedMockInitial.individualWorkingTowardsCertification, 'individualWorkingTowardsCertification', assessmentId),
      certificationProgressSummary: cleanedMockInitial.certificationProgressSummary ? String(cleanedMockInitial.certificationProgressSummary) : null,
      
      requestCausesVacancyElsewhere: coerceYesNoOptional(cleanedMockInitial.requestCausesVacancyElsewhere, 'requestCausesVacancyElsewhere', assessmentId),
      crewCompositionSufficientForSafety: coerceYesNoOptional(cleanedMockInitial.crewCompositionSufficientForSafety, 'crewCompositionSufficientForSafety', assessmentId),
      detailedCrewCompetencyAssessment: cleanedMockInitial.detailedCrewCompetencyAssessment ? String(cleanedMockInitial.detailedCrewCompetencyAssessment) : null,
      crewContinuityAsPerProfile: coerceYesNoOptional(cleanedMockInitial.crewContinuityAsPerProfile, 'crewContinuityAsPerProfile', assessmentId),
      crewContinuityDetails: cleanedMockInitial.crewContinuityDetails ? String(cleanedMockInitial.crewContinuityDetails) : null,
      specialVoyageConsiderations: cleanedMockInitial.specialVoyageConsiderations ? String(cleanedMockInitial.specialVoyageConsiderations) : null,
      reductionInVesselProgramRequirements: coerceYesNoOptional(cleanedMockInitial.reductionInVesselProgramRequirements, 'reductionInVesselProgramRequirements', assessmentId),
      rocNotificationOfLimitations: coerceYesNoOptional(cleanedMockInitial.rocNotificationOfLimitations, 'rocNotificationOfLimitations', assessmentId),

      attachments: (cleanedMockInitial.attachments || []).map((att: any) => ({
        id: String(att.id || ''),
        name: String(att.name || ''),
        url: String(att.url || '#'),
        type: String(att.type || ''),
        size: typeof att.size === 'number' ? att.size : 0,
        uploadedAt: safeCreateTimestamp(att.uploadedAt),
        dataAiHint: att.dataAiHint ? String(att.dataAiHint) : null,
      })).filter((att: Attachment) => att.id && att.name),

      approvalSteps: (cleanedMockInitial.approvalSteps || []).map((step: any) => ({
        level: validateAndCoerceEnum(step.level, VALID_APPROVAL_LEVELS, 'approvalStep.level', assessmentId, false, 'Crewing Standards and Oversight'),
        decision: validateAndCoerceEnum(step.decision, VALID_APPROVAL_DECISIONS, 'approvalStep.decision', assessmentId),
        userId: step.userId ? String(step.userId) : null,
        userName: step.userName ? String(step.userName) : null,
        date: safeCreateTimestamp(step.date),
        notes: step.notes ? String(step.notes) : null,
      })).filter((step: ApprovalStep) => step.level),
    };
    
    for (const key in dataToSet) {
      if (dataToSet[key] === undefined) {
        dataToSet[key] = null;
      }
    }

    const docRef = dbAdmin.collection('riskAssessments').doc(assessmentId);
    console.log(`Attempting to set document ${assessmentId} with data:`, JSON.stringify(dataToSet, replacerForLog, 2).substring(0, 1000) + (JSON.stringify(dataToSet, replacerForLog, 2).length > 1000 ? "..." : ""));

    try {
      await docRef.set(dataToSet);
      console.log(`SUCCESS: Seeded assessment ${assessmentId} using admin SDK.`);
      successCount++;
    } catch (error: any) {
      console.error(`ERROR seeding assessment ${assessmentId} using admin SDK.`);
      console.error("Error message:", error.message);
      if (error.code) console.error("Error code:", error.code);
      if (error.details) console.error("Error details:", error.details);
      console.error("Data object ATTEMPTED for setDoc (from catch block):", JSON.stringify(dataToSet, replacerForLog, 2));
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
  // Potentially exit here if it's a script context
  // process.exit(1); 
});
