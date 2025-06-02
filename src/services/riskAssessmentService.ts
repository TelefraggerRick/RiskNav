
// src/services/riskAssessmentService.ts
'use server';

import { db, storage } from '@/lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  Timestamp,
  query,
  orderBy,
  serverTimestamp,
  // where, // Not currently used, commented out
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { RiskAssessment, Attachment, RiskAssessmentFormData, ApprovalStep } from '@/lib/types';

const ASSESSMENTS_COLLECTION = 'riskAssessments';

// Helper to convert Firestore Timestamps and handle null/undefined values
const convertFirestoreTypes = (data: any): any => {
  if (data === null || data === undefined) {
    return null; // Explicitly return null for undefined or null inputs
  }

  if (data instanceof Timestamp) {
    // This case is for when convertFirestoreTypes might be called on a Timestamp directly
    return data.toDate().toISOString(); // Default to ISO string
  }

  if (Array.isArray(data)) {
    return data.map(item => convertFirestoreTypes(item));
  }

  if (typeof data === 'object') {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (value === undefined) {
          newData[key] = null; // Convert undefined fields to null
        } else if (value instanceof Timestamp) {
          if (key === 'submissionTimestamp' || key === 'lastModifiedTimestamp') {
            newData[key] = value.toMillis();
          } else {
            // Covers submissionDate, lastModified, approvalStep.date, attachment.uploadedAt
            newData[key] = value.toDate().toISOString();
          }
        } else if (typeof value === 'object' && value !== null) {
          newData[key] = convertFirestoreTypes(value); // Recursively convert
        } else {
          newData[key] = value;
        }
      }
    }
    return newData;
  }
  return data;
};


