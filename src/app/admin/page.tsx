
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AppUser, UserRole } from '@/lib/types';
import { assignableUserRoles } from '@/lib/types';
import { getAllUsersFromDB, updateUserRoleInDB } from '@/lib/firestoreService';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, UserCog, Users, ShieldAlert, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const T_ADMIN_PAGE = {
  pageTitle: { en: "Admin - User Management", fr: "Admin - Gestion des utilisateurs" },
  pageDescription: { en: "View and manage user roles within the application.", fr: "Visualisez et gérez les rôles des utilisateurs au sein de l'application." },
  loadingUsers: { en: "Loading users...", fr: "Chargement des utilisateurs..." },
  accessDeniedTitle: { en: "Access Denied", fr: "Accès refusé" },
  accessDeniedDesc: { en: "You do not have permission to view this page.", fr: "Vous n'avez pas la permission de visualiser cette page." },
  redirectToDashboard: { en: "Redirecting to dashboard...", fr: "Redirection vers le tableau de bord..." },
  errorFetchingUsers: { en: "Error Fetching Users", fr: "Erreur lors du chargement des utilisateurs" },
  failedToLoadUsers: { en: "Could not load user data. Please try again later.", fr: "Impossible de charger les données utilisateur. Veuillez réessayer plus tard." },
  noUsersFound: { en: "No Users Found", fr: "Aucun utilisateur trouvé" },
  noUsersInSystem: { en: "There are no users in the system yet.", fr: "Il n'y a pas encore d'utilisateurs dans le système." },
  nameHeader: { en: "Name", fr: "Nom" },
  emailHeader: { en: "Email", fr: "Courriel" },
  currentRoleHeader: { en: "Current Role", fr: "Rôle actuel" },
  newRoleHeader: { en: "Assign New Role", fr: "Attribuer un nouveau rôle" },
  actionsHeader: { en: "Actions", fr: "Actions" },
  selectRolePlaceholder: { en: "Select role...", fr: "Sélectionner un rôle..." },
  saveRoleButton: { en: "Save Role", fr: "Enregistrer le rôle" },
  savingButton: { en: "Saving...", fr: "Enregistrement..." },
  roleUpdateSuccessTitle: { en: "Role Updated", fr: "Rôle mis à jour" },
  roleUpdateSuccessDesc: { en: "Role for {userName} has been updated to {newRole}.", fr: "Le rôle pour {userName} a été mis à jour vers {newRole}." },
  roleUpdateErrorTitle: { en: "Update Failed", fr: "Échec de la mise à jour" },
  roleUpdateErrorDesc: { en: "Could not update role for {userName}. Please try again.", fr: "Impossible de mettre à jour le rôle pour {userName}. Veuillez réessayer." },
  cannotChangeOwnRole: { en: "Cannot change own role", fr: "Impossible de modifier son propre rôle" },
  cannotChangeOwnRoleDesc: { en: "Administrators cannot change their own role via this interface.", fr: "Les administrateurs ne peuvent pas modifier leur propre rôle via cette interface."}
};

