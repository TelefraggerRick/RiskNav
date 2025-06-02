
// src/scripts/seedDatabase.ts
import { config } from 'dotenv';
config(); // Load environment variables from .env

import { db } from '@/lib/firebase';
import { collection, doc, setDoc, Timestamp, serverTimestamp, FieldValue } from 'firebase/firestore';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, ApprovalStep, Attachment, VesselDepartment, VesselRegion, RiskAssessmentStatus, YesNoOptional, ApprovalDecision, ApprovalLevel } from '@/lib/types';

const ASSESSMENTS_COLLECTION = 'riskAssessments';

// Valid enum values - must match your types.ts definitions
const VALID_VESSEL_DEPARTMENTS: VesselDepartment[] = ['Navigation', 'Deck', 'Engine Room', 'Logistics', 'Other'];
const VALID_VESSEL_REGIONS: VesselRegion[] = ['Atlantic', 'Central', 'Western', 'Arctic'];
const VALID_RISK_ASSESSMENT_STATUSES: RiskAssessmentStatus[] = ['Draft', 'Pending Crewing Standards and Oversight', 'Pending Senior Director', 'Pending Director General', 'Needs Information', 'Approved', 'Rejected'];
const VALID_YES_NO_OPTIONAL: YesNoOptional[] = ['Yes', 'No', undefined]; // undefined will become null
const VALID_APPROVAL_DECISIONS: ApprovalDecision[] = ['Approved', 'Rejected', 'Needs Information'];
const VALID_APPROVAL_LEVELS: ApprovalLevel[] = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];


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
    return obj === undefined ? null : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefinedRecursively(item)).filter(item => item !== undefined && item !== null); // Also filter out explicit nulls if they were originally undefined in array
  }

  const cleanedObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        cleanedObj[key] = cleanUndefinedRecursively(value);
      }
    }
  }
  return cleanedObj;
}

