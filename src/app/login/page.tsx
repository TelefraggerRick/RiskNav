
"use client";

import { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from 'sonner'; // Changed to sonner
import { LogIn } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser, isLoadingAuth } = useUser();
  const { getTranslation } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const T = {
    loginTitle: { en: "Login", fr: "Connexion" },
    loginDescription: { en: "Enter your email and password to access your account.", fr: "Entrez votre courriel et votre mot de passe pour accéder à votre compte." },
    emailLabel: { en: "Email", fr: "Courriel" },
    emailPlaceholder: { en: "you@example.com", fr: "vous@exemple.com" },
    passwordLabel: { en: "Password", fr: "Mot de passe" },
    loginButton: { en: "Login", fr: "Connexion" },
    loggingIn: { en: "Logging in...", fr: "Connexion en cours..." },
    redirecting: { en: "Redirecting...", fr: "Redirection en cours..." },
    loginSuccessTitle: { en: "Login Successful", fr: "Connexion réussie" },
    loginSuccessDesc: { en: "Welcome back, {userName}!", fr: "Bon retour, {userName}!" },
    loginFailedTitle: { en: "Login Failed", fr: "Échec de la connexion" },
    loginFailedDesc: { en: "Invalid email or password. Please try again.", fr: "Courriel ou mot de passe invalide. Veuillez réessayer." },
    alreadyLoggedIn: { en: "Already logged in. Redirecting...", fr: "Déjà connecté. Redirection en cours..." },
  };

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isLoadingAuth && currentUser && currentUser.uid !== 'user-unauth') {
      toast.success(getTranslation(T.loginSuccessTitle), { // Changed to sonner
        description: getTranslation(T.loginSuccessDesc).replace('{userName}', currentUser.name || 'User'),
      });
      router.replace('/'); 
    }
  }, [currentUser, isLoadingAuth, router, getTranslation, T.loginSuccessTitle, T.loginSuccessDesc]); // Removed toast from deps

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    const success = await login(data.email, data.password);
    if (success) {
      // Success toast and redirection are handled by the useEffect above
    } else {
      toast.error(getTranslation(T.loginFailedTitle), { // Changed to sonner
        description: getTranslation(T.loginFailedDesc),
      });
      form.resetField("password");
    }
    setIsSubmitting(false);
  };
  
  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]">{getTranslation(T.loggingIn)}</div>;
  }
  
  if (!isLoadingAuth && currentUser && currentUser.uid !== 'user-unauth') {
      return <div className="flex justify-center items-center h-[calc(100vh-200px)]">{getTranslation(T.alreadyLoggedIn)}</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <LogIn className="h-6 w-6 text-primary" /> {getTranslation(T.loginTitle)}
          </CardTitle>
          <CardDescription>
            {getTranslation(T.loginDescription)}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslation(T.emailLabel)}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={getTranslation(T.emailPlaceholder)} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslation(T.passwordLabel)}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting || form.formState.isSubmitting}>
                {(isSubmitting || form.formState.isSubmitting) ? getTranslation(T.loggingIn) : getTranslation(T.loginButton)}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
