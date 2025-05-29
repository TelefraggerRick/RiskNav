
import type { User, UserRole } from './types';

export const mockUsers: User[] = [
  { id: 'user-unauth', name: 'No User Selected', role: 'Unauthenticated' },
  { id: 'user-atlantic', name: 'Atlantic Operations', role: 'Atlantic Region Submitter' },
  { id: 'user-central', name: 'Central Operations', role: 'Central Region Submitter' },
  { id: 'user-western', name: 'Western Operations', role: 'Western Region Submitter' },
  { id: 'user-arctic', name: 'Arctic Operations', role: 'Arctic Region Submitter' }, // Changed name here
  { id: 'user-cso', name: 'CSO Officer', role: 'Crewing Standards and Oversight' },
  { id: 'user-sd', name: 'Senior Director (Approver)', role: 'Senior Director' },
  { id: 'user-dg', name: 'Director General (Approver)', role: 'Director General' },
  { id: 'user-generic-submitter', name: 'Generic Submitter', role: 'Generic Submitter' },
  { id: 'user-admin', name: 'System Administrator', role: 'Admin' },
];

export const findUserById = (id: string): User | undefined => mockUsers.find(u => u.id === id);
export const defaultUser = mockUsers[0]; // Unauthenticated
