
"use client";

import type { User } from '@/lib/types';
import { mockUsers, defaultUser, findUserById } from '@/lib/mockUsers';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Added for redirection

const MOCK_PASSWORD = "coastguard2025";

interface UserContextType {
  currentUser: User;
  availableUsers: User[];
  switchUser: (userId: string) => void;
  login: (userId: string, passwordAttempt: string) => Promise<boolean>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const router = useRouter();

  const switchUser = useCallback((userId: string) => {
    const newUser = findUserById(userId);
    if (newUser) {
      setCurrentUser(newUser);
    } else {
      console.warn(`User with id ${userId} not found. Reverting to default user.`);
      setCurrentUser(defaultUser);
    }
  }, []);

  const login = useCallback(async (userId: string, passwordAttempt: string): Promise<boolean> => {
    const userToLogin = findUserById(userId);
    if (userToLogin && userToLogin.id !== 'user-unauth' && passwordAttempt === MOCK_PASSWORD) {
      setCurrentUser(userToLogin);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(defaultUser); // Revert to unauthenticated user
    router.push('/login'); // Redirect to login page after logout
  }, [router]);

  return (
    <UserContext.Provider value={{ currentUser, availableUsers: mockUsers, switchUser, login, logout }}>
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
