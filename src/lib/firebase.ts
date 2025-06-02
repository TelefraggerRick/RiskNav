
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]; // Use the already initialized app
}

// Recommendation from user tip: Initialize Firestore explicitly if settings might be involved,
// or simply use getFirestore(app) if no custom settings are ever needed.
// For robustness, explicitly initialize once.
try {
  db = getFirestore(app);
} catch (e) {
  // This catch block is to handle potential re-initialization issues if getFirestore was called before.
  // initializeFirestore is preferred for the first call if settings are involved.
  // Since we are not passing settings here, getFirestore(app) should be fine.
  // If issues persist, this area might need further investigation based on specific Firebase SDK version behaviors.
  console.warn("Firestore already initialized or error during initial getFirestore:", e);
  db = initializeFirestore(app, {}); // Fallback to initializeFirestore if getFirestore fails initially
}

storage = getStorage(app);

export { app, db, storage };
