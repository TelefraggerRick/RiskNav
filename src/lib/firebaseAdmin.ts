
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

    if (!serviceAccountPath) {
      console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for firebase-admin.');
    } else if (!projectIdFromEnv) {
      console.error('ERROR: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set. This is required for explicit projectId initialization.');
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(), // Uses GOOGLE_APPLICATION_CREDENTIALS
        projectId: projectIdFromEnv, // Explicitly set project ID
      });

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
        // This case should ideally not be reached if projectIdFromEnv was provided and valid.
        console.error('ERROR: Firebase Admin SDK initialized, but Project ID is still not available even after explicit setting.');
        console.error(`Check if NEXT_PUBLIC_FIREBASE_PROJECT_ID ("${projectIdFromEnv}") in .env is correct and matches your Firebase project.`);
      }
    }
  } catch (error: any) {
    console.error('CRITICAL ERROR during Firebase Admin SDK initialization:');
    console.error('Message:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    if (error.errorInfo) console.error('Error Info:', error.errorInfo);
    console.error('This usually indicates a problem with the service account key file path, its content, or the explicitly provided projectId.');
    console.error('Ensure GOOGLE_APPLICATION_CREDENTIALS in your .env file points to a valid service account key JSON file, and NEXT_PUBLIC_FIREBASE_PROJECT_ID is correct.');
  }
} else {
  const adminApp = admin.app();
  if (adminApp.options.projectId) {
      if (!dbAdminInstance) dbAdminInstance = admin.firestore();
      if (!storageAdminInstance) storageAdminInstance = admin.storage();
      if(dbAdminInstance && storageAdminInstance) {
        // console.log('Firebase Admin SDK was already initialized. Re-checked instances.'); // Can be noisy, uncomment if needed
      }
  } else {
      console.warn('Firebase Admin SDK was already initialized, but still no Project ID detected. Previous initialization likely failed to determine it.');
  }
}

export { admin, dbAdminInstance as dbAdmin, storageAdminInstance as storageAdmin };
