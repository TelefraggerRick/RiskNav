
"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { auth } from '@/lib/firebase'; // Firebase client SDK
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword as firebaseUpdatePassword } from "firebase/auth";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldAlert, KeyRound, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateUserEmailAction, type UpdateUserEmailResult } from './actions';

const T_SETTINGS_PAGE = {
  pageTitle: { en: "User Settings", fr: "Paramètres utilisateur" },
  pageDescription: { en: "Manage your account details, change your password, and update your email address.", fr: "Gérez les détails de votre compte, changez votre mot de passe et mettez à jour votre adresse e-mail." },
  loadingUser: { en: "Loading user data...", fr: "Chargement des données utilisateur..." },
  accessDeniedTitle: { en: "Access Denied", fr: "Accès refusé" },
  accessDeniedDesc: { en: "You must be logged in to view this page.", fr: "Vous devez être connecté pour visualiser cette page." },
  redirectToLogin: { en: "Redirecting to login...", fr: "Redirection vers la connexion..." },
  
  changePasswordTitle: { en: "Change Password", fr: "Changer le mot de passe" },
  currentPasswordLabel: { en: "Current Password", fr: "Mot de passe actuel" },
  newPasswordLabel: { en: "New Password", fr: "Nouveau mot de passe" },
  confirmNewPasswordLabel: { en: "Confirm New Password", fr: "Confirmer le nouveau mot de passe" },
  passwordMinLength: { en: "Password must be at least 6 characters.", fr: "Le mot de passe doit comporter au moins 6 caractères." },
  passwordsDontMatch: { en: "New passwords do not match.", fr: "Les nouveaux mots de passe ne correspondent pas." },
  updatePasswordButton: { en: "Update Password", fr: "Mettre à jour le mot de passe" },
  updatingPasswordButton: { en: "Updating...", fr: "Mise à jour..." },
  passwordUpdateSuccessTitle: { en: "Password Updated", fr: "Mot de passe mis à jour" },
  passwordUpdateSuccessDesc: { en: "Your password has been changed successfully.", fr: "Votre mot de passe a été changé avec succès." },
  passwordUpdateErrorTitle: { en: "Password Update Failed", fr: "Échec de la mise à jour du mot de passe" },
  
  changeEmailTitle: { en: "Change Email Address", fr: "Changer l'adresse e-mail" },
  newEmailLabel: { en: "New Email Address", fr: "Nouvelle adresse e-mail" },
  confirmPasswordForEmailLabel: { en: "Confirm Current Password", fr: "Confirmer le mot de passe actuel" },
  updateEmailButton: { en: "Update Email", fr: "Mettre à jour l'e-mail" },
  updatingEmailButton: { en: "Updating...", fr: "Mise à jour..." },
  emailUpdateSuccessTitle: { en: "Email Update Requested", fr: "Demande de mise à jour d'e-mail" },
  // Success desc will come from server action
  emailUpdateErrorTitle: { en: "Email Update Failed", fr: "Échec de la mise à jour de l'e-mail" },
  reAuthError: { en: "Re-authentication failed. Please check your current password.", fr: "La réauthentification a échoué. Veuillez vérifier votre mot de passe actuel."}
};

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: T_SETTINGS_PAGE.passwordMinLength.en }), // Use key for easier translation if needed later
  confirmNewPassword: z.string().min(6, { message: T_SETTINGS_PAGE.passwordMinLength.en }),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: T_SETTINGS_PAGE.passwordsDontMatch.en,
  path: ["confirmNewPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const emailFormSchema = z.object({
  newEmail: z.string().email({ message: "Invalid email address." }),
  currentPasswordForEmail: z.string().min(1, { message: "Current password is required to change email." }),
});
type EmailFormValues = z.infer<typeof emailFormSchema>;


