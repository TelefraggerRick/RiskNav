
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
import { Loader2, UserCog, Users, ShieldAlert, Save, PlusCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from '@/components/ui/input';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createNewUserAction, type CreateUserResult } from './actions';

const T_ADMIN_PAGE = {
  pageTitle: { en: "Admin - User Management", fr: "Admin - Gestion des utilisateurs" },
  pageDescription: { en: "View, manage user roles, and create new users.", fr: "Visualisez, gérez les rôles des utilisateurs et créez de nouveaux utilisateurs." },
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
  cannotChangeOwnRoleDesc: { en: "Administrators cannot change their own role via this interface.", fr: "Les administrateurs ne peuvent pas modifier leur propre rôle via cette interface."},
  createNewUserButton: { en: "Create New User", fr: "Créer un nouvel utilisateur" },
  createUserDialogTitle: { en: "Create New User Account", fr: "Créer un nouveau compte utilisateur" },
  createUserDialogDesc: { en: "Enter the details for the new user. An email and initial password will be set.", fr: "Entrez les détails du nouvel utilisateur. Un courriel et un mot de passe initial seront définis." },
  nameLabel: { en: "Full Name", fr: "Nom complet" },
  namePlaceholder: { en: "e.g., Jane Doe", fr: "ex : Jeanne Dupont" },
  emailLabel: { en: "Email Address", fr: "Adresse courriel" },
  emailPlaceholder: { en: "user@example.com", fr: "utilisateur@exemple.com" },
  passwordLabel: { en: "Password", fr: "Mot de passe" },
  passwordPlaceholder: { en: "Min. 6 characters", fr: "Min. 6 caractères" },
  confirmPasswordLabel: { en: "Confirm Password", fr: "Confirmer le mot de passe" },
  roleLabel: { en: "Role", fr: "Rôle" },
  createUserButton: { en: "Create User", fr: "Créer l'utilisateur" },
  creatingUserButton: { en: "Creating...", fr: "Création en cours..." },
  userCreateSuccessTitle: { en: "User Created", fr: "Utilisateur créé" },
  userCreateSuccessDesc: { en: "User {userName} ({userEmail}) has been created with role {userRole}.", fr: "L'utilisateur {userName} ({userEmail}) a été créé avec le rôle {userRole}." },
  userCreateErrorTitle: { en: "Creation Failed", fr: "Échec de la création" },
  cancelButton: { en: "Cancel", fr: "Annuler" },
};

// Ensure assignableUserRoles is compatible with z.enum
// It expects a non-empty array of string literals.
const roleEnumValues = assignableUserRoles as [string, ...string[]];

const createUserFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm your password." }),
  role: z.enum(roleEnumValues, { errorMap: () => ({ message: "Please select a valid role."}) })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