export default function AdminPage() {
  const { currentUser, isLoadingAuth } = useUser();
  const { getTranslation } = useLanguage();
  const router = useRouter();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});
  const [isUpdatingRole, setIsUpdatingRole] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    setIsLoadingPage(true);
    setError(null);
    try {
      const fetchedUsers = await getAllUsersFromDB();
      setUsers(fetchedUsers);
      // Initialize selectedRoles with current roles
      const initialSelectedRoles: Record<string, UserRole> = {};
      fetchedUsers.forEach(user => {
        initialSelectedRoles[user.uid] = user.role;
      });
      setSelectedRoles(initialSelectedRoles);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(getTranslation(T_ADMIN_PAGE.failedToLoadUsers));
      toast.error(getTranslation(T_ADMIN_PAGE.errorFetchingUsers), {
        description: getTranslation(T_ADMIN_PAGE.failedToLoadUsers),
      });
    } finally {
      setIsLoadingPage(false);
    }
  }, [getTranslation]);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!currentUser || currentUser.role !== 'Admin') {
      toast.error(getTranslation(T_ADMIN_PAGE.accessDeniedTitle), {
        description: getTranslation(T_ADMIN_PAGE.accessDeniedDesc) + " " + getTranslation(T_ADMIN_PAGE.redirectToDashboard),
      });
      router.replace('/');
      return;
    }
    fetchUsers();
  }, [currentUser, isLoadingAuth, router, fetchUsers, getTranslation]);

  const handleRoleSelectionChange = (userId: string, newRole: UserRole) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: newRole }));
  };

  const handleSaveRole = async (userId: string) => {
    if (currentUser && userId === currentUser.uid) {
        toast.error(getTranslation(T_ADMIN_PAGE.cannotChangeOwnRole), {
            description: getTranslation(T_ADMIN_PAGE.cannotChangeOwnRoleDesc)
        });
        return;
    }

    const newRole = selectedRoles[userId];
    if (!newRole || newRole === users.find(u => u.uid === userId)?.role) {
      // No change or no role selected
      return;
    }

    setIsUpdatingRole(prev => ({ ...prev, [userId]: true }));
    const userToUpdate = users.find(u => u.uid === userId);

    try {
      await updateUserRoleInDB(userId, newRole);
      toast.success(getTranslation(T_ADMIN_PAGE.roleUpdateSuccessTitle), {
        description: getTranslation(T_ADMIN_PAGE.roleUpdateSuccessDesc)
          .replace('{userName}', userToUpdate?.name || 'User')
          .replace('{newRole}', newRole),
      });
      // Re-fetch users to reflect changes or update local state
      setUsers(prevUsers => prevUsers.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error(`Error updating role for user ${userId}:`, err);
      toast.error(getTranslation(T_ADMIN_PAGE.roleUpdateErrorTitle), {
        description: getTranslation(T_ADMIN_PAGE.roleUpdateErrorDesc)
          .replace('{userName}', userToUpdate?.name || 'User'),
      });
      // Revert selected role in UI on error
      setSelectedRoles(prev => ({...prev, [userId]: users.find(u => u.uid === userId)?.role || 'Submitter' }));
    } finally {
      setIsUpdatingRole(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (isLoadingAuth || (currentUser && currentUser.role === 'Admin' && isLoadingPage)) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-xl text-muted-foreground">{getTranslation(T_ADMIN_PAGE.loadingUsers)}</p>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'Admin') {
    // This case should be handled by useEffect redirect, but as a fallback:
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{getTranslation(T_ADMIN_PAGE.accessDeniedTitle)}</AlertTitle>
          <AlertDescription>{getTranslation(T_ADMIN_PAGE.accessDeniedDesc)}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{getTranslation(T_ADMIN_PAGE.errorFetchingUsers)}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-2xl flex items-center gap-2">
            <UserCog className="h-7 w-7 text-primary" />
            {getTranslation(T_ADMIN_PAGE.pageTitle)}
          </CardTitle>
          <CardDescription>{getTranslation(T_ADMIN_PAGE.pageDescription)}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {users.length === 0 ? (
            <Alert variant="default" className="border-dashed">
              <Users className="h-4 w-4" />
              <AlertTitle>{getTranslation(T_ADMIN_PAGE.noUsersFound)}</AlertTitle>
              <AlertDescription>{getTranslation(T_ADMIN_PAGE.noUsersInSystem)}</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{getTranslation(T_ADMIN_PAGE.nameHeader)}</TableHead>
                  <TableHead>{getTranslation(T_ADMIN_PAGE.emailHeader)}</TableHead>
                  <TableHead>{getTranslation(T_ADMIN_PAGE.currentRoleHeader)}</TableHead>
                  <TableHead>{getTranslation(T_ADMIN_PAGE.newRoleHeader)}</TableHead>
                  <TableHead className="text-right">{getTranslation(T_ADMIN_PAGE.actionsHeader)}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <Select
                        value={selectedRoles[user.uid] || user.role}
                        onValueChange={(newRole) => handleRoleSelectionChange(user.uid, newRole as UserRole)}
                        disabled={isUpdatingRole[user.uid] || (currentUser?.uid === user.uid)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder={getTranslation(T_ADMIN_PAGE.selectRolePlaceholder)} />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableUserRoles.map(role => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSaveRole(user.uid)}
                        disabled={isUpdatingRole[user.uid] || selectedRoles[user.uid] === user.role || (currentUser?.uid === user.uid)}
                      >
                        {isUpdatingRole[user.uid] ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {getTranslation(T_ADMIN_PAGE.savingButton)}
                          </>
                        ) : (
                          <>
                           <Save className="mr-2 h-4 w-4" />
                           {getTranslation(T_ADMIN_PAGE.saveRoleButton)}
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