export async function getAllRiskAssessments(): Promise<RiskAssessment[]> {
  try {
    const q = query(collection(db, ASSESSMENTS_COLLECTION), orderBy('submissionTimestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap =>
      convertFirestoreTypes({ ...docSnap.data(), id: docSnap.id }) as RiskAssessment
    );
  } catch (error) {
    console.error("Error fetching all risk assessments: ", error);
    throw new Error("Failed to fetch risk assessments.");
  }
}

export async function getRiskAssessmentById(id: string): Promise<RiskAssessment | null> {
  try {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertFirestoreTypes({ ...docSnap.data(), id: docSnap.id }) as RiskAssessment;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching risk assessment with ID ${id}: `, error);
    throw new Error("Failed to fetch risk assessment.");
  }
}

async function uploadAttachmentFile(file: File, assessmentId: string): Promise<Partial<Attachment>> {
  const storageRef = ref(storage, `attachments/${assessmentId}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return {
    name: file.name,
    url: downloadURL,
    type: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    storagePath: storageRef.fullPath,
  };
}

export async function addRiskAssessment(formData: RiskAssessmentFormData, submittedBy: string): Promise<string> {
  try {
    const now = new Date();
    const submissionFirestoreTimestamp = Timestamp.fromDate(now);

    const processedAttachments: Attachment[] = [];
    if (formData.attachments && formData.attachments.length > 0) {
      const tempAssessmentId = `temp_upload_${Date.now()}`;
      for (const att of formData.attachments) {
        if (att.file) {
          const uploadedFileMeta = await uploadAttachmentFile(att.file, tempAssessmentId);
          processedAttachments.push({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2,7)}`, // Ensure ID is a string
            name: uploadedFileMeta.name || 'untitled',
            url: uploadedFileMeta.url || '',
            type: uploadedFileMeta.type || 'application/octet-stream',
            size: uploadedFileMeta.size || 0,
            uploadedAt: uploadedFileMeta.uploadedAt || now.toISOString(),
            storagePath: uploadedFileMeta.storagePath || undefined,
          });
        }
      }
    }
    
    // Ensure all optional fields are explicitly null if not provided or undefined
    const cleanFormData = { ...formData };
    for (const key in cleanFormData) {
        if (cleanFormData[key as keyof RiskAssessmentFormData] === undefined) {
            (cleanFormData as any)[key] = null;
        }
    }


    const newAssessmentData = {
      ...cleanFormData,
      attachments: processedAttachments,
      submittedBy,
      status: 'Pending Crewing Standards and Oversight',
      approvalSteps: formData.approvalSteps ? formData.approvalSteps.map(step => ({ 
        ...step, 
        date: step.date ? Timestamp.fromDate(new Date(step.date)) : null,
        notes: step.notes || null,
        userId: step.userId || null,
        userName: step.userName || null,
        decision: step.decision || null,
       })) : [],
      submissionDate: submissionFirestoreTimestamp,
      lastModified: serverTimestamp(),
      submissionTimestamp: submissionFirestoreTimestamp,
      lastModifiedTimestamp: serverTimestamp(),
      // Ensure explicitly optional fields are null if not present
      imoNumber: formData.imoNumber || null,
      maritimeExemptionNumber: formData.maritimeExemptionNumber || null,
      patrolStartDate: formData.patrolStartDate || null,
      patrolEndDate: formData.patrolEndDate || null,
      patrolLengthDays: typeof formData.patrolLengthDays === 'number' ? formData.patrolLengthDays : null,
      aiRiskScore: typeof formData.aiRiskScore === 'number' ? formData.aiRiskScore : null,
      aiGeneratedSummary: formData.aiGeneratedSummary || null,
      aiSuggestedMitigations: formData.aiSuggestedMitigations || null,
      aiRegulatoryConsiderations: formData.aiRegulatoryConsiderations || null,
      aiLikelihoodScore: typeof formData.aiLikelihoodScore === 'number' ? formData.aiLikelihoodScore : null,
      aiConsequenceScore: typeof formData.aiConsequenceScore === 'number' ? formData.aiConsequenceScore : null,
      employeeName: formData.employeeName || null,
      certificateHeld: formData.certificateHeld || null,
      requiredCertificate: formData.requiredCertificate || null,
      deptHeadConfidenceReason: formData.deptHeadConfidenceReason || null,
      workedInDepartmentDetails: formData.workedInDepartmentDetails || null,
      similarResponsibilityDetails: formData.similarResponsibilityDetails || null,
      certificationProgressSummary: formData.certificationProgressSummary || null,
      detailedCrewCompetencyAssessment: formData.detailedCrewCompetencyAssessment || null,
      crewContinuityDetails: formData.crewContinuityDetails || null,
      specialVoyageConsiderations: formData.specialVoyageConsiderations || null,
    };
    
    // Remove referenceNumber if it's in formData, as it should be generated or handled by mock structure if any
    // The type RiskAssessmentFormData doesn't include id, submissionDate, etc.
    delete (newAssessmentData as any).referenceNumber; 


    const docRef = await addDoc(collection(db, ASSESSMENTS_COLLECTION), newAssessmentData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding risk assessment: ", error);
    // For more detailed error logging during development:
    if (error instanceof Error && 'details' in error) {
        console.error("Firestore Error Details:", (error as any).details);
    }
    throw new Error("Failed to add risk assessment.");
  }
}

export async function updateRiskAssessment(id: string, updates: Partial<RiskAssessment>): Promise<void> {
  try {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, id);

    const firestoreUpdates: any = { ...updates };

    // Convert specific string dates from client back to Timestamps or ensure null
    if (updates.submissionDate && typeof updates.submissionDate === 'string') {
      firestoreUpdates.submissionDate = Timestamp.fromDate(new Date(updates.submissionDate));
    } else if (updates.hasOwnProperty('submissionDate') && updates.submissionDate === null) {
      firestoreUpdates.submissionDate = null;
    }
    
    if (updates.submissionTimestamp && typeof updates.submissionTimestamp === 'number') {
        firestoreUpdates.submissionTimestamp = Timestamp.fromMillis(updates.submissionTimestamp);
    } else if (updates.hasOwnProperty('submissionTimestamp') && updates.submissionTimestamp === null) {
        firestoreUpdates.submissionTimestamp = null;
    }


    firestoreUpdates.lastModified = serverTimestamp();
    firestoreUpdates.lastModifiedTimestamp = serverTimestamp();


    if (updates.approvalSteps) {
      firestoreUpdates.approvalSteps = updates.approvalSteps.map((step: Partial<ApprovalStep>) => ({
        level: step.level, // Assuming level is always present
        decision: step.decision || null,
        userId: step.userId || null,
        userName: step.userName || null,
        date: step.date && typeof step.date === 'string' ? Timestamp.fromDate(new Date(step.date)) : (step.date instanceof Timestamp ? step.date : null),
        notes: step.notes || null,
      }));
    }

    if (updates.attachments) {
        const updatedAttachments: Omit<Attachment, 'file'>[] = [];
        for (const att of updates.attachments) {
            if (att.file && (!att.id || !att.id.startsWith('att-storage-'))) { 
                const uploadedFileMeta = await uploadAttachmentFile(att.file, id);
                updatedAttachments.push({
                    id: `att-storage-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                    name: uploadedFileMeta.name!,
                    url: uploadedFileMeta.url!,
                    type: uploadedFileMeta.type!,
                    size: uploadedFileMeta.size!,
                    uploadedAt: Timestamp.fromDate(new Date(uploadedFileMeta.uploadedAt!)),
                    storagePath: uploadedFileMeta.storagePath,
                });
            } else { 
                const { file, ...restOfAtt } = att;
                updatedAttachments.push({
                    ...restOfAtt,
                    uploadedAt: restOfAtt.uploadedAt && typeof restOfAtt.uploadedAt === 'string'
                        ? Timestamp.fromDate(new Date(restOfAtt.uploadedAt))
                        : (restOfAtt.uploadedAt instanceof Timestamp ? restOfAtt.uploadedAt : Timestamp.now()),
                });
            }
        }
        firestoreUpdates.attachments = updatedAttachments;
    }
    
    // Ensure explicitly optional fields are set to null if they are undefined in updates
    const optionalFields: (keyof RiskAssessment)[] = [
        'imoNumber', 'maritimeExemptionNumber', 'patrolStartDate', 'patrolEndDate', 'patrolLengthDays',
        'aiRiskScore', 'aiGeneratedSummary', 'aiSuggestedMitigations', 'aiRegulatoryConsiderations',
        'aiLikelihoodScore', 'aiConsequenceScore', 'employeeName', 'certificateHeld',
        'requiredCertificate', 'deptHeadConfidenceReason', 'workedInDepartmentDetails',
        'similarResponsibilityDetails', 'certificationProgressSummary', 'detailedCrewCompetencyAssessment',
        'crewContinuityDetails', 'specialVoyageConsiderations'
        // Add any other optional fields here
    ];
    optionalFields.forEach(field => {
        if (firestoreUpdates.hasOwnProperty(field) && firestoreUpdates[field] === undefined) {
            firestoreUpdates[field] = null;
        }
    });


    delete firestoreUpdates.id;

    await updateDoc(docRef, firestoreUpdates);
  } catch (error) {
    console.error(`Error updating risk assessment with ID ${id}: `, error);
    if (error instanceof Error && 'details' in error) {
        console.error("Firestore Error Details:", (error as any).details);
    }
    throw new Error("Failed to update risk assessment.");
  }
}

export async function deleteAttachmentFileByUrl(fileUrl: string): Promise<void> {
  try {
    if (!fileUrl || !fileUrl.startsWith('https://firebasestorage.googleapis.com/')) {
        console.warn("Not a Firebase Storage URL or URL is empty, skipping delete: ", fileUrl);
        return;
    }
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error) {
    if ((error as any).code === 'storage/object-not-found') {
      console.warn(`File not found for deletion: ${fileUrl}`);
    } else {
      console.error(`Error deleting attachment file ${fileUrl}: `, error);
      throw new Error("Failed to delete attachment file.");
    }
  }
}

