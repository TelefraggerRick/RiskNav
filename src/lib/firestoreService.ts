
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
      delete attachmentData.file; 
      if (attachmentData.dataAiHint === undefined) { // Safeguard: remove undefined dataAiHint
        delete attachmentData.dataAiHint;
      }
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
  console.log("FirestoreService: addAssessmentToDB called with data:", JSON.parse(JSON.stringify(assessmentData)));
  try {
    const { id, submissionDate, lastModified, ...dataForFirestore } = assessmentData;
    
    const preparedData = prepareAssessmentDataForFirestore(dataForFirestore as Partial<RiskAssessment>);
    console.log("FirestoreService: addAssessmentToDB - prepared data for Firestore:", JSON.parse(JSON.stringify(preparedData)));

    const docRef = await addDoc(collection(db, 'riskAssessments'), {
      ...preparedData,
      submissionDate: serverTimestamp(),
      lastModified: serverTimestamp(),
    });
    console.log("FirestoreService: addAssessmentToDB - Document written with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("FirestoreService: Error adding new assessment: ", error);
    throw error;
  }
};

export const updateAssessmentInDB = async (
  id: string,
  updates: Partial<RiskAssessment>
): Promise<void> => {
  console.log(`FirestoreService: updateAssessmentInDB called for ID: ${id} with updates:`, JSON.parse(JSON.stringify(updates)));
  try {
    const assessmentDocRef = doc(db, 'riskAssessments', id);
    const { submissionDate, ...updatesForFirestore } = updates;
    
    const preparedUpdates = prepareAssessmentDataForFirestore(updatesForFirestore);
    console.log(`FirestoreService: updateAssessmentInDB - prepared updates for Firestore for ID ${id}:`, JSON.parse(JSON.stringify(preparedUpdates)));
    
    console.log(`FirestoreService: BEFORE actual updateDoc call for ID ${id}`);
    await updateDoc(assessmentDocRef, {
      ...preparedUpdates,
      lastModified: serverTimestamp(),
    });
    console.log(`FirestoreService: Successfully updated assessment ${id} AFTER updateDoc call.`);
  } catch (error) {
    console.error(`FirestoreService: Error updating assessment ${id}: `, error);
    throw error;
  }
};


export const uploadFileToStorage = async (file: File, storagePath: string): Promise<string> => {
  console.log(`FirestoreService: uploadFileToStorage - Initiating upload. File: ${file.name}, Size: ${file.size}, Type: ${file.type}, Path: ${storagePath}`);
  
  if (!file) {
    console.error("FirestoreService: uploadFileToStorage - File object is null or undefined.");
    return Promise.reject(new Error("File object is missing."));
  }
  if (!storagePath || storagePath.trim() === "") {
    console.error("FirestoreService: uploadFileToStorage - Storage path is invalid.");
    return Promise.reject(new Error("Storage path is invalid."));
  }

  const storageRef = ref(storage, storagePath);
  console.log(`FirestoreService: uploadFileToStorage - Created storageRef for path: ${storagePath}`);
  const uploadTask = uploadBytesResumable(storageRef, file);
  console.log(`FirestoreService: uploadFileToStorage - Created uploadTask for ${file.name}`);

  return new Promise((resolve, reject) => {
    console.log(`FirestoreService: uploadFileToStorage - Promise created for ${file.name}. Attaching listeners.`);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`FirestoreService: Upload is ${progress.toFixed(2)}% done for ${file.name} (Path: ${storagePath})`);
        switch (snapshot.state) {
          case 'paused':
            console.log(`FirestoreService: Upload is paused for ${file.name}`);
            break;
          case 'running':
            // console.log(`FirestoreService: Upload is running for ${file.name}`); // Can be too noisy
            break;
        }
      },
      (error) => {
        console.error(`FirestoreService: Upload failed for ${file.name} (Path: ${storagePath}). Full error object:`, error);
        console.error(`FirestoreService: Error name: ${error.name}, message: ${error.message}, code: ${error.code}`);
        switch (error.code) {
          case 'storage/unauthorized':
            console.error("FirestoreService: User does not have permission to access the object. Check Storage Rules.");
            break;
          case 'storage/canceled':
            console.error("FirestoreService: User canceled the upload.");
            break;
          case 'storage/unknown':
          default:
            console.error("FirestoreService: Unknown error occurred, inspect error.serverResponse / error object above.");
            break;
        }
        reject(error);
      },
      async () => {
        console.log(`FirestoreService: Upload completed for ${file.name} (Path: ${storagePath}). Getting download URL...`);
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log(`FirestoreService: Download URL obtained for ${file.name}: ${downloadURL}`);
          resolve(downloadURL);
        } catch (getUrlError) {
          console.error(`FirestoreService: Failed to get download URL for ${file.name} (Path: ${storagePath})`, getUrlError);
          reject(getUrlError);
        }
      }
    );
    console.log(`FirestoreService: uploadFileToStorage - Listeners attached for ${file.name}`);
  });
};
    
