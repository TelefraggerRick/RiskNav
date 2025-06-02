
// src/scripts/seedDatabase.ts
import { admin, dbAdmin } from '@/lib/firebaseAdmin'; // Use firebase-admin
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore'; // Ensure admin types are used

async function seedDatabase() {
  console.log('Starting database seed process with firebase-admin...');

  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error("Firebase project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not configured in .env file. Aborting.");
    return { success: false, error: "Missing project ID configuration." };
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for firebase-admin. Aborting.");
    return { success: false, error: "Missing service account configuration." };
  }

  if (!dbAdmin) {
    console.error("Firestore admin instance (dbAdmin) is not available. Aborting seed. Check firebaseAdmin.ts initialization and logs.");
    return { success: false, error: "dbAdmin instance not available." };
  }

  console.log(`Targeting Firebase project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`Using service account key from path: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

  let seededCount = 0;
  let failedCount = 0;

  for (const assessment of mockRiskAssessments) {
    try {
      const documentId = assessment.id; // Using the ID from mockData
      const dataToSet: any = {
        ...assessment,
        // Convert date strings to Firestore Timestamps
        submissionDate: assessment.submissionDate ? Timestamp.fromDate(new Date(assessment.submissionDate)) : Timestamp.now(),
        lastModified: assessment.lastModified ? Timestamp.fromDate(new Date(assessment.lastModified)) : Timestamp.now(),
        attachments: (assessment.attachments || []).map((att: Attachment) => ({
          ...att,
          uploadedAt: att.uploadedAt ? Timestamp.fromDate(new Date(att.uploadedAt)) : Timestamp.now(),
          file: undefined, // Remove the File object before sending to Firestore
        })),
        approvalSteps: (assessment.approvalSteps || []).map((step: ApprovalStep) => ({
          ...step,
          date: step.date ? Timestamp.fromDate(new Date(step.date)) : undefined,
        })),
      };

      // Remove undefined fields that might cause issues, except for optional top-level fields explicitly in RiskAssessment
      Object.keys(dataToSet).forEach(key => {
        if (dataToSet[key] === undefined && !['imoNumber', 'maritimeExemptionNumber', 'aiRiskScore', 'aiGeneratedSummary', 'aiSuggestedMitigations', 'aiRegulatoryConsiderations', 'aiLikelihoodScore', 'aiConsequenceScore', 'patrolStartDate', 'patrolEndDate', 'patrolLengthDays', 'employeeName', 'certificateHeld', 'requiredCertificate', 'coDeptHeadSupportExemption', 'deptHeadConfidentInIndividual', 'deptHeadConfidenceReason', 'employeeFamiliarizationProvided', 'workedInDepartmentLast12Months', 'workedInDepartmentDetails', 'similarResponsibilityExperience', 'similarResponsibilityDetails', 'individualHasRequiredSeaService', 'individualWorkingTowardsCertification', 'certificationProgressSummary', 'requestCausesVacancyElsewhere', 'crewCompositionSufficientForSafety', 'detailedCrewCompetencyAssessment', 'crewContinuityAsPerProfile', 'crewContinuityDetails', 'specialVoyageConsiderations', 'reductionInVesselProgramRequirements', 'rocNotificationOfLimitations'].includes(key)) {
            // For nested objects like approvalSteps, date might be intentionally undefined
            if (key !== 'approvalSteps' && key !== 'attachments') {
                 delete dataToSet[key];
            }
        }
      });
      
      // Clean up undefined dates in nested approvalSteps if they weren't set
      dataToSet.approvalSteps = dataToSet.approvalSteps.map((step: any) => {
        if (step.date === undefined) {
          const { date, ...restOfStep } = step;
          return restOfStep;
        }
        return step;
      });


      await dbAdmin.collection('riskAssessments').doc(documentId).set(dataToSet);
      console.log(`Successfully seeded assessment: ${documentId} - ${assessment.vesselName}`);
      seededCount++;
    } catch (error: any) {
      console.error(`Error seeding assessment ${assessment.id} (${assessment.vesselName}):`, error.message);
      if (error.code) console.error(" Firestore Error Code:", error.code);
      if (error.details) console.error(" Firestore Error Details:", error.details);
      failedCount++;
    }
  }

  console.log('-------------------------------------');
  console.log('Database Seed Process Finished.');
  console.log(`Successfully seeded: ${seededCount} assessments.`);
  if (failedCount > 0) {
    console.log(`Failed to seed: ${failedCount} assessments.`);
    return { success: false, seededCount, failedCount };
  }
  return { success: true, seededCount, failedCount };
}

seedDatabase()
  .then(({ success, seededCount, failedCount }) => {
    if (success) {
      console.log('Seeding complete. All mock assessments processed.');
    } else {
      console.warn(`Seeding process completed with ${failedCount} failures.`);
    }
    // Consider exiting process if needed, or let it complete naturally
    // process.exit(success ? 0 : 1); 
  })
  .catch(err => {
    console.error('Unhandled critical error during database seeding:', err);
    process.exit(1);
  });