export default function AdminPage() {
  const { currentUser, isLoadingAuth } = useUser();
  const { getTranslation } = useLanguage();
  const router = useRouter();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});
  const [isUpdatingRole, setIsUpdatingRole] = useState<Record<string, boolean>>({});
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const createUserForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", role: "Submitter" },
  });

  const fetchUsers = useCallback(async () => {
    setIsLoadingPage(true);
    setError(null);
    try {
      const fetchedUsers = await getAllUsersFromDB();
      setUsers(fetchedUsers);
      const initialSelectedRoles: Record<string, UserRole> = {};
      fetchedUsers.forEach(user => { initialSelectedRoles[user.uid] = user.role; });
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
        toast.error(getTranslation(T_ADMIN_PAGE.cannotChangeOwnRole), { description: getTranslation(T_ADMIN_PAGE.cannotChangeOwnRoleDesc) });
        return;
    }
    const newRole = selectedRoles[userId];
    const userToUpdate = users.find(u => u.uid === userId);
    if (!newRole || !userToUpdate || newRole === userToUpdate.role) return;

    setIsUpdatingRole(prev => ({ ...prev, [userId]: true }));
    try {
      await updateUserRoleInDB(userId, newRole);
      toast.success(getTranslation(T_ADMIN_PAGE.roleUpdateSuccessTitle), {
        description: getTranslation(T_ADMIN_PAGE.roleUpdateSuccessDesc).replace('{userName}', userToUpdate.name || 'User').replace('{newRole}', newRole),
      });
      setUsers(prevUsers => prevUsers.map(u => u.uid === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error(`Error updating role for user ${userId}:`, err);
      toast.error(getTranslation(T_ADMIN_PAGE.roleUpdateErrorTitle), {
        description: getTranslation(T_ADMIN_PAGE.roleUpdateErrorDesc).replace('{userName}', userToUpdate.name || 'User'),
      });
      setSelectedRoles(prev => ({...prev, [userId]: userToUpdate.role }));
    } finally {
      setIsUpdatingRole(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleCreateUserSubmit = async (values: CreateUserFormValues) => {
    setIsCreatingUser(true);
    const result: CreateUserResult = await createNewUserAction(values);
    if (result.success && result.userId) {
      toast.success(getTranslation(T_ADMIN_PAGE.userCreateSuccessTitle), {
        description: getTranslation(T_ADMIN_PAGE.userCreateSuccessDesc)
          .replace('{userName}', values.name)
          .replace('{userEmail}', values.email)
          .replace('{userRole}', values.role),
      });
      // Add new user to local state or re-fetch all users
      // For simplicity, re-fetching:
      await fetchUsers();
      setIsCreateUserDialogOpen(false);
      createUserForm.reset();
    } else {
      toast.error(getTranslation(T_ADMIN_PAGE.userCreateErrorTitle), {
        description: result.message || "An unknown error occurred.",
      });
    }
    setIsCreatingUser(false);
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                    <UserCog className="h-7 w-7 text-primary" />
                    {getTranslation(T_ADMIN_PAGE.pageTitle)}
                </CardTitle>
                <CardDescription>{getTranslation(T_ADMIN_PAGE.pageDescription)}</CardDescription>
            </div>
            <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {getTranslation(T_ADMIN_PAGE.createNewUserButton)}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>{getTranslation(T_ADMIN_PAGE.createUserDialogTitle)}</DialogTitle>
                  <DialogDescription>{getTranslation(T_ADMIN_PAGE.createUserDialogDesc)}</DialogDescription>
                </DialogHeader>
                <Form {...createUserForm}>
                  <form onSubmit={createUserForm.handleSubmit(handleCreateUserSubmit)} className="space-y-4 pt-4">
                    <FormField control={createUserForm.control} name="name" render={({ field }) => (
                      <FormItem> <FormLabel>{getTranslation(T_ADMIN_PAGE.nameLabel)}</FormLabel> <FormControl><Input placeholder={getTranslation(T_ADMIN_PAGE.namePlaceholder)} {...field} /></FormControl> <FormMessage /> </FormItem>
                    )}/>
                    <FormField control={createUserForm.control} name="email" render={({ field }) => (
                      <FormItem> <FormLabel>{getTranslation(T_ADMIN_PAGE.emailLabel)}</FormLabel> <FormControl><Input type="email" placeholder={getTranslation(T_ADMIN_PAGE.emailPlaceholder)} {...field} /></FormControl> <FormMessage /> </FormItem>
                    )}/>
                    <FormField control={createUserForm.control} name="password" render={({ field }) => (
                      <FormItem> <FormLabel>{getTranslation(T_ADMIN_PAGE.passwordLabel)}</FormLabel> <FormControl><Input type="password" placeholder={getTranslation(T_ADMIN_PAGE.passwordPlaceholder)} {...field} /></FormControl> <FormMessage /> </FormItem>
                    )}/>
                     <FormField control={createUserForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem> <FormLabel>{getTranslation(T_ADMIN_PAGE.confirmPasswordLabel)}</FormLabel> <FormControl><Input type="password" placeholder={getTranslation(T_ADMIN_PAGE.passwordPlaceholder)} {...field} /></FormControl> <FormMessage /> </FormItem>
                    )}/>
                    <FormField control={createUserForm.control} name="role" render={({ field }) => (
                      <FormItem> <FormLabel>{getTranslation(T_ADMIN_PAGE.roleLabel)}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder={getTranslation(T_ADMIN_PAGE.selectRolePlaceholder)} /></SelectTrigger></FormControl>
                          <SelectContent>
                            {assignableUserRoles.map(role => ( <SelectItem key={role} value={role}>{role}</SelectItem> ))}
                          </SelectContent>
                        </Select> <FormMessage />
                      </FormItem>
                    )}/>
                    <DialogFooter className="pt-4">
                       <DialogClose asChild><Button type="button" variant="outline">{getTranslation(T_ADMIN_PAGE.cancelButton)}</Button></DialogClose>
                      <Button type="submit" disabled={isCreatingUser}>
                        {isCreatingUser ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>{getTranslation(T_ADMIN_PAGE.creatingUserButton)}</> : getTranslation(T_ADMIN_PAGE.createUserButton)}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
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
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{getTranslation(T_ADMIN_PAGE.savingButton)}</>
                        ) : (
                          <><Save className="mr-2 h-4 w-4" />{getTranslation(T_ADMIN_PAGE.saveRoleButton)}</>
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
