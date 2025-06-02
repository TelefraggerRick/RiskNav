
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
  // where,
  // writeBatch,
  // deleteDoc,
  // QuerySnapshot,
  DocumentData,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { RiskAssessment, Attachment, ApprovalStep } from '@/lib/types';

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

// Helper to prepare data for Firestore: convert date strings/objects to Timestamps, remove File objects
const prepareAssessmentDataForFirestore = (data: Partial<RiskAssessment>): DocumentData => {
  const firestoreData: DocumentData = { ...data };

  // Convert relevant date strings to Timestamps if they are strings
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
      const { file, ...restOfAtt } = att; // Remove File object if present
      const attachmentData: Partial<Attachment> = { ...restOfAtt };
      if (att.uploadedAt && typeof att.uploadedAt === 'string') {
        attachmentData.uploadedAt = Timestamp.fromDate(new Date(att.uploadedAt)) as any;
      } else if (att.uploadedAt instanceof Date) {
        attachmentData.uploadedAt = Timestamp.fromDate(att.uploadedAt) as any;
      }
      delete attachmentData.file; // Ensure file property is not included
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
  
  // Remove top-level 'file' property if it exists by mistake (e.g. from form data)
  delete firestoreData.file; 
  
  return firestoreData;
};

export const addAssessmentToDB = async (
  assessmentData: Omit<RiskAssessment, 'id' | 'submissionDate' | 'lastModified'> & { attachments?: Array<Partial<Attachment> & { file?: File }> }
): Promise<string> => {
  try {
    // Remove 'id', 'submissionDate', 'lastModified' as they will be set by Firestore or serverTimestamp
    const { id, submissionDate, lastModified, ...dataForFirestore } = assessmentData;
    
    const preparedData = prepareAssessmentDataForFirestore(dataForFirestore as Partial<RiskAssessment>);

    const docRef = await addDoc(collection(db, 'riskAssessments'), {
      ...preparedData,
      submissionDate: serverTimestamp(), // Firestore server-side timestamp
      lastModified: serverTimestamp(),   // Firestore server-side timestamp
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
    // Remove fields that should not be directly updated or are handled by serverTimestamp
    const { submissionDate, ...updatesForFirestore } = updates;
    
    const preparedUpdates = prepareAssessmentDataForFirestore(updatesForFirestore);
    
    await updateDoc(assessmentDocRef, {
      ...preparedUpdates,
      lastModified: serverTimestamp(), // Update lastModified with server-side timestamp
    });
  } catch (error) {
    console.error(`Error updating assessment ${id}: `, error);
    throw error;
  }
};
