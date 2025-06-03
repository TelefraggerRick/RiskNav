
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
    notificationPermissionError: { en: "Could not enable notifications.", fr: "Impossible d'activer les notifications."}
  };

  const setupNotifications = useCallback(async (userId: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      try {
        const token = await requestNotificationPermission();
        if (token && userId) {
          await updateUserFCMToken(userId, token);
          toast.success(getTranslation(T_USER_CONTEXT.notificationPermissionSuccess));
        } else if (Notification.permission === 'denied') {
          console.warn("Notification permission was denied by the user.");
        }
      } catch (error) {
        console.error("Error setting up notifications:", error);
        toast.error(getTranslation(T_USER_CONTEXT.notificationPermissionError));
      }
    }
  }, [getTranslation]); // T_USER_CONTEXT is stable

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingAuth(true);
      if (user) {
        setFirebaseUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const appUser = { uid: user.uid, ...userDocSnap.data() } as AppUser;
          setCurrentUser(appUser);
          await setupNotifications(user.uid); // Setup notifications after user is confirmed
        } else {
          console.warn(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
          toast.error(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
          await signOut(auth);
          setFirebaseUser(null);
          setCurrentUser(unauthenticatedAppUser);
        }

        const userStatusDatabaseRef = ref(rtdb, `/status/${user.uid}`);
        const isOfflineForDatabase = {
          isOnline: false,
          lastChanged: rtdbServerTimestamp(),
        };
        const isOnlineForDatabase = {
          isOnline: true,
          lastChanged: rtdbServerTimestamp(),
        };

        onValue(ref(rtdb, '.info/connected'), (snapshot) => {
          if (snapshot.val() === false) {
            return;
          }
          onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
            set(userStatusDatabaseRef, isOnlineForDatabase);
          });
        });

      } else {
        setFirebaseUser(null);
        setCurrentUser(unauthenticatedAppUser);
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [getTranslation, setupNotifications]); // Added setupNotifications

  const login = useCallback(async (email: string, passwordAttempt: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, passwordAttempt);
      // onAuthStateChanged will handle setting user state and calling setupNotifications
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (firebaseUser) {
      const userStatusDatabaseRef = ref(rtdb, `/status/${firebaseUser.uid}`);
      try {
        await set(userStatusDatabaseRef, {
          isOnline: false,
          lastChanged: rtdbServerTimestamp(),
        });
      } catch (error) {
        console.error("Error setting user offline in RTDB:", error);
      }
    }
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
       console.error("Error during sign out:", error);
       setFirebaseUser(null);
       setCurrentUser(unauthenticatedAppUser);
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
