
"use client";

import type { AppUser, UserRole } from '@/lib/types';
import { auth, db, rtdb, requestNotificationPermission } from '@/lib/firebase'; // Added requestNotificationPermission
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { updateUserFCMToken } from '@/lib/firestoreService'; // Added

interface UserContextType {
  currentUser: AppUser;
  firebaseUser: FirebaseAuthUser | null;
  isLoadingAuth: boolean;
  login: (email: string, passwordAttempt: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const unauthenticatedAppUser: AppUser = {
  uid: 'user-unauth',
  name: 'No User Selected',
  email: '',
  role: 'Unauthenticated',
  fcmTokens: []
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser>(unauthenticatedAppUser);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();
  const { getTranslation } = useLanguage();

  const T_USER_CONTEXT = {
    loginSuccessTitle: { en: "Login Successful", fr: "Connexion réussie" },
    loginSuccessDesc: { en: "Welcome back, {userName}!", fr: "Bon retour, {userName}!" },
    profileNotFoundWarn: { en: "User profile not found in Firestore for UID: {uid}. Logging out.", fr: "Profil utilisateur non trouvé dans Firestore pour UID : {uid}. Déconnexion."},
    notificationPermissionSuccess: { en: "Notification permissions enabled.", fr: "Permissions de notification activées."},
    notificationPermissionError: { en: "Could not enable notifications.", fr: "Impossible d'activer les notifications."},
    rtdbUnavailableWarn: { en: "Realtime Database is not available. User presence features disabled.", fr: "La base de données en temps réel n'est pas disponible. Les fonctionnalités de présence utilisateur sont désactivées."}
  };

  const setupNotifications = useCallback(async (userId: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      try {
        const token = await requestNotificationPermission();
        if (token && userId) {
          await updateUserFCMToken(userId, token);
          // Toast for success can be verbose, consider removing or making it conditional
          // toast.success(getTranslation(T_USER_CONTEXT.notificationPermissionSuccess));
          console.log("Notification permission granted and token stored.");
        } else if (Notification.permission === 'denied') {
          console.warn("Notification permission was denied by the user.");
        }
      } catch (error) {
        console.error("Error setting up notifications:", error);
        toast.error(getTranslation(T_USER_CONTEXT.notificationPermissionError));
      }
    }
  }, [getTranslation, T_USER_CONTEXT.notificationPermissionError]); // Removed success toast to reduce noise

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoadingAuth(true); // Start loading when Firebase user object is available
        setFirebaseUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const appUser = { uid: user.uid, ...userDocSnap.data() } as AppUser;
              setCurrentUser(appUser);
              await setupNotifications(user.uid); // Await this critical step
              
              // RTDB logic for online presence (run non-blockingly after core auth is settled)
              if (rtdb) {
                const userStatusDatabaseRef = ref(rtdb, `/status/${user.uid}`);
                const isOfflineForDatabase = { isOnline: false, lastChanged: rtdbServerTimestamp() };
                const isOnlineForDatabase = { isOnline: true, lastChanged: rtdbServerTimestamp() };
                onValue(ref(rtdb, '.info/connected'), (snapshot) => {
                  if (snapshot.val() === false) { return; }
                  onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
                    set(userStatusDatabaseRef, isOnlineForDatabase);
                  });
                });
              } else {
                console.warn(getTranslation(T_USER_CONTEXT.rtdbUnavailableWarn));
              }
            } else {
              console.warn(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
              toast.error(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
              await signOut(auth); // This will re-trigger onAuthStateChanged with user=null
              // isLoadingAuth will be set to false in the subsequent call to this listener
              return; 
            }
        } catch (error) {
            console.error("Error fetching user profile from Firestore:", error);
            toast.error("Error loading user profile. Logging out.");
            await signOut(auth); // Re-trigger onAuthStateChanged with user=null
            // isLoadingAuth will be set to false in the subsequent call to this listener
            return; 
        } finally {
            // Only set isLoadingAuth to false here if we haven't early-returned (which means signOut was called)
            // The signOut will trigger a new onAuthStateChanged event that will set isLoadingAuth=false correctly.
            // So, if we are still in this execution path, it means user was found.
            const stillAuthenticated = auth.currentUser; // Check if user is still auth'd (didn't get signed out above)
            if (stillAuthenticated && stillAuthenticated.uid === user.uid) {
                 setIsLoadingAuth(false);
            }
            // If signOut was called, the *next* run of onAuthStateChanged will handle setting isLoadingAuth to false.
        }
      } else { // User is null (logged out or never logged in)
        setFirebaseUser(null);
        setCurrentUser(unauthenticatedAppUser);
        setIsLoadingAuth(false); 
      }
    });

    return () => unsubscribe();
  }, [getTranslation, setupNotifications, T_USER_CONTEXT.profileNotFoundWarn, T_USER_CONTEXT.rtdbUnavailableWarn]);


  const login = useCallback(async (email: string, passwordAttempt: string): Promise<boolean> => {
    setIsLoadingAuth(true); // Set loading true immediately on login attempt
    try {
      await signInWithEmailAndPassword(auth, email, passwordAttempt);
      // onAuthStateChanged will handle setting currentUser and isLoadingAuth to false after profile fetch
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoadingAuth(false); // Ensure loading is false on login failure
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoadingAuth(true); // Indicate state change is happening
    if (firebaseUser && rtdb) { 
      const userStatusDatabaseRef = ref(rtdb, `/status/${firebaseUser.uid}`);
      try {
        await set(userStatusDatabaseRef, {
          isOnline: false,
          lastChanged: rtdbServerTimestamp(),
        });
      } catch (error) {
        console.error("Error setting user offline in RTDB:", error);
      }
    } else if (firebaseUser && !rtdb) {
        console.warn("RTDB not available, cannot set user offline status during logout.");
    }
    try {
      await signOut(auth);
      // onAuthStateChanged will set currentUser, firebaseUser, and isLoadingAuth to false
      router.push('/login');
    } catch (error) {
       console.error("Error during sign out:", error);
       setFirebaseUser(null);
       setCurrentUser(unauthenticatedAppUser);
       setIsLoadingAuth(false); // Ensure loading is false even if signOut has an issue
       router.push('/login');
    }
  }, [router, firebaseUser]);
  
  if (isLoadingAuth && currentUser.uid === 'user-unauth' && !firebaseUser) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading authentication...</div>;
  }

  return (
    <UserContext.Provider value={{ 
        currentUser, 
        firebaseUser, 
        isLoadingAuth, 
        login, 
        logout 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
    
