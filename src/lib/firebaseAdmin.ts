// src/lib/firebaseAdmin.ts
import admin from 'firebase-admin';
import { config } from 'dotenv';

config(); // Load environment variables

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com` // Optional: If using Realtime Database
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // Optionally, you can provide more details if available:
    if (error.errorInfo) {
      console.error('Error Info:', error.errorInfo);
    }
    // If GOOGLE_APPLICATION_CREDENTIALS is not set or file is missing, this is a common error.
    if (error.message.includes('Could not load the default credentials') || error.message.includes('ENOENT')) {
        console.error('Ensure your GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly and points to a valid service account key JSON file.');
    }
    process.exit(1); // Exit if admin SDK cannot be initialized, as scripts would fail.
  }
}

const dbAdmin = admin.firestore();
const storageAdmin = admin.storage(); // If you need admin access to storage

export { admin, dbAdmin, storageAdmin };
