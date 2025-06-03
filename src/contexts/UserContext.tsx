
"use client";

import type { AppUser, UserRole } from '@/lib/types';
import { auth, db, rtdb } from '@/lib/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

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
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser>(unauthenticatedAppUser);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Initialize to true
  const router = useRouter();
  const { getTranslation } = useLanguage();

  const T_USER_CONTEXT = {
    loginSuccessTitle: { en: "Login Successful", fr: "Connexion réussie" },
    loginSuccessDesc: { en: "Welcome back, {userName}!", fr: "Bon retour, {userName}!" },
    profileNotFoundWarn: { en: "User profile not found in Firestore for UID: {uid}. Logging out.", fr: "Profil utilisateur non trouvé dans Firestore pour UID : {uid}. Déconnexion."},
    rtdbUnavailableWarn: { en: "Realtime Database is not available. User presence features disabled.", fr: "La base de données en temps réel n'est pas disponible. Les fonctionnalités de présence utilisateur sont désactivées."}
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingAuth(true); // Explicitly set to true at the start of any auth state change
      if (user) {
        setFirebaseUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const appUser = { uid: user.uid, ...userDocSnap.data() } as AppUser;
              setCurrentUser(appUser);
              
              if (rtdb) {
                const userStatusDatabaseRef = ref(rtdb, `/status/${user.uid}`);
                const isOfflineForDatabase = { isOnline: false, lastChanged: rtdbServerTimestamp() };
                const isOnlineForDatabase = { isOnline: true, lastChanged: rtdbServerTimestamp() };
                
                const connectedRefUnsubscribe = onValue(ref(rtdb, '.info/connected'), (snapshot) => {
                  if (snapshot.val() === false) { return; }
                  const disconnectUnsubscribe = onDisconnect(userStatusDatabaseRef);
                  disconnectUnsubscribe.set(isOfflineForDatabase).then(() => {
                    set(userStatusDatabaseRef, isOnlineForDatabase);
                  }).catch(err => console.error("Error setting online status or onDisconnect:", err));
                  // It's important to manage unsubscribe for onDisconnect if component unmounts while user is connected
                  // However, onDisconnect handles its own "unsubscription" by executing when disconnect occurs.
                  // The onValue for '.info/connected' itself should be unsubscribed if the UserProvider unmounts,
                  // but since UserProvider is at the root, this is less critical.
                });
                // To prevent memory leaks, we should store and call unsubscribe for connectedRef if UserProvider could unmount
                // For simplicity here, assuming UserProvider lives as long as app.
              } else {
                console.warn(getTranslation(T_USER_CONTEXT.rtdbUnavailableWarn));
              }
              setIsLoadingAuth(false); // Auth process complete for this logged-in user
            } else {
              console.warn(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
              toast.error(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
              await signOut(auth); // This will re-trigger onAuthStateChanged with user = null
              // setIsLoadingAuth(false) will be handled by the 'else' block below when re-triggered
            }
        } catch (error) {
            console.error("Error fetching user profile from Firestore:", error);
            toast.error("Error loading user profile. Logging out.");
            await signOut(auth); // Re-triggers onAuthStateChanged
            // setIsLoadingAuth(false) will be handled by the 'else' block below
        }
      } else { 
        setFirebaseUser(null);
        setCurrentUser(unauthenticatedAppUser);
        if (rtdb && firebaseUser?.uid) { // If there was a previous firebaseUser, try to set them offline
            const userStatusDatabaseRef = ref(rtdb, `/status/${firebaseUser.uid}`);
            set(userStatusDatabaseRef, { isOnline: false, lastChanged: rtdbServerTimestamp() })
                .catch(err => console.warn("Error setting user offline on logout:", err));
        }
        setIsLoadingAuth(false); // Auth process complete for logged-out user
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTranslation]); // firebaseUser was re-added to deps by previous step, keep if needed for RTDB logic, but main auth flow should be fine without it for setCurrentUser/isLoadingAuth


  const login = useCallback(async (email: string, passwordAttempt: string): Promise<boolean> => {
    setIsLoadingAuth(true); 
    try {
      await signInWithEmailAndPassword(auth, email, passwordAttempt);
      // onAuthStateChanged will handle setting currentUser and isLoadingAuth to false
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoadingAuth(false); // Login failed, so auth loading is "complete" for this attempt
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoadingAuth(true); 
    const currentFirebaseUserUid = firebaseUser?.uid; // Capture UID before it's nulled

    if (currentFirebaseUserUid && rtdb) { 
      const userStatusDatabaseRef = ref(rtdb, `/status/${currentFirebaseUserUid}`);
      try {
        await set(userStatusDatabaseRef, {
          isOnline: false,
          lastChanged: rtdbServerTimestamp(),
        });
      } catch (error) {
        console.error("Error setting user offline in RTDB during logout:", error);
      }
    } else if (currentFirebaseUserUid && !rtdb) {
        console.warn(getTranslation(T_USER_CONTEXT.rtdbUnavailableWarn));
    }
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting isLoadingAuth to false and redirecting
      router.push('/login');
    } catch (error) {
       console.error("Error during sign out:", error);
       // Fallback if signOut itself fails or onAuthStateChanged doesn't fire as expected
       setFirebaseUser(null);
       setCurrentUser(unauthenticatedAppUser);
       setIsLoadingAuth(false);
       router.push('/login');
    }
  }, [router, firebaseUser, getTranslation, T_USER_CONTEXT.rtdbUnavailableWarn]); 
  
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
    
