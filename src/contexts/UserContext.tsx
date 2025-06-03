
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
      if (user) {
        setIsLoadingAuth(true); 
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
                onValue(ref(rtdb, '.info/connected'), (snapshot) => {
                  if (snapshot.val() === false) { return; }
                  onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
                    set(userStatusDatabaseRef, isOnlineForDatabase);
                  });
                });
              } else {
                console.warn(getTranslation(T_USER_CONTEXT.rtdbUnavailableWarn));
              }
              setIsLoadingAuth(false); 
            } else {
              console.warn(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
              toast.error(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
              await signOut(auth);
              return; 
            }
        } catch (error) {
            console.error("Error fetching user profile from Firestore:", error);
            toast.error("Error loading user profile. Logging out.");
            await signOut(auth); 
            return; 
        }
      } else { 
        setFirebaseUser(null);
        setCurrentUser(unauthenticatedAppUser);
        setIsLoadingAuth(false); 
      }
    });

    return () => unsubscribe();
  }, [getTranslation, T_USER_CONTEXT.profileNotFoundWarn, T_USER_CONTEXT.rtdbUnavailableWarn]);


  const login = useCallback(async (email: string, passwordAttempt: string): Promise<boolean> => {
    setIsLoadingAuth(true); 
    try {
      await signInWithEmailAndPassword(auth, email, passwordAttempt);
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      setIsLoadingAuth(false); 
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoadingAuth(true); 
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
        console.warn(getTranslation(T_USER_CONTEXT.rtdbUnavailableWarn));
    }
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
       console.error("Error during sign out:", error);
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
    
