
// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { config } from 'dotenv';

config(); // Load environment variables

let dbAdminInstance: admin.firestore.Firestore | null = null;
let storageAdminInstance: admin.storage.Storage | null = null;

if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectIdFromEnv = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

    if (firestoreEmulatorHost) {
      console.warn(`--------------------------------------------------------------------`);
      console.warn(`WARNING: FIRESTORE_EMULATOR_HOST is set to: "${firestoreEmulatorHost}"`);
      console.warn(`The Firebase Admin SDK will attempt to connect to the Firestore emulator.`);
      console.warn(`If you intend to connect to your CLOUD Firestore, please UNSET this environment variable.`);
      console.warn(`If seeding the emulator, ensure it's running and properly configured.`);
      console.warn(`This is likely the cause of "5 NOT_FOUND" errors if the emulator is not active or accessible.`);
      console.warn(`--------------------------------------------------------------------`);
    }

    if (!serviceAccountPath) {
      console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for firebase-admin to connect to Cloud Firestore. If using emulator, this might be ignorable if emulator is running.');
    }
    if (!projectIdFromEnv) {
      console.error('ERROR: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set. This is required for explicit projectId initialization with Cloud Firestore.');
    }

    // Initialize with explicit project ID to be certain, especially if not using emulator
    // or if service account has access to multiple projects.
    const appOptions: admin.AppOptions = {
      credential: serviceAccountPath ? admin.credential.applicationDefault() : undefined, // Uses GOOGLE_APPLICATION_CREDENTIALS
      projectId: projectIdFromEnv,
    };
     // If GOOGLE_APPLICATION_CREDENTIALS is not set, we might be in an environment
     // where it's implicitly available (like Google Cloud Functions/Run).
     // If it's not set and projectIdFromEnv is also not set, initialization will likely fail.
     // If only projectIdFromEnv is set, it might work in GCF/Run if default creds are available.

    if (!appOptions.credential && !firestoreEmulatorHost) {
        console.warn("WARNING: GOOGLE_APPLICATION_CREDENTIALS is not set and not targeting an emulator. SDK initialization might rely on implicit credentials (e.g., in GCF/Cloud Run) or fail.");
    }


    admin.initializeApp(appOptions);
    const adminApp = admin.app();

    if (adminApp.options.projectId) {
      console.log(`Firebase Admin SDK initialized successfully for Project ID: ${adminApp.options.projectId}`);
      try {
        dbAdminInstance = admin.firestore();
        storageAdminInstance = admin.storage();
        console.log('Firestore and Storage admin instances initialized successfully.');

        // Diagnostic: Attempt to list collections
        if (dbAdminInstance) {
          console.log('Attempting diagnostic: List collections...');
          dbAdminInstance.listCollections()
            .then(collections => {
              console.log(`Diagnostic SUCCESS: Found ${collections.length} collections.`);
              collections.forEach(collection => {
                console.log(`  - Collection ID: ${collection.id}`);
              });
            })
            .catch(listError => {
              console.error('Diagnostic FAILURE: Error listing collections:');
              console.error('  Error Message:', listError.message);
              if (listError.code) console.error('  Error Code:', listError.code);
              if (listError.details) console.error('  Error Details:', listError.details);
            });
        }

      } catch (e: any) {
          console.error("Error getting Firestore/Storage admin instances AFTER SDK initialization and project ID confirmation:", e.message);
      }
    } else {
      console.error('ERROR: Firebase Admin SDK initialized, but Project ID is still not available even after explicit setting.');
      console.error(`Check if NEXT_PUBLIC_FIREBASE_PROJECT_ID ("${projectIdFromEnv}") in .env is correct and matches your Firebase project.`);
      console.error(`Also verify your service account key if not using an emulator.`);
    }
  } catch (error: any) {
    console.error('CRITICAL ERROR during Firebase Admin SDK initialization:');
    console.error('Message:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    if (error.errorInfo) console.error('Error Info:', error.errorInfo);
    console.error('This usually indicates a problem with the service account key file path, its content, or the explicitly provided projectId.');
  }
} else {
  const adminApp = admin.app();
  if (adminApp.options.projectId) {
      if (!dbAdminInstance) dbAdminInstance = admin.firestore();
      if (!storageAdminInstance) storageAdminInstance = admin.storage();
  } else {
      console.warn('Firebase Admin SDK was already initialized, but still no Project ID detected. Previous initialization likely failed to determine it.');
  }
}

export { admin, dbAdminInstance as dbAdmin, storageAdminInstance as storageAdmin };
