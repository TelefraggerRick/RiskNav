
"use client";

import type { AppUser, UserRole } from '@/lib/types';
import { auth, db, rtdb } from '@/lib/firebase'; // Import db and rtdb for Firestore and Realtime Database
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from "next/navigation";

interface UserContextType {
  currentUser: AppUser | null; // This will be our app-specific user profile from Firestore
  firebaseUser: FirebaseAuthUser | null; // Raw Firebase Auth user
  isLoadingAuth: boolean;
  login: (email: string, passwordAttempt: string) => Promise<boolean>;
  logout: () => Promise<void>;
  // availableUsers and switchUser are removed as they are for mock users
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Default unauthenticated user representation for AppUser
const unauthenticatedAppUser: AppUser = {
  uid: 'user-unauth',
  name: 'No User Selected',
  email: '',
  role: 'Unauthenticated',
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoadingAuth(true);
      if (user) {
        setFirebaseUser(user);
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUser({ uid: user.uid, ...userDocSnap.data() } as AppUser);
        } else {
          // Handle case where user exists in Auth but not Firestore (e.g., new registration if implemented)
          // For now, we assume profiles are pre-created or logout
          console.warn(`User profile not found in Firestore for UID: ${user.uid}. Logging out.`);
          await signOut(auth);
          setCurrentUser(null); // Or set to a default unauthenticated profile
        }

        // Setup RTDB presence
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
            return; // Not connected to RTDB, skip presence logic
          }
          onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
            set(userStatusDatabaseRef, isOnlineForDatabase);
          });
        });

      } else {
        setFirebaseUser(null);
        setCurrentUser(null); // No Firebase user, so no app user profile
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, passwordAttempt: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, passwordAttempt);
      // onAuthStateChanged will handle setting currentUser and firebaseUser
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (firebaseUser) {
      // Set offline status before signing out
      const userStatusDatabaseRef = ref(rtdb, `/status/${firebaseUser.uid}`);
      await set(userStatusDatabaseRef, {
        isOnline: false,
        lastChanged: rtdbServerTimestamp(),
      });
    }
    await signOut(auth);
    setCurrentUser(null);
    setFirebaseUser(null);
    router.push('/login');
  }, [router, firebaseUser]);
  
  // Display a loading indicator or splash screen while auth state is being determined
  if (isLoadingAuth && currentUser === null) {
     // Avoid rendering children if still loading and no user set,
     // This helps prevent flashes of content meant for authenticated/unauthenticated states
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading authentication...</div>;
  }


  return (
    <UserContext.Provider value={{ 
        currentUser: currentUser || unauthenticatedAppUser, // Provide a non-null currentUser for easier consumption
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
