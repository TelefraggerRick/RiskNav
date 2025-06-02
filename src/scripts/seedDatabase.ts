
// src/scripts/seedDatabase.ts

import { db } from '@/lib/firebase';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment, YesNoOptional, VesselDepartment, VesselRegion, RiskAssessmentStatus, ApprovalDecision, ApprovalLevel } from '@/lib/types';
import { doc, setDoc, Timestamp, FieldValue, serverTimestamp } from 'firebase/firestore';
import { config } from 'dotenv';

config(); // Load environment variables from .env

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
  } else if (obj instanceof Date || obj instanceof Timestamp || (obj && typeof obj === 'object' && '_methodName' in obj && typeof obj._methodName === 'string' && obj._methodName.includes('timestamp'))) {
    // Do not recurse into Date, Timestamp, or FieldValue objects
    return obj;
  } else if (typeof obj === 'object' && obj !== null) {
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
const VALID_YES_NO_OPTIONAL: ReadonlyArray<YesNoOptional | '' | null | undefined> = ['Yes', 'No', null, undefined, ''];
const VALID_APPROVAL_DECISIONS: ReadonlyArray<ApprovalDecision | '' | null | undefined> = ['Approved', 'Rejected', 'Needs Information', '', null, undefined];
const VALID_APPROVAL_LEVELS: ReadonlyArray<ApprovalLevel> = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];

function validateAndCoerceEnum<T extends string>(
  value: any,
  validValues: readonly (T | '' | null | undefined)[],
  fieldName: string,
  assessmentId: string,
  allowNullOrEmpty: boolean = true
): T | null {
  const trimmedValue = typeof value === 'string' ? value.trim() : value;

  if (trimmedValue === undefined || trimmedValue === null || (allowNullOrEmpty && trimmedValue === "")) {
    return null;
  }
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

  // Test with only the first assessment as an ultra-minimal, hardcoded document
  const firstMockAssessment = mockRiskAssessments[0];
  if (!firstMockAssessment) {
    console.log("No mock assessments found to process. Exiting.");
    return;
  }

  const testDocId = 'test-from-script-001';
  console.log(`Attempting a single, hardcoded write for document ID: ${testDocId}`);

  const hardcodedDataToSet: any = {
    testName: "Minimal Script Test",
    testStatus: "Draft", // Directly using a valid enum string
    testDate: new Date(), // Native JS Date, SDK will convert
    serverTimestampField: serverTimestamp() // Using FieldValue.serverTimestamp()
  };

  // Log the object being sent
  const replacerForLog = (key: string, value: any) => {
    if (value instanceof Timestamp) {
      return `FirestoreTimestamp(seconds=${value.seconds}, nanoseconds=${value.nanoseconds})`;
    }
    if (value instanceof Date) {
      return `NativeDate(${value.toISOString()})`;
    }
    if (value && typeof value === 'object' && '_methodName' in value && typeof value._methodName === 'string' && (value._methodName.includes('timestamp') || value._methodName.includes('delete') || value._methodName.includes('arrayUnion') || value._methodName.includes('arrayRemove') || value._methodName.includes('increment'))) {
        return `FieldValue.${value._methodName}()`;
    }
    return value;
  };
  console.log(`Attempting to set document ${testDocId} with data:`, JSON.stringify(hardcodedDataToSet, replacerForLog, 2));

  try {
    const docRef = doc(db, 'riskAssessments', testDocId);
    await setDoc(docRef, hardcodedDataToSet);
    console.log(`SUCCESS: Seeded test document ${testDocId}`);
    successCount++;
  } catch (error: any) {
    console.error(`ERROR seeding test document ${testDocId}.`);
    console.error("Error message:", error.message);
    if (error.code) console.error("Error code:", error.code);
    console.error("Data object ATTEMPTED for setDoc (from catch block):", JSON.stringify(hardcodedDataToSet, replacerForLog, 2));
    errorCount++;
  }


  // The rest of the loop is effectively skipped for this test by focusing on the single hardcoded write above.
  // If the above hardcoded write works, we can re-enable the loop.
  if (successCount === 0 && errorCount > 0) {
     console.log("The initial hardcoded test write failed. Skipping other assessments.");
  } else if (successCount > 0) {
    console.log("Initial hardcoded test write SUCCEEDED. You can now try uncommenting the main loop to seed all data if desired.");
  } else {
     console.log("Initial hardcoded test write seems to have neither succeeded nor explicitly failed in a way caught by the script. This is unexpected.");
  }

  // Keep the main loop commented out or conditional for now
  /*
  for (const mockAssessment of mockRiskAssessments) {
    const assessmentId = mockAssessment.id;
    console.log(`Processing assessment: ${assessmentId} - ${mockAssessment.vesselName}`);

    const cleanedMockInitial = cleanUndefinedRecursively(mockAssessment);
    let dataToSet: any = {};

    // ... (rest of the complex data preparation logic from previous versions) ...
    // This part is skipped if the hardcoded test is the focus.
  }
  */


  console.log('-------------------------------------');
  console.log('Database Seed Process Complete (or initial test finished).');
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

