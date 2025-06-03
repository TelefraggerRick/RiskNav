
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
  currentUser: AppUser; // Changed: currentUser will no longer be null after initial load
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
  const [currentUser, setCurrentUser] = useState<AppUser>(unauthenticatedAppUser); // Initialize with unauthenticatedAppUser
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();
  const { getTranslation } = useLanguage();

  const T_USER_CONTEXT = {
    loginSuccessTitle: { en: "Login Successful", fr: "Connexion réussie" },
    loginSuccessDesc: { en: "Welcome back, {userName}!", fr: "Bon retour, {userName}!" },
    profileNotFoundWarn: { en: "User profile not found in Firestore for UID: {uid}. Logging out.", fr: "Profil utilisateur non trouvé dans Firestore pour UID : {uid}. Déconnexion."}
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingAuth(true); // Set loading true at the start of auth state change
      if (user) {
        setFirebaseUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUser({ uid: user.uid, ...userDocSnap.data() } as AppUser);
        } else {
          console.warn(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
          toast.error(getTranslation(T_USER_CONTEXT.profileNotFoundWarn).replace('{uid}', user.uid));
          await signOut(auth); // Sign out if profile is missing
          setFirebaseUser(null);
          setCurrentUser(unauthenticatedAppUser); // Revert to unauthenticated
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
        setCurrentUser(unauthenticatedAppUser); // Set to unauthenticatedAppUser if no Firebase user
      }
      setIsLoadingAuth(false); // Set loading false after processing
    });

    return () => unsubscribe();
  }, [getTranslation]); // Removed T_USER_CONTEXT dependency as it's stable within this scope

  const login = useCallback(async (email: string, passwordAttempt: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, passwordAttempt);
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
      // onAuthStateChanged will handle setting firebaseUser to null and currentUser to unauthenticatedAppUser
      router.push('/login');
    } catch (error) {
       console.error("Error during sign out:", error);
       // Even if sign out fails, reset local state for safety
       setFirebaseUser(null);
       setCurrentUser(unauthenticatedAppUser);
       router.push('/login');
    }
  }, [router, firebaseUser]);
  
  // Show full-page loader only during the absolute initial auth check
  if (isLoadingAuth && currentUser.uid === 'user-unauth' && !firebaseUser) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading authentication...</div>;
  }

  return (
    <UserContext.Provider value={{ 
        currentUser, // currentUser is now guaranteed to be an AppUser object
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
