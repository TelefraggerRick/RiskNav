
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';

const dbURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
let isRtdbConfigValid = true;

if (!dbURL || typeof dbURL !== 'string' || dbURL.trim() === '' || !dbURL.startsWith('https://')) {
  isRtdbConfigValid = false;
  // The verbose console.error block that was here has been removed.
  // The invalid URL will be handled by setting firebaseConfig.databaseURL to undefined,
  // and a console.warn will be issued later if RTDB initialization is skipped.
}


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: isRtdbConfigValid ? dbURL : undefined,
};

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let authInstance: Auth; // Renamed to avoid conflict
let rtdb: Database | null = null; // Initialize as null

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

db = getFirestore(app);
storage = getStorage(app);
authInstance = getAuth(app);

if (isRtdbConfigValid && firebaseConfig.databaseURL) {
  try {
    rtdb = getDatabase(app);
    console.log("Firebase Realtime Database initialized successfully.");
  } catch (e: any) {
    console.error("Error initializing Firebase Realtime Database even after URL validation. This is unexpected.", e);
    isRtdbConfigValid = false; 
    rtdb = null;
     console.warn( // Changed to warn to be less intrusive if Next.js picks it up
      "Firebase Realtime Database URL is invalid or missing. RTDB features will be disabled. Please check NEXT_PUBLIC_FIREBASE_DATABASE_URL in your .env file and restart your server."
    );
  }
} else {
   console.warn(`Firebase Realtime Database URL is invalid or missing (Value: "${dbURL}"). RTDB features will be disabled. Please check NEXT_PUBLIC_FIREBASE_DATABASE_URL in your .env file and restart your server.`);
}

export { app, db, storage, authInstance as auth, rtdb };
    
