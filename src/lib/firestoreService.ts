
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
  FieldValue,
  deleteField,
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import type { RiskAssessment, Attachment, ApprovalStep, AppUser, UserRole, VesselRegion } from '@/lib/types';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

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

const mapDocToRiskAssessment = (docSnap: DocumentSnapshot<DocumentData>): RiskAssessment => {
    const data = docSnap.data();
    if (!data) throw new Error(`Document data undefined for doc id: ${docSnap.id}`);
    const assessmentWithTimestamps = { id: docSnap.id, ...data } as RiskAssessment;
    return convertTimestampsToISO(assessmentWithTimestamps);
};

const mapDocToAppUser = (docSnap: DocumentSnapshot<DocumentData>): AppUser => {
    const data = docSnap.data();
    if (!data) throw new Error(`User document data undefined for doc id: ${docSnap.id}`);
    return { uid: docSnap.id, ...data } as AppUser;
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

const prepareAssessmentDataForFirestore = (data: Partial<RiskAssessment>): DocumentData => {
  const firestoreData: DocumentData = JSON.parse(JSON.stringify(data)); // Deep clone to avoid mutating original

  // Convert top-level date strings/Dates to Timestamps
  const dateFieldsToConvert: (keyof RiskAssessment)[] = [
    'submissionDate', 'lastModified', 'patrolStartDate', 'patrolEndDate'
  ];
  dateFieldsToConvert.forEach(field => {
    if (firestoreData[field] && typeof firestoreData[field] === 'string') {
      try {
        const parsedDate = new Date(firestoreData[field] as string);
        if (!isNaN(parsedDate.getTime())) {
          firestoreData[field] = Timestamp.fromDate(parsedDate);
        } else {
          // If parsing fails, consider removing or logging, rather than sending invalid date
          delete firestoreData[field];
        }
      } catch (e) {
        delete firestoreData[field]; // Remove if any error during date conversion
      }
    } else if (firestoreData[field] instanceof Date) {
      firestoreData[field] = Timestamp.fromDate(firestoreData[field] as Date);
    }
  });

  // Process attachments
  if (Array.isArray(firestoreData.attachments)) {
    firestoreData.attachments = firestoreData.attachments.map((att: any) => {
      if (typeof att !== 'object' || att === null) return att; // Skip if not an object
      const attachmentData: Partial<Attachment> = { ...att };
      if (att.uploadedAt && typeof att.uploadedAt === 'string') {
        try {
          const parsedDate = new Date(att.uploadedAt);
          if(!isNaN(parsedDate.getTime())) {
            attachmentData.uploadedAt = Timestamp.fromDate(parsedDate) as any;
          } else {
            delete attachmentData.uploadedAt;
          }
        } catch (e) { delete attachmentData.uploadedAt; }
      } else if (att.uploadedAt instanceof Date) {
        attachmentData.uploadedAt = Timestamp.fromDate(att.uploadedAt) as any;
      }
      delete attachmentData.file; // Always remove File object

      // Clean undefined/null keys within each attachment, keep empty strings if they are valid
      Object.keys(attachmentData).forEach(keyStr => {
        const key = keyStr as keyof Partial<Attachment>;
        if (attachmentData[key] === undefined) {
          delete attachmentData[key];
        }
      });
      return attachmentData;
    });
  }

  // Process approvalSteps
  if (Array.isArray(firestoreData.approvalSteps)) {
    firestoreData.approvalSteps = firestoreData.approvalSteps.map((step: any) => {
      if (typeof step !== 'object' || step === null) return step; // Skip if not an object
      const stepData: Partial<ApprovalStep> = { ...step };
      if (step.date && typeof step.date === 'string') {
         try {
          const parsedDate = new Date(step.date);
           if(!isNaN(parsedDate.getTime())) {
            stepData.date = Timestamp.fromDate(parsedDate) as any;
           } else {
             delete stepData.date;
           }
        } catch (e) { delete stepData.date; }
      } else if (step.date instanceof Date) {
         stepData.date = Timestamp.fromDate(step.date) as any;
      }
      // Clean undefined/null keys within each step
      Object.keys(stepData).forEach(keyStr => {
        const key = keyStr as keyof Partial<ApprovalStep>;
        if (stepData[key] === undefined) {
          delete stepData[key];
        }
      });
      return stepData;
    });
  }

  // Delete file property if it exists at the top level
  delete firestoreData.file;

  // Final cleanup for any top-level undefined/null properties
  Object.keys(firestoreData).forEach(key => {
    if (firestoreData[key] === undefined) {
      delete firestoreData[key];
    }
  });
  console.log("FirestoreService: Data prepared for Firestore:", JSON.parse(JSON.stringify(firestoreData)));
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
  console.log(`FirestoreService: updateAssessmentInDB called for ID: ${id} with raw updates:`, JSON.parse(JSON.stringify(updates)));
  try {
    const assessmentDocRef = doc(db, 'riskAssessments', id);
    const { submissionDate, ...updatesForFirestore } = updates; // submissionDate should not be updated manually here
    
    const preparedUpdates = prepareAssessmentDataForFirestore(updatesForFirestore);
    console.log(`FirestoreService: updateAssessmentInDB - prepared updates for Firestore for ID ${id}:`, JSON.parse(JSON.stringify(preparedUpdates)));
    
    if (Object.keys(preparedUpdates).length === 0) {
        console.warn(`FirestoreService: updateAssessmentInDB - No valid fields to update for ID ${id} after preparation. Skipping update to prevent empty operation error.`);
        // Optionally, update just the lastModified timestamp if that's desired behavior for "empty" updates
        // await updateDoc(assessmentDocRef, { lastModified: serverTimestamp() });
        return;
    }

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

export const getAllUsersFromDB = async (): Promise<AppUser[]> => {
  try {
    const usersCol = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCol);
    const userList = usersSnapshot.docs.map(doc => mapDocToAppUser(doc));
    return userList;
  } catch (error) {
    console.error("Error fetching all users: ", error);
    throw error;
  }
};

export const updateUserProfileInDB = async (uid: string, data: { role?: UserRole; region?: VesselRegion | null }): Promise<void> => {
  try {
    if (data.role === 'Unauthenticated') {
      throw new Error("Cannot assign 'Unauthenticated' role.");
    }
    const userDocRef = doc(db, 'users', uid);
    const updatesToApply: any = {}; 

    if (data.role) {
      updatesToApply.role = data.role;
    }
    if (data.hasOwnProperty('region')) { 
      if (data.region === null || data.region === undefined) { 
        updatesToApply.region = deleteField();
      } else {
        updatesToApply.region = data.region;
      }
    }
    
    if (Object.keys(updatesToApply).length === 0) {
      console.log(`No profile changes to apply for user ${uid}`);
      return;
    }

    await updateDoc(userDocRef, updatesToApply);
    console.log(`Successfully updated profile for user ${uid} with data:`, updatesToApply);
  } catch (error) {
    console.error(`Error updating profile for user ${uid}: `, error);
    throw error;
  }
};
