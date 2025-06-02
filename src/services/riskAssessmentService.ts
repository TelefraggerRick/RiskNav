
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
import type { RiskAssessment, Attachment, RiskAssessmentFormData } from '@/lib/types';

const ASSESSMENTS_COLLECTION = 'riskAssessments';

// Helper to convert Firestore Timestamps to client-friendly types (ISO strings or millis numbers)
const convertFirestoreTypes = (data: any): any => {
  if (data === null || data === undefined) return data;

  if (data instanceof Timestamp) {
    // This case is for when convertFirestoreTypes might be called on a Timestamp directly
    // This specific check might not be hit if iterating object keys, but good for robustness
    return data.toDate().toISOString(); // Default to ISO string if called directly on a Timestamp
  }

  if (Array.isArray(data)) {
    return data.map(item => convertFirestoreTypes(item));
  }

  if (typeof data === 'object') {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (value instanceof Timestamp) {
          if (key === 'submissionTimestamp' || key === 'lastModifiedTimestamp') {
            newData[key] = value.toMillis(); // Convert specific fields to Unix milliseconds
          } else {
            // Convert other Timestamp fields (e.g., submissionDate, lastModified, approvalStep.date, attachment.uploadedAt) to ISO strings
            newData[key] = value.toDate().toISOString();
          }
        } else if (typeof value === 'object' && value !== null) {
          newData[key] = convertFirestoreTypes(value); // Recursively convert for nested objects/arrays
        } else {
          newData[key] = value; // Copy other primitive values as is
        }
      }
    }
    return newData;
  }
  return data; // Return primitives if not object/array/timestamp
};


export async function getAllRiskAssessments(): Promise<RiskAssessment[]> {
  try {
    // Ensure submissionTimestamp in Firestore is a Timestamp for correct ordering
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
    uploadedAt: new Date().toISOString(), // Client sets ISO string, Firestore converts to Timestamp on save if field type is Timestamp
    storagePath: storageRef.fullPath, // Store the full path for potential deletion
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
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
            ...uploadedFileMeta,
            uploadedAt: uploadedFileMeta.uploadedAt || now.toISOString(), // Ensure uploadedAt is string
          } as Attachment);
        }
      }
    }

    const newAssessmentData: Omit<RiskAssessment, 'id' | 'submissionDate' | 'lastModified' | 'submissionTimestamp' | 'lastModifiedTimestamp' | 'status' | 'approvalSteps'> & { status: RiskAssessmentStatus, approvalSteps: any[] } = {
      ...formData,
      attachments: processedAttachments,
      submittedBy,
      status: 'Pending Crewing Standards and Oversight', // Initial status
      approvalSteps: formData.approvalSteps ? formData.approvalSteps.map(step => ({ ...step, date: step.date ? Timestamp.fromDate(new Date(step.date)) : undefined })) : [],
    };

    const firestoreReadyData = {
      ...newAssessmentData,
      submissionDate: submissionFirestoreTimestamp, // Store as Firestore Timestamp
      lastModified: serverTimestamp(), // Store as Firestore serverTimestamp
      submissionTimestamp: submissionFirestoreTimestamp, // For ordering, store as Firestore Timestamp
      lastModifiedTimestamp: serverTimestamp(), // For ordering or consistency, store as Firestore serverTimestamp
      attachments: newAssessmentData.attachments.map(att => ({
        ...att,
        uploadedAt: Timestamp.fromDate(new Date(att.uploadedAt)), // Store as Timestamp
      })),
    };

    const docRef = await addDoc(collection(db, ASSESSMENTS_COLLECTION), firestoreReadyData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding risk assessment: ", error);
    throw new Error("Failed to add risk assessment.");
  }
}

export async function updateRiskAssessment(id: string, updates: Partial<RiskAssessment>): Promise<void> {
  try {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, id);

    const firestoreUpdates: any = { ...updates };

    // Convert specific string dates from client back to Timestamps if they exist in updates
    if (updates.submissionDate && typeof updates.submissionDate === 'string') {
      firestoreUpdates.submissionDate = Timestamp.fromDate(new Date(updates.submissionDate));
    }
    if (updates.submissionTimestamp && typeof updates.submissionTimestamp === 'number') { // If client sends number
        firestoreUpdates.submissionTimestamp = Timestamp.fromMillis(updates.submissionTimestamp);
    }

    firestoreUpdates.lastModified = serverTimestamp(); // Use server timestamp for actual update time
    firestoreUpdates.lastModifiedTimestamp = serverTimestamp();


    if (updates.approvalSteps) {
      firestoreUpdates.approvalSteps = updates.approvalSteps.map(step => ({
        ...step,
        date: step.date && typeof step.date === 'string' ? Timestamp.fromDate(new Date(step.date)) : (step.date instanceof Timestamp ? step.date : undefined),
      }));
    }

    if (updates.attachments) {
        const updatedAttachments: Omit<Attachment, 'file'>[] = [];
        for (const att of updates.attachments) {
            if (att.file && !att.id.startsWith('att-storage-')) { // New file to upload
                const uploadedFileMeta = await uploadAttachmentFile(att.file, id);
                updatedAttachments.push({
                    id: `att-storage-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                    name: uploadedFileMeta.name!,
                    url: uploadedFileMeta.url!,
                    type: uploadedFileMeta.type!,
                    size: uploadedFileMeta.size!,
                    uploadedAt: Timestamp.fromDate(new Date(uploadedFileMeta.uploadedAt!)), // Store as Timestamp
                    storagePath: uploadedFileMeta.storagePath,
                });
            } else { // Existing attachment, ensure date is Timestamp
                const { file, ...restOfAtt } = att;
                updatedAttachments.push({
                    ...restOfAtt,
                    uploadedAt: restOfAtt.uploadedAt && typeof restOfAtt.uploadedAt === 'string'
                        ? Timestamp.fromDate(new Date(restOfAtt.uploadedAt))
                        : (restOfAtt.uploadedAt instanceof Timestamp ? restOfAtt.uploadedAt : Timestamp.now()), // Fallback if type is wrong
                });
            }
        }
        firestoreUpdates.attachments = updatedAttachments;
    }
    // Remove id if it's part of updates, as it's the document key
    delete firestoreUpdates.id;

    await updateDoc(docRef, firestoreUpdates);
  } catch (error) {
    console.error(`Error updating risk assessment with ID ${id}: `, error);
    throw new Error("Failed to update risk assessment.");
  }
}

export async function deleteAttachmentFileByUrl(fileUrl: string): Promise<void> {
  try {
    if (!fileUrl.startsWith('https://firebasestorage.googleapis.com/')) {
        console.warn("Not a Firebase Storage URL, skipping delete: ", fileUrl);
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