function validateAndCoerceEnum<T extends string>(value: any, validValues: readonly T[], fieldName: string): T | null {
    const cleanedValue = typeof value === 'string' ? value.trim() : value;
    if (cleanedValue === null || cleanedValue === undefined || cleanedValue === '') {
        return null;
    }
    if (validValues.includes(cleanedValue as T)) {
        return cleanedValue as T;
    }
    console.warn(`Invalid value "${value}" for enum field "${fieldName}". Setting to null. Valid values: ${validValues.join(', ')}`);
    return null;
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

    // Deep clone and clean undefined values to null initially
    const cleanedMock = cleanUndefinedRecursively(JSON.parse(JSON.stringify(mockAssessment)));

    const dataToSet = {
      referenceNumber: String(cleanedMock.referenceNumber || ''),
      maritimeExemptionNumber: cleanedMock.maritimeExemptionNumber ? String(cleanedMock.maritimeExemptionNumber) : null,
      vesselName: String(cleanedMock.vesselName || ''),
      imoNumber: cleanedMock.imoNumber ? String(cleanedMock.imoNumber) : null,
      department: validateAndCoerceEnum(cleanedMock.department, VALID_VESSEL_DEPARTMENTS, 'department'),
      region: validateAndCoerceEnum(cleanedMock.region, VALID_VESSEL_REGIONS, 'region'),
      patrolStartDate: cleanedMock.patrolStartDate ? String(cleanedMock.patrolStartDate) : null,
      patrolEndDate: cleanedMock.patrolEndDate ? String(cleanedMock.patrolEndDate) : null,
      patrolLengthDays: typeof cleanedMock.patrolLengthDays === 'number' ? cleanedMock.patrolLengthDays : null,
      voyageDetails: String(cleanedMock.voyageDetails || ''),
      reasonForRequest: String(cleanedMock.reasonForRequest || ''),
      personnelShortages: String(cleanedMock.personnelShortages || ''),
      proposedOperationalDeviations: String(cleanedMock.proposedOperationalDeviations || ''),
      submittedBy: String(cleanedMock.submittedBy || ''),
      submissionDate: safeCreateTimestamp(cleanedMock.submissionDate),
      status: validateAndCoerceEnum(cleanedMock.status, VALID_RISK_ASSESSMENT_STATUSES, 'status'),
      
      aiRiskScore: typeof cleanedMock.aiRiskScore === 'number' ? cleanedMock.aiRiskScore : null,
      aiGeneratedSummary: cleanedMock.aiGeneratedSummary ? String(cleanedMock.aiGeneratedSummary) : null,
      aiSuggestedMitigations: cleanedMock.aiSuggestedMitigations ? String(cleanedMock.aiSuggestedMitigations) : null,
      aiRegulatoryConsiderations: cleanedMock.aiRegulatoryConsiderations ? String(cleanedMock.aiRegulatoryConsiderations) : null,
      aiLikelihoodScore: typeof cleanedMock.aiLikelihoodScore === 'number' ? cleanedMock.aiLikelihoodScore : null,
      aiConsequenceScore: typeof cleanedMock.aiConsequenceScore === 'number' ? cleanedMock.aiConsequenceScore : null,
      
      lastModified: serverTimestamp(),
      submissionTimestamp: safeCreateTimestamp(cleanedMock.submissionDate), 
      lastModifiedTimestamp: serverTimestamp(),

      // ExemptionIndividualAssessmentData
      employeeName: cleanedMock.employeeName ? String(cleanedMock.employeeName) : null,
      certificateHeld: cleanedMock.certificateHeld ? String(cleanedMock.certificateHeld) : null,
      requiredCertificate: cleanedMock.requiredCertificate ? String(cleanedMock.requiredCertificate) : null,
      coDeptHeadSupportExemption: validateAndCoerceEnum(cleanedMock.coDeptHeadSupportExemption, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'coDeptHeadSupportExemption'),
      deptHeadConfidentInIndividual: validateAndCoerceEnum(cleanedMock.deptHeadConfidentInIndividual, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'deptHeadConfidentInIndividual'),
      deptHeadConfidenceReason: cleanedMock.deptHeadConfidenceReason ? String(cleanedMock.deptHeadConfidenceReason) : null,
      employeeFamiliarizationProvided: validateAndCoerceEnum(cleanedMock.employeeFamiliarizationProvided, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'employeeFamiliarizationProvided'),
      workedInDepartmentLast12Months: validateAndCoerceEnum(cleanedMock.workedInDepartmentLast12Months, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'workedInDepartmentLast12Months'),
      workedInDepartmentDetails: cleanedMock.workedInDepartmentDetails ? String(cleanedMock.workedInDepartmentDetails) : null,
      similarResponsibilityExperience: validateAndCoerceEnum(cleanedMock.similarResponsibilityExperience, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'similarResponsibilityExperience'),
      similarResponsibilityDetails: cleanedMock.similarResponsibilityDetails ? String(cleanedMock.similarResponsibilityDetails) : null,
      individualHasRequiredSeaService: validateAndCoerceEnum(cleanedMock.individualHasRequiredSeaService, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'individualHasRequiredSeaService'),
      individualWorkingTowardsCertification: validateAndCoerceEnum(cleanedMock.individualWorkingTowardsCertification, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'individualWorkingTowardsCertification'),
      certificationProgressSummary: cleanedMock.certificationProgressSummary ? String(cleanedMock.certificationProgressSummary) : null,

      // OperationalConsiderationsData
      requestCausesVacancyElsewhere: validateAndCoerceEnum(cleanedMock.requestCausesVacancyElsewhere, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'requestCausesVacancyElsewhere'),
      crewCompositionSufficientForSafety: validateAndCoerceEnum(cleanedMock.crewCompositionSufficientForSafety, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'crewCompositionSufficientForSafety'),
      detailedCrewCompetencyAssessment: cleanedMock.detailedCrewCompetencyAssessment ? String(cleanedMock.detailedCrewCompetencyAssessment) : null,
      crewContinuityAsPerProfile: validateAndCoerceEnum(cleanedMock.crewContinuityAsPerProfile, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'crewContinuityAsPerProfile'),
      crewContinuityDetails: cleanedMock.crewContinuityDetails ? String(cleanedMock.crewContinuityDetails) : null,
      specialVoyageConsiderations: cleanedMock.specialVoyageConsiderations ? String(cleanedMock.specialVoyageConsiderations) : null,
      reductionInVesselProgramRequirements: validateAndCoerceEnum(cleanedMock.reductionInVesselProgramRequirements, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'reductionInVesselProgramRequirements'),
      rocNotificationOfLimitations: validateAndCoerceEnum(cleanedMock.rocNotificationOfLimitations, VALID_YES_NO_OPTIONAL.filter(v => v !== undefined) as ('Yes' | 'No')[], 'rocNotificationOfLimitations'),

      approvalSteps: (cleanedMock.approvalSteps || []).map((step: any) => cleanUndefinedRecursively({ // Ensure step object is cleaned
        level: validateAndCoerceEnum(step.level, VALID_APPROVAL_LEVELS, 'approvalStep.level'),
        decision: validateAndCoerceEnum(step.decision, VALID_APPROVAL_DECISIONS, 'approvalStep.decision'),
        userId: step.userId ? String(step.userId) : null,
        userName: step.userName ? String(step.userName) : null,
        date: safeCreateTimestamp(step.date),
        notes: step.notes ? String(step.notes) : null,
      })).filter(Boolean), // Filter out any steps that might have become null due to invalid level

      attachments: (cleanedMock.attachments || []).map((att: any) => cleanUndefinedRecursively({ // Ensure attachment object is cleaned
        id: String(att.id || `gen_${Date.now()}_${Math.random().toString(36).substring(2,7)}`),
        name: String(att.name || 'Unknown File'),
        url: String(att.url || ''),
        type: String(att.type || 'application/octet-stream'),
        size: typeof att.size === 'number' ? att.size : 0,
        uploadedAt: safeCreateTimestamp(att.uploadedAt),
        storagePath: att.storagePath ? String(att.storagePath) : null,
        dataAiHint: att.dataAiHint ? String(att.dataAiHint) : null,
      })).filter(Boolean),
    };
    
    // Final pass to ensure no undefined values exist at the top level of dataToSet
    const finalFirestoreData = Object.entries(dataToSet).reduce((acc, [key, value]) => {
        acc[key] = value === undefined ? null : value;
        return acc;
    }, {} as Record<string, any>);


    const docRef = doc(db, ASSESSMENTS_COLLECTION, mockAssessment.id);
    
    try {
      await setDoc(docRef, finalFirestoreData);
      console.log(`Successfully seeded assessment: ${mockAssessment.referenceNumber} (ID: ${mockAssessment.id})`);
      successCount++;
    } catch (error) {
      console.error(`Error seeding assessment ${mockAssessment.referenceNumber} (ID: ${mockAssessment.id}):`, error);
      console.error("Data object attempted for setDoc:", JSON.stringify(finalFirestoreData, (key, value) => {
        if (value instanceof Timestamp) {
          return `Timestamp(seconds=${value.seconds}, nanoseconds=${value.nanoseconds})`;
        }
         if (value && value._methodName && typeof value._methodName === 'string' && value._methodName.startsWith('serverTimestamp')) {
          return 'FieldValue(serverTimestamp)';
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
