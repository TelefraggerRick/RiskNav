
// src/scripts/seedDatabase.ts
import { config } from 'dotenv';
config(); // Load environment variables from .env

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment } from '@/lib/types';

const ASSESSMENTS_COLLECTION = 'riskAssessments';

function safeCreateTimestamp(dateString: string | undefined | null): Timestamp | null {
  if (!dateString) {
    return null;
  }
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { // Check if date is invalid
      console.warn(`Invalid date string encountered: "${dateString}". Storing as null.`);
      return null;
    }
    return Timestamp.fromDate(date);
  } catch (error) {
    console.warn(`Error converting date string "${dateString}" to Timestamp:`, error, ". Storing as null.");
    return null;
  }
}

async function seedDatabase() {
  console.log('Starting database seed process...');
  let successCount = 0;
  let errorCount = 0;

  for (const mockAssessment of mockRiskAssessments) {
    try {
      // Create a deep copy to avoid modifying the original mockData objects
      const assessmentData = JSON.parse(JSON.stringify(mockAssessment)) as RiskAssessment;

      // Convert date strings to Firestore Timestamps more robustly
      assessmentData.submissionDate = safeCreateTimestamp(assessmentData.submissionDate as string);
      assessmentData.lastModified = safeCreateTimestamp(assessmentData.lastModified as string);
      // patrolStartDate and patrolEndDate are kept as strings as per type, no conversion needed here for Firestore.

      assessmentData.approvalSteps = assessmentData.approvalSteps.map((step: ApprovalStep) => ({
        ...step,
        // Ensure date is either a valid Timestamp or null
        date: step.date ? safeCreateTimestamp(step.date as string) : null,
      }));

      assessmentData.attachments = assessmentData.attachments.map((att: Attachment) => {
        const { file, ...restOfAtt } = att; // Destructure to remove 'file'
        return {
          ...restOfAtt,
          // Ensure uploadedAt is either a valid Timestamp or null
          uploadedAt: att.uploadedAt ? safeCreateTimestamp(att.uploadedAt as string) : null,
        };
      });
      
      // Ensure numeric timestamps (for client-side sorting) are correctly derived if source Timestamps are valid
      if (assessmentData.submissionDate instanceof Timestamp) {
        assessmentData.submissionTimestamp = assessmentData.submissionDate.toMillis();
      } else {
        // If submissionDate became null due to invalid string, set numeric timestamp to 0 or handle as error
        assessmentData.submissionTimestamp = 0; 
      }
      
      if (assessmentData.lastModified instanceof Timestamp) {
        assessmentData.lastModifiedTimestamp = assessmentData.lastModified.toMillis();
      } else {
        assessmentData.lastModifiedTimestamp = 0;
      }

      const docRef = doc(db, ASSESSMENTS_COLLECTION, assessmentData.id);
      await setDoc(docRef, assessmentData);
      console.log(`Successfully seeded assessment: ${assessmentData.referenceNumber} (ID: ${assessmentData.id})`);
      successCount++;
    } catch (error) {
      console.error(`Error seeding assessment ${mockAssessment.referenceNumber} (ID: ${mockAssessment.id}):`, error);
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
