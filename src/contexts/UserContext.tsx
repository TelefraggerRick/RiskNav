
"use client";

import type { User } from '@/lib/types';
import { mockUsers, defaultUser, findUserById } from '@/lib/mockUsers';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface UserContextType {
  currentUser: User;
  availableUsers: User[];
  switchUser: (userId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);

  const switchUser = useCallback((userId: string) => {
    const newUser = findUserById(userId);
    if (newUser) {
      setCurrentUser(newUser);
    } else {
      console.warn(`User with id ${userId} not found. Reverting to default user.`);
      setCurrentUser(defaultUser);
    }
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, availableUsers: mockUsers, switchUser }}>
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
