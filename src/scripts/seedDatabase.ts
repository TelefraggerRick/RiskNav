
// src/scripts/seedDatabase.ts
import { config } from 'dotenv';
config(); // Load environment variables from .env

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp, serverTimestamp, FieldValue } from 'firebase/firestore';
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
    let assessmentData: Partial<RiskAssessment> = JSON.parse(JSON.stringify(mockAssessment)); // Deep copy and remove top-level undefined

    // Convert date strings to Firestore Timestamps or null
    assessmentData.submissionDate = safeCreateTimestamp(assessmentData.submissionDate as string);
    assessmentData.lastModified = safeCreateTimestamp(assessmentData.lastModified as string);

    if (assessmentData.approvalSteps) {
      assessmentData.approvalSteps = assessmentData.approvalSteps.map((step: Partial<ApprovalStep>) => ({
        ...step,
        date: step.date ? safeCreateTimestamp(step.date as string) : null,
      }));
    }

    if (assessmentData.attachments) {
      assessmentData.attachments = assessmentData.attachments.map((att: Partial<Attachment>) => {
        const { file, ...restOfAtt } = att; // Remove client-side 'file' object
        return {
          ...restOfAtt,
          uploadedAt: att.uploadedAt ? safeCreateTimestamp(att.uploadedAt as string) : null,
        };
      });
    }
    
    // Ensure numeric timestamps (for client-side sorting) are correctly derived
    if (assessmentData.submissionDate instanceof Timestamp) {
      assessmentData.submissionTimestamp = assessmentData.submissionDate.toMillis();
    } else {
      assessmentData.submissionTimestamp = 0; 
    }
    
    if (assessmentData.lastModified instanceof Timestamp) {
      assessmentData.lastModifiedTimestamp = assessmentData.lastModified.toMillis();
    } else if (mockAssessment.lastModified) { 
       const originalLastModifiedDate = new Date(mockAssessment.lastModified);
       if(!isNaN(originalLastModifiedDate.getTime())) {
          assessmentData.lastModifiedTimestamp = originalLastModifiedDate.getTime();
       } else {
          assessmentData.lastModifiedTimestamp = 0;
       }
    } else {
      assessmentData.lastModifiedTimestamp = 0;
    }
    
    const cleanedData = cleanUndefinedRecursively(assessmentData);

    const firestoreData = {
      ...cleanedData,
      lastModified: serverTimestamp() as FieldValue, // Ensure lastModified uses serverTimestamp
      // Ensure submissionDate and approvalStep/attachment dates are Timestamps or null
      submissionDate: cleanedData.submissionDate instanceof Timestamp ? cleanedData.submissionDate : null,
      submissionTimestamp: cleanedData.submissionTimestamp, // This is already a number
      lastModifiedTimestamp: cleanedData.lastModifiedTimestamp, // This is already a number
      approvalSteps: (cleanedData.approvalSteps || []).map((step: any) => ({
          ...step,
          level: step.level || null, // Ensure required fields in sub-objects are not undefined
          date: step.date instanceof Timestamp ? step.date : null,
      })),
       attachments: (cleanedData.attachments || []).map((att: any) => ({
          ...att,
          name: att.name || null, // Ensure required fields in sub-objects are not undefined
          url: att.url || null,
          type: att.type || null,
          size: typeof att.size === 'number' ? att.size : null,
          uploadedAt: att.uploadedAt instanceof Timestamp ? att.uploadedAt : null,
      })),
    };
    
    const { id, ...dataToSet } = firestoreData;

    if (!mockAssessment.id) {
        console.error(`Mock assessment is missing an ID: ${mockAssessment.referenceNumber}`);
        errorCount++;
        continue;
    }

    const docRef = doc(db, ASSESSMENTS_COLLECTION, mockAssessment.id);
    
    try {
      await setDoc(docRef, dataToSet);
      console.log(`Successfully seeded assessment: ${mockAssessment.referenceNumber} (ID: ${mockAssessment.id})`);
      successCount++;
    } catch (error) {
      console.error(`Error seeding assessment ${mockAssessment.referenceNumber} (ID: ${mockAssessment.id}):`, error);
      // Enhanced logging for the object that caused the error
      console.error("Data object attempted for setDoc:", JSON.stringify(dataToSet, (key, value) => {
        if (value instanceof Timestamp) {
          return `Timestamp(seconds=${value.seconds}, nanoseconds=${value.nanoseconds})`;
        }
        // For Firebase FieldValue (like serverTimestamp)
        if (value && typeof value === 'object' && value.constructor && value.constructor.name === '_FieldValue') {
            return `FieldValue(${value.lc})`; // lc might indicate method name like "serverTimestamp"
        }
        if (value === undefined) {
            return "[UNDEFINED_VALUE_DETECTED_IN_FINAL_OBJECT]"; // Should not happen if cleanUndefinedRecursively works
        }
        return value;
      }, 2));
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

