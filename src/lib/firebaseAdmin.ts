
// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { config } from 'dotenv';

config(); // Load environment variables

let dbAdminInstance: admin.firestore.Firestore | null = null;
let storageAdminInstance: admin.storage.Storage | null = null;

if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountPath) {
      console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for firebase-admin.');
      console.error('Please ensure it is set in your .env file and points to your service account key JSON file.');
    } else {
      // admin.credential.applicationDefault() will use GOOGLE_APPLICATION_CREDENTIALS
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });

      const adminApp = admin.app(); // Get the default app instance

      if (adminApp.options.projectId) {
        console.log(`Firebase Admin SDK initialized. Detected Project ID: ${adminApp.options.projectId}`);
        try {
          dbAdminInstance = admin.firestore();
          storageAdminInstance = admin.storage();
          console.log('Firestore and Storage admin instances initialized successfully.');
        } catch (e: any) {
            console.error("Error getting Firestore/Storage admin instances AFTER SDK initialization and project ID detection:", e.message);
        }
      } else {
        // This is the critical path for your current error
        console.error('ERROR: Firebase Admin SDK initialized, but Project ID could NOT be automatically determined from the credentials.');
        console.error(`Please VERIFY the content of your service account key file specified by GOOGLE_APPLICATION_CREDENTIALS ("${serviceAccountPath}").`);
        console.error('Ensure the JSON file is valid, not corrupted, and CONTAINS a valid "project_id" field (e.g., "project_id": "risknav").');
        console.error('If the file is correct, also ensure the GOOGLE_APPLICATION_CREDENTIALS path in your .env file is accurate.');
      }
    }
  } catch (error: any) {
    console.error('CRITICAL ERROR during Firebase Admin SDK initialization:');
    console.error('Message:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    if (error.errorInfo) console.error('Error Info:', error.errorInfo);
    console.error('This usually indicates a problem with the service account key file path or its content.');
    console.error('Ensure GOOGLE_APPLICATION_CREDENTIALS in your .env file points to a valid service account key JSON file.');
  }
} else {
  // App already initialized, try to get instances if they weren't set
  const adminApp = admin.app();
  if (adminApp.options.projectId) {
      if (!dbAdminInstance) dbAdminInstance = admin.firestore();
      if (!storageAdminInstance) storageAdminInstance = admin.storage();
      if(dbAdminInstance && storageAdminInstance) console.log('Firebase Admin SDK was already initialized. Re-checked instances.');
  } else {
      console.warn('Firebase Admin SDK was already initialized, but still no Project ID detected. Previous initialization likely failed to determine it.');
  }
}

export { admin, dbAdminInstance as dbAdmin, storageAdminInstance as storageAdmin };
