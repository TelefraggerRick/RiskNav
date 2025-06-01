
// src/scripts/seedDatabase.ts
import { config } from 'dotenv';
config(); // Load environment variables from .env

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment } from '@/lib/types';

const ASSESSMENTS_COLLECTION = 'riskAssessments';

function safeCreateTimestamp(dateStringInput: string | Date | undefined | null): Timestamp | null {
  if (!dateStringInput) {
    return null;
  }
  try {
    const date = typeof dateStringInput === 'string' ? new Date(dateStringInput) : dateStringInput;
    if (isNaN(date.getTime())) { // Check if date is invalid
      console.warn(`Invalid date input encountered: "${dateStringInput}". Storing as null.`);
      return null;
    }
    return Timestamp.fromDate(date);
  } catch (error) {
    console.warn(`Error converting date input "${dateStringInput}" to Timestamp:`, error, ". Storing as null.");
    return null;
  }
}

function cleanUndefinedRecursively(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    if (obj === undefined) return null; // Convert standalone undefined to null
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedRecursively(item));
  }

  const cleanedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value === undefined) {
        cleanedObj[key] = null; // Convert object property undefined to null
      } else {
        cleanedObj[key] = cleanUndefinedRecursively(value);
      }
    }
  }
  return cleanedObj;
}


async function seedDatabase() {
  console.log('Starting database seed process...');
  let successCount = 0;
  let errorCount = 0;

  for (const mockAssessment of mockRiskAssessments) {
    try {
      // Create a deep copy to avoid modifying the original mockData objects
      // Stringify then parse also helps by implicitly removing undefined top-level properties.
      let assessmentData = JSON.parse(JSON.stringify(mockAssessment)) as Partial<RiskAssessment>;

      // Convert date strings to Firestore Timestamps more robustly
      assessmentData.submissionDate = safeCreateTimestamp(assessmentData.submissionDate as string);
      assessmentData.lastModified = safeCreateTimestamp(assessmentData.lastModified as string);
      // patrolStartDate and patrolEndDate are kept as strings, no conversion needed here for Firestore.

      if (assessmentData.approvalSteps) {
        assessmentData.approvalSteps = assessmentData.approvalSteps.map((step: ApprovalStep) => ({
          ...step,
          date: step.date ? safeCreateTimestamp(step.date as string) : null,
        }));
      } else {
        assessmentData.approvalSteps = [];
      }

      if (assessmentData.attachments) {
        assessmentData.attachments = assessmentData.attachments.map((att: Attachment) => {
          const { file, ...restOfAtt } = att; // Destructure to remove 'file'
          return {
            ...restOfAtt,
            uploadedAt: att.uploadedAt ? safeCreateTimestamp(att.uploadedAt as string) : null,
          };
        });
      } else {
        assessmentData.attachments = [];
      }
      
      // Ensure numeric timestamps (for client-side sorting) are correctly derived
      if (assessmentData.submissionDate instanceof Timestamp) {
        assessmentData.submissionTimestamp = assessmentData.submissionDate.toMillis();
      } else {
        assessmentData.submissionTimestamp = 0; 
      }
      
      // For lastModified, we'll use serverTimestamp during the actual setDoc
      // but ensure the lastModifiedTimestamp field for client sorting is based on a valid date or defaults.
      if (assessmentData.lastModified instanceof Timestamp) {
        assessmentData.lastModifiedTimestamp = assessmentData.lastModified.toMillis();
      } else if (mockAssessment.lastModified) { // Use original mock if conversion failed but value was there
         const originalLastModifiedDate = new Date(mockAssessment.lastModified);
         if(!isNaN(originalLastModifiedDate.getTime())) {
            assessmentData.lastModifiedTimestamp = originalLastModifiedDate.getTime();
         } else {
            assessmentData.lastModifiedTimestamp = 0;
         }
      } else {
        assessmentData.lastModifiedTimestamp = 0;
      }
      
      // Clean all undefined values, converting them to null
      const cleanedData = cleanUndefinedRecursively(assessmentData);

      // Prepare final data for Firestore, using serverTimestamp for lastModified
      const firestoreData = {
        ...cleanedData,
        lastModified: serverTimestamp(), // Always use server timestamp for the actual lastModified field
        // Ensure submissionDate and approvalStep dates are Timestamps or null
        submissionDate: cleanedData.submissionDate instanceof Timestamp ? cleanedData.submissionDate : null,
        approvalSteps: (cleanedData.approvalSteps || []).map((step: any) => ({
            ...step,
            date: step.date instanceof Timestamp ? step.date : null,
        })),
         attachments: (cleanedData.attachments || []).map((att: any) => ({
            ...att,
            uploadedAt: att.uploadedAt instanceof Timestamp ? att.uploadedAt : null,
        })),
      };
      
      // Remove id from the data object itself, as it's used for the doc reference
      const { id, ...dataToSet } = firestoreData;
      if (!mockAssessment.id) {
          console.error(`Mock assessment is missing an ID: ${mockAssessment.referenceNumber}`);
          errorCount++;
          continue;
      }

      const docRef = doc(db, ASSESSMENTS_COLLECTION, mockAssessment.id);
      await setDoc(docRef, dataToSet);
      console.log(`Successfully seeded assessment: ${mockAssessment.referenceNumber} (ID: ${mockAssessment.id})`);
      successCount++;
    } catch (error) {
      console.error(`Error seeding assessment ${mockAssessment.referenceNumber} (ID: ${mockAssessment.id}):`, error);
      console.error("Data being sent was:", JSON.stringify(mockAssessment, null, 2)); // Log the problematic data
      errorCount++;
    }
  }

  console.log('------------------------------------');
  console.log(`Database seed process finished.`);
  console.log(`Successfully seeded: ${successCount} assessments.`);
  console.log(`Failed to seed: ${errorCount} assessments.`);
  console.log('------------------------------------');
}

seedDatabase().then(() => {
  console.log('Seed script executed.');
  process.exit(0);
}).catch((error) => {
  console.error('Unhandled error in seed script:', error);
  process.exit(1);
});

