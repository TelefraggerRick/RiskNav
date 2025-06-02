
// src/lib/firestoreService.ts
'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  DocumentData,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase'; // Import storage
import type { RiskAssessment, Attachment, ApprovalStep } from '@/lib/types';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // Firebase Storage imports

// Helper to convert Firestore Timestamps to ISO strings recursively
const convertTimestampsToISO = (data: any): any => {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Timestamp) {
    return data.toDate().toISOString();
  }
  if (Array.isArray(data)) {
    return data.map(convertTimestampsToISO);
  }
  const result: { [key: string]: any } = {};
  for (const key in data) {
    result[key] = convertTimestampsToISO(data[key]);
  }
  return result;
};

// Helper to map a Firestore document snapshot to a RiskAssessment object
const mapDocToRiskAssessment = (docSnap: DocumentSnapshot<DocumentData>): RiskAssessment => {
    const data = docSnap.data();
    if (!data) throw new Error(`Document data undefined for doc id: ${docSnap.id}`);
    const assessmentWithTimestamps = { id: docSnap.id, ...data } as RiskAssessment;
    return convertTimestampsToISO(assessmentWithTimestamps);
};

export const getAllAssessmentsFromDB = async (): Promise<RiskAssessment[]> => {
  try {
    const assessmentsCol = collection(db, 'riskAssessments');
    const q = query(assessmentsCol, orderBy('lastModified', 'desc'));
    const assessmentSnapshot = await getDocs(q);
    const assessmentList = assessmentSnapshot.docs.map(doc => mapDocToRiskAssessment(doc));
    return assessmentList;
  } catch (error) {
    console.error("Error fetching all assessments: ", error);
    throw error;
  }
};

export const getAssessmentByIdFromDB = async (id: string): Promise<RiskAssessment | null> => {
  try {
    const assessmentDocRef = doc(db, 'riskAssessments', id);
    const docSnap = await getDoc(assessmentDocRef);
    if (docSnap.exists()) {
      return mapDocToRiskAssessment(docSnap);
    } else {
      console.log("No such document with ID:", id);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching assessment by ID ${id}: `, error);
    throw error;
  }
};

// Helper to prepare data for Firestore: convert date strings/objects to Timestamps and remove undefined
const prepareAssessmentDataForFirestore = (data: Partial<RiskAssessment>): DocumentData => {
  const firestoreData: DocumentData = { ...data };

  const dateFieldsToConvert: (keyof RiskAssessment)[] = [
    'submissionDate', 'lastModified', 'patrolStartDate', 'patrolEndDate'
  ];
  dateFieldsToConvert.forEach(field => {
    if (firestoreData[field] && typeof firestoreData[field] === 'string') {
      firestoreData[field] = Timestamp.fromDate(new Date(firestoreData[field] as string));
    } else if (firestoreData[field] instanceof Date) {
      firestoreData[field] = Timestamp.fromDate(firestoreData[field] as Date);
    }
  });
  
  if (firestoreData.attachments) {
    firestoreData.attachments = firestoreData.attachments.map((att: Partial<Attachment>) => {
      const attachmentData: Partial<Attachment> = { ...att };
      if (att.uploadedAt && typeof att.uploadedAt === 'string') {
        attachmentData.uploadedAt = Timestamp.fromDate(new Date(att.uploadedAt)) as any;
      } else if (att.uploadedAt instanceof Date) {
        attachmentData.uploadedAt = Timestamp.fromDate(att.uploadedAt) as any;
      }
      delete attachmentData.file; // Ensure file property is not included when saving to Firestore
      return attachmentData;
    });
  }

  if (firestoreData.approvalSteps) {
    firestoreData.approvalSteps = firestoreData.approvalSteps.map((step: Partial<ApprovalStep>) => {
      const stepData: Partial<ApprovalStep> = { ...step };
      if (step.date && typeof step.date === 'string') {
        stepData.date = Timestamp.fromDate(new Date(step.date)) as any;
      } else if (step.date instanceof Date) {
         stepData.date = Timestamp.fromDate(step.date) as any;
      }
      return stepData;
    });
  }
  
  delete firestoreData.file; 
  
  // Remove top-level undefined properties AFTER all conversions
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      delete firestoreData[key];
    }
  });

  return firestoreData;
};

export const addAssessmentToDB = async (
  assessmentData: Omit<RiskAssessment, 'id' | 'submissionDate' | 'lastModified'>
): Promise<string> => {
  try {
    const { id, submissionDate, lastModified, ...dataForFirestore } = assessmentData;
    
    const preparedData = prepareAssessmentDataForFirestore(dataForFirestore as Partial<RiskAssessment>);

    const docRef = await addDoc(collection(db, 'riskAssessments'), {
      ...preparedData,
      submissionDate: serverTimestamp(),
      lastModified: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding new assessment: ", error);
    throw error;
  }
};

export const updateAssessmentInDB = async (
  id: string,
  updates: Partial<RiskAssessment>
): Promise<void> => {
  try {
    const assessmentDocRef = doc(db, 'riskAssessments', id);
    const { submissionDate, ...updatesForFirestore } = updates;
    
    const preparedUpdates = prepareAssessmentDataForFirestore(updatesForFirestore);
    
    await updateDoc(assessmentDocRef, {
      ...preparedUpdates,
      lastModified: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating assessment ${id}: `, error);
    throw error;
  }
};

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file The file to upload.
 * @param storagePath The path in Firebase Storage where the file should be stored (e.g., 'riskAssessments/attachments/some-id/filename.pdf').
 * @returns A promise that resolves with the download URL of the uploaded file.
 */
export const uploadFileToStorage = async (file: File, storagePath: string): Promise<string> => {
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Optional: handle progress
        // const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        // console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        console.error("Upload failed:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error("Failed to get download URL:", error);
          reject(error);
        }
      }
    );
  });
};
