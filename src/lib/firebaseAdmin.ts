
// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { config } from 'dotenv';

config(); // Load environment variables

if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error('Firebase Admin SDK Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set in the environment variables.');
      process.exit(1);
    }

    admin.initializeApp({
      credential: admin.credential.applicationDefault(), // Relies on GOOGLE_APPLICATION_CREDENTIALS
      projectId: projectId, // Explicitly set the project ID
      // databaseURL: `https://${projectId}.firebaseio.com` // Optional: If using Realtime Database
    });
    console.log(`Firebase Admin SDK initialized successfully for project: ${projectId}.`);
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    if (error.errorInfo) {
      console.error('Error Info:', error.errorInfo);
    }
    if (error.message.includes('Could not load the default credentials') || error.message.includes('ENOENT')) {
        console.error('Ensure your GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and points to a valid service account key JSON file.');
    }
    process.exit(1);
  }
}

const dbAdmin = admin.firestore();
const storageAdmin = admin.storage();

export { admin, dbAdmin, storageAdmin };
