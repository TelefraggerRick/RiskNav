
// src/scripts/seedDatabase.ts
import { config } from 'dotenv';
config(); // Load environment variables from .env

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment } from '@/lib/types';

const ASSESSMENTS_COLLECTION = 'riskAssessments';

async function seedDatabase() {
  console.log('Starting database seed process...');
  let successCount = 0;
  let errorCount = 0;

  for (const mockAssessment of mockRiskAssessments) {
    try {
      // Create a deep copy to avoid modifying the original mockData objects
      const assessmentData = JSON.parse(JSON.stringify(mockAssessment)) as RiskAssessment;

      // Convert date strings to Firestore Timestamps
      if (assessmentData.submissionDate && typeof assessmentData.submissionDate === 'string') {
        assessmentData.submissionDate = Timestamp.fromDate(new Date(assessmentData.submissionDate));
      }
      if (assessmentData.lastModified && typeof assessmentData.lastModified === 'string') {
        assessmentData.lastModified = Timestamp.fromDate(new Date(assessmentData.lastModified));
      }
      if (assessmentData.patrolStartDate && typeof assessmentData.patrolStartDate === 'string') {
        // Keep as string, no need to convert to Timestamp for this field in DB
      }
       if (assessmentData.patrolEndDate && typeof assessmentData.patrolEndDate === 'string') {
        // Keep as string
      }

      assessmentData.approvalSteps = assessmentData.approvalSteps.map((step: ApprovalStep) => ({
        ...step,
        date: step.date && typeof step.date === 'string' ? Timestamp.fromDate(new Date(step.date)) : undefined,
      }));

      assessmentData.attachments = assessmentData.attachments.map((att: Attachment) => ({
        ...att,
        uploadedAt: typeof att.uploadedAt === 'string' ? Timestamp.fromDate(new Date(att.uploadedAt)).toDate().toISOString() : att.uploadedAt, // keep as ISO string for this field
        // 'file' property is not needed in Firestore
        file: undefined,
      }));
      
      // Ensure numeric timestamps are present, derived from the converted Timestamp objects
      if (assessmentData.submissionDate instanceof Timestamp) {
        assessmentData.submissionTimestamp = assessmentData.submissionDate.toMillis();
      }
      if (assessmentData.lastModified instanceof Timestamp) {
        assessmentData.lastModifiedTimestamp = assessmentData.lastModified.toMillis();
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
