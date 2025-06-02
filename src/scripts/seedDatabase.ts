
// src/scripts/seedDatabase.ts
import { admin, dbAdmin } from '@/lib/firebaseAdmin'; // Use firebase-admin
import { Timestamp } from 'firebase-admin/firestore'; // Ensure admin types are used

async function attemptSingleWrite() {
  console.log('Starting single write attempt with firebase-admin...');

  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error("Firebase project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not configured in .env file. Aborting.");
    return { success: false, error: "Missing project ID configuration." };
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for firebase-admin. Aborting.");
    return { success: false, error: "Missing service account configuration." };
  }
  
  if (!dbAdmin) {
    console.error("Firestore admin instance (dbAdmin) is not available. Aborting write attempt. Check firebaseAdmin.ts initialization and logs.");
    return { success: false, error: "dbAdmin instance not available." };
  }

  console.log(`Targeting Firebase project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`Using service account key from path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

  const TEST_DOCUMENT_ID = 'test-single-write-admin-003'; // New ID for clarity
  const testDataToSet = {
    testName: "Admin SDK Ultra Simple Write",
    testStatus: "Draft",
    testDate: new Date().toISOString(), // Using ISO string directly
    simpleField: "hello world"
  };

  const replacerForLog = (key: string, value: any) => {
    if (value instanceof Timestamp) {
      return `FirestoreTimestamp(seconds=${value.seconds}, nanoseconds=${value.nanoseconds})`;
    }
    return value;
  };

  console.log(`Attempting to write document ID: ${TEST_DOCUMENT_ID} to collection 'riskAssessments'`);
  console.log(`Data to write:`, JSON.stringify(testDataToSet, replacerForLog, 2));

  try {
    const docRef = dbAdmin.collection('riskAssessments').doc(TEST_DOCUMENT_ID);
    console.log(`DEBUG: Document reference created: ${docRef.path}`);
    await docRef.set(testDataToSet);
    console.log(`SUCCESS: Wrote test document ${TEST_DOCUMENT_ID} using admin SDK.`);
    return { success: true };
  } catch (error: any) {
    console.error(`ERROR writing test document ${TEST_DOCUMENT_ID} using admin SDK.`);
    console.error("Error message:", error.message);
    if (error.code) console.error("Error code:", error.code);
    if (error.details) console.error("Error details:", error.details);
    console.error("Data object ATTEMPTED for set (from catch block):", JSON.stringify(testDataToSet, replacerForLog, 2));
    return { success: false, error: error.message, errorCode: error.code };
  }
}

async function main() {
  const result = await attemptSingleWrite();
  console.log('-------------------------------------');
  if (result.success) {
    console.log('Single write attempt process complete: SUCCESS.');
  } else {
    console.log('Single write attempt process complete: FAILED.');
    console.log(`Error details: ${result.error}${result.errorCode ? ` (Code: ${result.errorCode})` : ''}`);
  }
  console.log('-------------------------------------');
}

main().catch(err => {
  console.error('Unhandled critical error during single write attempt:', err);
});
