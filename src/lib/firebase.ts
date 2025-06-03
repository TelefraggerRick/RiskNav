
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'; // Added Messaging imports

const dbURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
let isRtdbConfigValid = true;

if (!dbURL || typeof dbURL !== 'string' || dbURL.trim() === '' || !dbURL.startsWith('https://')) {
  isRtdbConfigValid = false;
  console.error(
    "-------------------------------------------------------------------------------------------"
  );
  console.error(
    "CRITICAL Firebase Realtime Database Configuration Error:"
  );
  console.error(
    "NEXT_PUBLIC_FIREBASE_DATABASE_URL is invalid or missing in your environment variables."
  );
  console.error(
    "  - Expected format: https://<YOUR_PROJECT_ID>-default-rtdb.<REGION>.firebasedatabase.app"
  );
  console.error(
    "                     or https://<YOUR_PROJECT_ID>.firebaseio.com"
  );
  console.error(
    "  - Value received for NEXT_PUBLIC_FIREBASE_DATABASE_URL: ", `"${dbURL}"`
  );
  console.error(
    "  - Please ensure this variable is correctly set in your .env file and you have RESTARTED your development server."
  );
  console.error(
    "  - Realtime Database features (like user presence indicators) will be DISABLED until this is fixed."
  );
  console.error(
    "-------------------------------------------------------------------------------------------"
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
  databaseURL: isRtdbConfigValid ? dbURL : undefined, // Pass undefined if invalid to avoid Firebase SDK error here, rtdb init will be skipped
};

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let authInstance: Auth; // Renamed to avoid conflict
let rtdb: Database | null = null; // Initialize as null
let messagingInstance: Messaging | null = null; // For client-side messaging

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

db = getFirestore(app);
storage = getStorage(app);
authInstance = getAuth(app);

if (isRtdbConfigValid && firebaseConfig.databaseURL) { // Only initialize if URL was valid and passed to config
  try {
    rtdb = getDatabase(app);
    console.log("Firebase Realtime Database initialized successfully.");
  } catch (e: any) {
    console.error("Error initializing Firebase Realtime Database even after URL validation. This is unexpected.", e);
    // This catch might not be hit if firebaseConfig.databaseURL itself causes initializeApp to have issues with RTDB part.
    // The primary defense is skipping getDatabase if dbURL was initially bad.
    isRtdbConfigValid = false; // Ensure downstream knows it failed
    rtdb = null;
     console.error(
      "  - Realtime Database features (like user presence indicators) will be DISABLED due to this secondary init failure."
    );
  }
} else {
   console.warn("Firebase Realtime Database URL is invalid or missing. RTDB features will be disabled.");
}


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
    