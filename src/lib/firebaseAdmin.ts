
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
      console.warn(`--------------------------------------------------------------------`);
    }

    if (!serviceAccountPath) {
      console.error('CRITICAL ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
      console.error('This is required for firebase-admin to authenticate.');
      console.error('Please set it in your .env file to point to your service account key JSON file (e.g., GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json).');
      process.exit(1); // Exit if service account path is missing
    }
    if (!projectIdFromEnv) {
      console.error('CRITICAL ERROR: NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set.');
      console.error('This is required for explicit projectId initialization with firebase-admin.');
      console.error('Please set it in your .env file (e.g., NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id).');
      process.exit(1); // Exit if project ID is missing
    }

    console.log(`Attempting to initialize Firebase Admin SDK with Project ID: "${projectIdFromEnv}" and Service Account Path: "${serviceAccountPath}"`);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      projectId: projectIdFromEnv, // Explicitly set Project ID
    });

    const adminApp = admin.app();

    if (adminApp.options.projectId) {
      console.log(`Firebase Admin SDK initialized successfully for Project ID: ${adminApp.options.projectId}`);
      try {
        dbAdminInstance = admin.firestore();
        storageAdminInstance = admin.storage();
        console.log('Firestore and Storage admin instances obtained.');

        // Diagnostic: Attempt to list collections
        if (dbAdminInstance) {
          console.log('Attempting diagnostic: dbAdminInstance.listCollections()');
          dbAdminInstance.listCollections()
            .then(collections => {
              console.log(`DIAGNOSTIC SUCCESS: listCollections() found ${collections.length} collections.`);
              if (collections.length === 0) {
                console.log("  It's normal to have 0 collections if the database is new or empty.");
              }
              collections.forEach(collection => {
                console.log(`  - Found Collection ID: ${collection.id}`);
              });
            })
            .catch(listError => {
              console.error('DIAGNOSTIC FAILURE: dbAdminInstance.listCollections() FAILED.');
              console.error('  Error Message:', listError.message);
              if (listError.code) console.error('  Error Code:', listError.code);
              if (listError.details) console.error('  Error Details:', listError.details);
              if (listError.code === 5 /* NOT_FOUND */) {
                console.error('  THIS "5 NOT_FOUND" ERROR ON listCollections() with Admin SDK OFTEN MEANS:');
                console.error('    1. The Cloud Firestore API is NOT ENABLED for your project in Google Cloud Console.');
                console.error('       - Go to Google Cloud Console > APIs & Services > Enabled APIs & services.');
                console.error('       - Search for "Cloud Firestore API" and ensure it is ENABLED.');
                console.error('    2. The Firestore database for this project either does NOT exist, or it is NOT in NATIVE mode (it might be in Datastore mode).');
                console.error('       - Verify in Firebase Console: Firestore Database > Ensure it is CREATED and explicitly states "Native Mode".');
              }
            });
        } else {
            console.error("CRITICAL: dbAdminInstance is null even after successful adminApp.options.projectId. This indicates a deeper SDK or environment issue.");
        }

      } catch (e: any) {
          console.error("Error obtaining Firestore/Storage admin instances AFTER successful SDK initialization:", e.message);
      }
    } else {
      // This case should ideally be caught by checks for projectIdFromEnv or serviceAccountPath earlier
      console.error('CRITICAL ERROR: Firebase Admin SDK initialized, but Project ID could not be determined.');
      console.error(`Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID ("${projectIdFromEnv}") is correct and GOOGLE_APPLICATION_CREDENTIALS ("${serviceAccountPath}") points to a valid service account key for this project.`);
    }
  } catch (error: any) {
    console.error('CRITICAL ERROR during Firebase Admin SDK initializeApp call:');
    console.error('Message:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    console.error('This usually indicates a problem with the service account key file (path, content, permissions) or the projectId.');
    console.error('Verify the GOOGLE_APPLICATION_CREDENTIALS path in your .env file and the content of the JSON key file.');
  }
} else {
  // This block is for when admin.apps.length > 0, meaning it's already initialized.
  const adminApp = admin.app();
  if (adminApp.options.projectId) {
      if (!dbAdminInstance) dbAdminInstance = admin.firestore();
      if (!storageAdminInstance) storageAdminInstance = admin.storage();
      // console.log('Firebase Admin SDK already initialized. Using existing instances.');
  } else {
      // This case should ideally be caught by initial checks as well
      console.warn('Firebase Admin SDK was already initialized, but no Project ID detected. Previous initialization likely failed to determine it.');
  }
}

export { admin, dbAdminInstance as dbAdmin, storageAdminInstance as storageAdmin };
