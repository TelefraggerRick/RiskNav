
// src/scripts/seedDatabase.ts
import { config } from 'dotenv';
config(); // Load environment variables from .env

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp, serverTimestamp, FieldValue } from 'firebase/firestore';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment, VesselDepartment, VesselRegion, RiskAssessmentStatus, YesNoOptional, ApprovalDecision, ApprovalLevel } from '@/lib/types';

const ASSESSMENTS_COLLECTION = 'riskAssessments';

function safeCreateTimestamp(dateStringInput?: string | Date | null): Timestamp | null {
  if (!dateStringInput) {
    return null;
  }
  try {
    const date = typeof dateStringInput === 'string' ? new Date(dateStringInput) : dateStringInput;
    if (isNaN(date.getTime())) {
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
    if (obj === undefined) return null;
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedRecursively(item)).filter(item => item !== undefined); // Filter out undefined after map
  }

  const cleanedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        cleanedObj[key] = cleanUndefinedRecursively(value);
      } else {
         cleanedObj[key] = null; // Explicitly set to null if top-level undefined was intended for a key
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
    if (!mockAssessment.id) {
        console.error(`Mock assessment is missing an ID: ${mockAssessment.referenceNumber || 'Unknown Ref'}. Skipping.`);
        errorCount++;
        continue;
    }

    // Clean the entire mock object first to handle any undefined values at any level
    const cleanedMock = cleanUndefinedRecursively(JSON.parse(JSON.stringify(mockAssessment)));

    const dataToSet: Omit<RiskAssessment, 'id' | 'submissionDate' | 'lastModified' | 'submissionTimestamp' | 'lastModifiedTimestamp' | 'attachments' | 'approvalSteps'> & {
        submissionDate: Timestamp | null;
        lastModified: FieldValue;
        submissionTimestamp: Timestamp | null;
        lastModifiedTimestamp: FieldValue;
        attachments: any[]; // Will be specifically typed attachments
        approvalSteps: any[]; // Will be specifically typed approval steps
    } = {
      // Strings (ensure they are strings or null)
      referenceNumber: cleanedMock.referenceNumber || null,
      maritimeExemptionNumber: cleanedMock.maritimeExemptionNumber || null,
      vesselName: cleanedMock.vesselName || null,
      imoNumber: cleanedMock.imoNumber || null,
      voyageDetails: cleanedMock.voyageDetails || null,
      reasonForRequest: cleanedMock.reasonForRequest || null,
      personnelShortages: cleanedMock.personnelShortages || null,
      proposedOperationalDeviations: cleanedMock.proposedOperationalDeviations || null,
      submittedBy: cleanedMock.submittedBy || null,
      employeeName: cleanedMock.employeeName || null,
      certificateHeld: cleanedMock.certificateHeld || null,
      requiredCertificate: cleanedMock.requiredCertificate || null,
      deptHeadConfidenceReason: cleanedMock.deptHeadConfidenceReason || null,
      workedInDepartmentDetails: cleanedMock.workedInDepartmentDetails || null,
      similarResponsibilityDetails: cleanedMock.similarResponsibilityDetails || null,
      certificationProgressSummary: cleanedMock.certificationProgressSummary || null,
      detailedCrewCompetencyAssessment: cleanedMock.detailedCrewCompetencyAssessment || null,
      crewContinuityDetails: cleanedMock.crewContinuityDetails || null,
      specialVoyageConsiderations: cleanedMock.specialVoyageConsiderations || null,
      
      // Enums (ensure they are valid enum values or null)
      department: cleanedMock.department as VesselDepartment || null,
      region: cleanedMock.region as VesselRegion || null,
      status: cleanedMock.status as RiskAssessmentStatus || null,

      // Optional Numbers (ensure they are numbers or null)
      patrolLengthDays: typeof cleanedMock.patrolLengthDays === 'number' ? cleanedMock.patrolLengthDays : null,
      aiRiskScore: typeof cleanedMock.aiRiskScore === 'number' ? cleanedMock.aiRiskScore : null,
      aiLikelihoodScore: typeof cleanedMock.aiLikelihoodScore === 'number' ? cleanedMock.aiLikelihoodScore : null,
      aiConsequenceScore: typeof cleanedMock.aiConsequenceScore === 'number' ? cleanedMock.aiConsequenceScore : null,
      
      // Optional AI Strings
      aiGeneratedSummary: cleanedMock.aiGeneratedSummary || null,
      aiSuggestedMitigations: cleanedMock.aiSuggestedMitigations || null,
      aiRegulatoryConsiderations: cleanedMock.aiRegulatoryConsiderations || null,
      
      // YesNoOptional fields (ensure they are 'Yes', 'No', or null)
      coDeptHeadSupportExemption: cleanedMock.coDeptHeadSupportExemption as YesNoOptional || null,
      deptHeadConfidentInIndividual: cleanedMock.deptHeadConfidentInIndividual as YesNoOptional || null,
      employeeFamiliarizationProvided: cleanedMock.employeeFamiliarizationProvided as YesNoOptional || null,
      workedInDepartmentLast12Months: cleanedMock.workedInDepartmentLast12Months as YesNoOptional || null,
      similarResponsibilityExperience: cleanedMock.similarResponsibilityExperience as YesNoOptional || null,
      individualHasRequiredSeaService: cleanedMock.individualHasRequiredSeaService as YesNoOptional || null,
      individualWorkingTowardsCertification: cleanedMock.individualWorkingTowardsCertification as YesNoOptional || null,
      requestCausesVacancyElsewhere: cleanedMock.requestCausesVacancyElsewhere as YesNoOptional || null,
      crewCompositionSufficientForSafety: cleanedMock.crewCompositionSufficientForSafety as YesNoOptional || null,
      crewContinuityAsPerProfile: cleanedMock.crewContinuityAsPerProfile as YesNoOptional || null,
      reductionInVesselProgramRequirements: cleanedMock.reductionInVesselProgramRequirements as YesNoOptional || null,
      rocNotificationOfLimitations: cleanedMock.rocNotificationOfLimitations as YesNoOptional || null,

      // Dates & Timestamps
      submissionDate: safeCreateTimestamp(cleanedMock.submissionDate),
      submissionTimestamp: safeCreateTimestamp(cleanedMock.submissionDate), // For ordering, use the same source as submissionDate
      lastModified: serverTimestamp(),
      lastModifiedTimestamp: serverTimestamp(),
      patrolStartDate: cleanedMock.patrolStartDate || null, // Keep as string if that's how it's defined in Firestore schema, or convert to Timestamp
      patrolEndDate: cleanedMock.patrolEndDate || null,     // Keep as string if that's how it's defined in Firestore schema, or convert to Timestamp

      // Arrays of Objects
      approvalSteps: (cleanedMock.approvalSteps || []).map((step: any) => ({
        level: step.level as ApprovalLevel || null,
        decision: step.decision as ApprovalDecision || null,
        userId: step.userId || null,
        userName: step.userName || null,
        date: safeCreateTimestamp(step.date),
        notes: step.notes || null,
      })),
      attachments: (cleanedMock.attachments || []).map((att: any) => ({
        id: att.id || `gen_${Date.now()}`, // Ensure ID exists
        name: att.name || null,
        url: att.url || null,
        type: att.type || null,
        size: typeof att.size === 'number' ? att.size : null,
        uploadedAt: safeCreateTimestamp(att.uploadedAt),
        storagePath: att.storagePath || null,
        dataAiHint: att.dataAiHint || null, // from mock data
      })),
    };
    
    // Explicitly remove mock data's client-side id from the data to be set
    const { id: mockId, ...finalDataToSet } = dataToSet as any; 
    // Also remove any fields that were only in mock and not in RiskAssessment type explicitly
    // For example, the original mock data `submissionTimestamp` and `lastModifiedTimestamp` were numbers,
    // but we are creating proper Timestamp fields for Firestore.
    delete finalDataToSet.submissionTimestampNumber; // if such a field existed from cleaning
    delete finalDataToSet.lastModifiedTimestampNumber; // if such a field existed from cleaning


    const docRef = doc(db, ASSESSMENTS_COLLECTION, mockAssessment.id);
    
    try {
      await setDoc(docRef, finalDataToSet);
      console.log(`Successfully seeded assessment: ${mockAssessment.referenceNumber} (ID: ${mockAssessment.id})`);
      successCount++;
    } catch (error) {
      console.error(`Error seeding assessment ${mockAssessment.referenceNumber} (ID: ${mockAssessment.id}):`, error);
      console.error("Data object attempted for setDoc:", JSON.stringify(finalDataToSet, (key, value) => {
        if (value instanceof Timestamp) {
          return `Timestamp(seconds=${value.seconds}, nanoseconds=${value.nanoseconds})`;
        }
        if (value && typeof value === 'object' && value.constructor && value.constructor.name === '_FieldValue') {
            // Attempt to get a more descriptive string for FieldValue sentinels
            if ('_methodName' in value && typeof value._methodName === 'string') {
                return `FieldValue(${value._methodName})`;
            }
            return 'FieldValue(unknown)';
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

    