export default function UserSettingsPage() {
  const { currentUser, firebaseUser, isLoadingAuth } = useUser();
  const { getTranslation } = useLanguage();
  const router = useRouter();

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { newEmail: "", currentPasswordForEmail: "" },
  });

  useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.uid === 'user-unauth')) {
      toast.error(getTranslation(T_SETTINGS_PAGE.accessDeniedTitle), {
        description: getTranslation(T_SETTINGS_PAGE.accessDeniedDesc) + " " + getTranslation(T_SETTINGS_PAGE.redirectToLogin),
      });
      router.replace('/login');
    }
  }, [currentUser, isLoadingAuth, router, getTranslation]);

  const handlePasswordUpdate = async (values: PasswordFormValues) => {
    if (!firebaseUser || !firebaseUser.email) {
      toast.error(getTranslation(T_SETTINGS_PAGE.passwordUpdateErrorTitle), { description: "User not properly authenticated." });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, values.currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await firebaseUpdatePassword(firebaseUser, values.newPassword);
      toast.success(getTranslation(T_SETTINGS_PAGE.passwordUpdateSuccessTitle), {
        description: getTranslation(T_SETTINGS_PAGE.passwordUpdateSuccessDesc),
      });
      passwordForm.reset();
    } catch (error: any) {
      console.error("Password update error:", error);
      let desc = error.message;
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        desc = getTranslation(T_SETTINGS_PAGE.reAuthError);
        passwordForm.setError("currentPassword", { type: "manual", message: desc});
      }
      toast.error(getTranslation(T_SETTINGS_PAGE.passwordUpdateErrorTitle), { description: desc });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEmailUpdate = async (values: EmailFormValues) => {
    if (!firebaseUser || !firebaseUser.email || currentUser.uid === 'user-unauth') {
       toast.error(getTranslation(T_SETTINGS_PAGE.emailUpdateErrorTitle), { description: "User not properly authenticated." });
      return;
    }
    setIsUpdatingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, values.currentPasswordForEmail);
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // After re-authentication, call server action
      const result: UpdateUserEmailResult = await updateUserEmailAction({ 
        newEmail: values.newEmail,
        uid: currentUser.uid // Pass the UID to the server action
      });

      if (result.success) {
        toast.success(getTranslation(T_SETTINGS_PAGE.emailUpdateSuccessTitle), {
          description: result.message,
        });
        emailForm.reset();
        // Potentially force re-fetch user data or advise user to log out and log back in
        // as their local user context might be stale regarding the email.
        // Or, more simply, the Firebase onAuthStateChanged listener should pick up the email change from Auth
        // and update the context, but Firestore part needs server update.
      } else {
        toast.error(getTranslation(T_SETTINGS_PAGE.emailUpdateErrorTitle), {
          description: result.message,
        });
      }

    } catch (error: any) {
      console.error("Email update error:", error);
      let desc = error.message;
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        desc = getTranslation(T_SETTINGS_PAGE.reAuthError);
        emailForm.setError("currentPasswordForEmail", { type: "manual", message: desc });
      }
      toast.error(getTranslation(T_SETTINGS_PAGE.emailUpdateErrorTitle), { description: desc });
    } finally {
      setIsUpdatingEmail(false);
    }
  };


  if (isLoadingAuth || !currentUser || currentUser.uid === 'user-unauth') {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-xl text-muted-foreground">{getTranslation(T_SETTINGS_PAGE.loadingUser)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      <div className="pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">{getTranslation(T_SETTINGS_PAGE.pageTitle)}</h1>
        <p className="text-muted-foreground">{getTranslation(T_SETTINGS_PAGE.pageDescription)}</p>
      </div>

      {/* Change Password Card */}
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-xl flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            {getTranslation(T_SETTINGS_PAGE.changePasswordTitle)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-6">
              <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation(T_SETTINGS_PAGE.currentPasswordLabel)}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation(T_SETTINGS_PAGE.newPasswordLabel)}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation(T_SETTINGS_PAGE.confirmNewPasswordLabel)}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <Button type="submit" disabled={isUpdatingPassword} className="w-full sm:w-auto">
                {isUpdatingPassword ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{getTranslation(T_SETTINGS_PAGE.updatingPasswordButton)}</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" />{getTranslation(T_SETTINGS_PAGE.updatePasswordButton)}</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator />

      {/* Change Email Card */}
      <Card className="shadow-lg rounded-lg">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-xl flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            {getTranslation(T_SETTINGS_PAGE.changeEmailTitle)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleEmailUpdate)} className="space-y-6">
              <FormField control={emailForm.control} name="newEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation(T_SETTINGS_PAGE.newEmailLabel)}</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={emailForm.control} name="currentPasswordForEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation(T_SETTINGS_PAGE.confirmPasswordForEmailLabel)}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <Button type="submit" disabled={isUpdatingEmail} className="w-full sm:w-auto">
                {isUpdatingEmail ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{getTranslation(T_SETTINGS_PAGE.updatingEmailButton)}</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" />{getTranslation(T_SETTINGS_PAGE.updateEmailButton)}</>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

