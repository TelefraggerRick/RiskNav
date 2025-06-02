
// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { config } from 'dotenv';

config(); // Load environment variables

if (!admin.apps.length) {
  try {
    // Rely on GOOGLE_APPLICATION_CREDENTIALS to provide the project context implicitly.
    // The service account JSON file itself contains the project_id.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });

    if (admin.app().options.projectId) {
      console.log(`Firebase Admin SDK initialized. Detected Project ID: ${admin.app().options.projectId}`);
    } else {
      // This scenario is highly unlikely if GOOGLE_APPLICATION_CREDENTIALS is set correctly to a valid service account key.
      console.warn('Firebase Admin SDK initialized, but Project ID could not be automatically determined from credentials. This might lead to issues connecting to Firestore/Storage.');
    }

  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    if (error.errorInfo) {
      console.error('Error Info:', error.errorInfo);
    }
    if (error.message.includes('Could not load the default credentials') || error.message.includes('ENOENT') || error.message.includes('credential file')) {
        console.error('Ensure your GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and points to a valid service account key JSON file, or that Application Default Credentials (ADC) are configured in your environment.');
    } else if (error.message.includes('project ID could not be determined')) {
        console.error('The Admin SDK could not determine a project ID. Ensure your service account key is valid or your environment is configured for ADC.');
    }
    // We don't want the script to halt the assistant, so we won't process.exit(1) here.
    // The calling script (seedDatabase.ts) should check if dbAdmin is available.
  }
}

let dbAdminInstance: admin.firestore.Firestore | null = null;
let storageAdminInstance: admin.storage.Storage | null = null;

try {
  // Only attempt to get Firestore/Storage instances if the app initialized AND has a projectId.
  if (admin.apps.length > 0 && admin.app().options.projectId) {
    dbAdminInstance = admin.firestore();
    storageAdminInstance = admin.storage();
  } else if (admin.apps.length > 0 && !admin.app().options.projectId) {
    console.error("Cannot initialize Firestore/Storage admin instances: Admin SDK initialized without a determinable Project ID. Firestore operations will fail.");
  } else {
    // This case implies admin.initializeApp() failed or was never called.
    console.error("Cannot initialize Firestore/Storage admin instances: Firebase Admin SDK is not initialized.");
  }
} catch (e: any) {
    console.error("Error getting Firestore/Storage admin instances after SDK initialization:", e.message);
}

export { admin, dbAdminInstance as dbAdmin, storageAdminInstance as storageAdmin };
