// src/services/riskAssessmentService.ts
'use server'; // For potential use in Server Actions/Components if needed, though primarily client-side for now

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
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { RiskAssessment, Attachment, RiskAssessmentFormData } from '@/lib/types';

const ASSESSMENTS_COLLECTION = 'riskAssessments';

// Helper to convert Firestore Timestamps to ISO strings
const convertTimestampsToISO = (data: any): any => {
  if (!data) return data;
  const newData = { ...data };
  for (const key in newData) {
    if (newData[key] instanceof Timestamp) {
      newData[key] = (newData[key] as Timestamp).toDate().toISOString();
    } else if (typeof newData[key] === 'object' && newData[key] !== null) {
      // Recursively convert for nested objects (like approvalSteps)
      if (Array.isArray(newData[key])) {
        newData[key] = newData[key].map(convertTimestampsToISO);
      } else {
        newData[key] = convertTimestampsToISO(newData[key]);
      }
    }
  }
  return newData;
};


export async function getAllRiskAssessments(): Promise<RiskAssessment[]> {
  try {
    const q = query(collection(db, ASSESSMENTS_COLLECTION), orderBy('submissionTimestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap =>
      convertTimestampsToISO({ ...docSnap.data(), id: docSnap.id }) as RiskAssessment
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
      return convertTimestampsToISO({ ...docSnap.data(), id: docSnap.id }) as RiskAssessment;
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
    uploadedAt: new Date().toISOString(), // Or use serverTimestamp from Firestore if preferred for metadata
  };
}

export async function addRiskAssessment(formData: RiskAssessmentFormData, submittedBy: string): Promise<string> {
  try {
    const now = new Date();
    const submissionTimestamp = Timestamp.fromDate(now); // Firestore Timestamp

    // Handle attachments: Upload files and get their URLs
    const processedAttachments: Attachment[] = [];
    if (formData.attachments && formData.attachments.length > 0) {
      // Temporarily use a placeholder ID for uploads, or generate one
      const tempAssessmentId = `temp_${Date.now()}`; 
      for (const att of formData.attachments) {
        if (att.file) {
          const uploadedFileMeta = await uploadAttachmentFile(att.file, tempAssessmentId);
          processedAttachments.push({
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2,7)}`, // client-side unique enough ID for the array
            ...uploadedFileMeta,
          } as Attachment);
        } else if (att.url) { // Should not happen for new assessments, but good practice
          processedAttachments.push(att as Attachment);
        }
      }
    }
    
    const newAssessmentData: Omit<RiskAssessment, 'id'> = {
      ...formData,
      attachments: processedAttachments,
      submittedBy,
      submissionDate: now.toISOString(),
      submissionTimestamp: submissionTimestamp.toMillis(), // Store as millis for easier client-side sorting if needed
      lastModified: now.toISOString(),
      lastModifiedTimestamp: submissionTimestamp.toMillis(),
      // Firestore specific fields if needed (e.g. serverTimestamp() for lastModified)
      // For example: lastModified: serverTimestamp() // this would be a Firestore specific type
    };
    
    // Replace client-side timestamps with server timestamps before writing
    const firestoreReadyData = {
      ...newAssessmentData,
      submissionTimestamp: submissionTimestamp, // Actual Firestore Timestamp
      lastModifiedTimestamp: serverTimestamp(), // Use server timestamp for lastModified
      approvalSteps: newAssessmentData.approvalSteps.map(step => ({
        ...step,
        date: step.date ? Timestamp.fromDate(new Date(step.date)) : undefined,
      })),
    };


    const docRef = await addDoc(collection(db, ASSESSMENTS_COLLECTION), firestoreReadyData);
    
    // If we used a tempAssessmentId for uploads, we might want to rename the storage folder,
    // but for simplicity, keeping it as is. Or, upload after getting the docRef.id.
    // For now, temp ID in path is acceptable for prototyping.

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

    // Convert specific string dates back to Timestamps if they exist in updates
    if (updates.submissionDate) {
      firestoreUpdates.submissionTimestamp = Timestamp.fromDate(new Date(updates.submissionDate));
    }
    firestoreUpdates.lastModified = new Date().toISOString(); // Keep as ISO string for display
    firestoreUpdates.lastModifiedTimestamp = serverTimestamp(); // Use server timestamp for actual update time

    if (updates.approvalSteps) {
      firestoreUpdates.approvalSteps = updates.approvalSteps.map(step => ({
        ...step,
        date: step.date ? Timestamp.fromDate(new Date(step.date)) : undefined,
      }));
    }

    // Handle attachment updates (more complex: involves checking for new files, deleted files)
    // For simplicity, this example assumes 'updates.attachments' replaces the entire array
    // A more robust solution would compare old and new attachment arrays.
    if (updates.attachments) {
        const updatedAttachments: Attachment[] = [];
        for (const att of updates.attachments) {
            if (att.file && !att.id.startsWith('att-storage-')) { // New file to upload
                const uploadedFileMeta = await uploadAttachmentFile(att.file, id);
                updatedAttachments.push({
                    id: `att-storage-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, // Indicate it's from storage
                    ...uploadedFileMeta,
                } as Attachment);
            } else { // Existing attachment
                updatedAttachments.push(att);
            }
        }
        firestoreUpdates.attachments = updatedAttachments;
    }


    await updateDoc(docRef, firestoreUpdates);
  } catch (error) {
    console.error(`Error updating risk assessment with ID ${id}: `, error);
    throw new Error("Failed to update risk assessment.");
  }
}

// Example of how you might delete an attachment file from storage (if needed)
export async function deleteAttachmentFileByUrl(fileUrl: string): Promise<void> {
  try {
    if (!fileUrl.startsWith('https://firebasestorage.googleapis.com/')) {
        console.warn("Not a Firebase Storage URL, skipping delete: ", fileUrl);
        return;
    }
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error) {
    // It's okay if the file doesn't exist (e.g., already deleted)
    if ((error as any).code === 'storage/object-not-found') {
      console.warn(`File not found for deletion: ${fileUrl}`);
    } else {
      console.error(`Error deleting attachment file ${fileUrl}: `, error);
      throw new Error("Failed to delete attachment file.");
    }
  }
}
