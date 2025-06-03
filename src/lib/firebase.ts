
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'; // Added Messaging imports

if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) {
  console.error(
    "CRITICAL Firebase Config Error: NEXT_PUBLIC_FIREBASE_DATABASE_URL is not defined in your .env file or is empty. This is required for Realtime Database.",
    "Please ensure it is set in .env to your Firebase Realtime Database URL (e.g., https://your-project-id-default-rtdb.firebaseio.com or https://your-project-id-default-rtdb.region.firebasedatabase.app)."
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let authInstance: Auth; // Renamed to avoid conflict
let rtdb: Database;
let messagingInstance: Messaging | null = null; // For client-side messaging

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

db = getFirestore(app);
storage = getStorage(app);
authInstance = getAuth(app);
rtdb = getDatabase(app);

// Initialize Firebase Messaging if on the client side and supported
if (typeof window !== 'undefined' && 'Notification' in window) {
  try {
    messagingInstance = getMessaging(app);
    console.log("Firebase Messaging initialized");

    // Handle foreground messages
    onMessage(messagingInstance, (payload) => {
      console.log('Message received in foreground. ', payload);
      // Customize notification handling here
      // For example, show a custom UI notification or use the browser's Notification API
      if (payload.notification) {
        new Notification(payload.notification.title || "New Message", {
          body: payload.notification.body,
          icon: payload.notification.icon,
        });
      }
    });

  } catch (err) {
    console.error("Error initializing Firebase Messaging:", err);
    messagingInstance = null;
  }
}


export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messagingInstance) {
    console.log('Firebase Messaging is not initialized or not supported.');
    return null;
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
    console.error("VAPID key is not set in environment variables (NEXT_PUBLIC_FIREBASE_VAPID_KEY).");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const currentToken = await getToken(messagingInstance, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      if (currentToken) {
        console.log('FCM Token:', currentToken);
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while getting notification permission or token.', error);
    return null;
  }
};


export { app, db, storage, authInstance as auth, rtdb, messagingInstance as messaging }; // Export authInstance as auth
