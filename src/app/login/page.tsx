
"use client";

import { useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { LogIn, Users } from "lucide-react";
import { mockUsers } from '@/lib/mockUsers';
import { useLanguage } from '@/contexts/LanguageContext'; // Added

const loginSchema = z.object({
  userId: z.string().min(1, "User selection is required."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const availableLoginUsers = mockUsers.filter(user => user.id !== 'user-unauth');

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser } = useUser();
  const { toast } = useToast();
  const { getTranslation } = useLanguage(); // Added

  const T = {
    loginTitle: { en: "Login", fr: "Connexion" },
    loginDescription: { en: "Select your user profile and enter the password.", fr: "Sélectionnez votre profil utilisateur et entrez le mot de passe." },
    hint: { en: '(Hint: password is "coastguard2025" for all mock users)', fr: '(Indice : le mot de passe est "coastguard2025" pour tous les utilisateurs fictifs)' },
    userProfileLabel: { en: "User Profile", fr: "Profil Utilisateur" },
    userProfilePlaceholder: { en: "Select a user profile...", fr: "Sélectionnez un profil utilisateur..." },
    availableUsers: { en: "Available Users", fr: "Utilisateurs disponibles" },
    passwordLabel: { en: "Password", fr: "Mot de passe" },
    loginButton: { en: "Login", fr: "Connexion" },
    loggingIn: { en: "Logging in...", fr: "Connexion en cours..." },
    redirecting: { en: "Redirecting...", fr: "Redirection en cours..." },
    loginSuccessTitle: { en: "Login Successful", fr: "Connexion réussie" },
    loginSuccessDesc: { en: "Welcome back, {userName}!", fr: "Bon retour, {userName}!" },
    loginFailedTitle: { en: "Login Failed", fr: "Échec de la connexion" },
    loginFailedDesc: { en: "Invalid User ID or Password.", fr: "ID utilisateur ou mot de passe invalide." },
  };

  useEffect(() => {
    if (currentUser && currentUser.id !== 'user-unauth') {
      router.replace('/'); 
    }
  }, [currentUser, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    const success = await login(data.userId, data.password);
    if (success) {
      const loggedInUser = mockUsers.find(u => u.id === data.userId);
      toast({
        title: getTranslation(T.loginSuccessTitle),
        description: getTranslation(T.loginSuccessDesc).replace('{userName}', loggedInUser?.name || 'User'), 
      });
      router.push("/"); 
    } else {
      toast({
        title: getTranslation(T.loginFailedTitle),
        description: getTranslation(T.loginFailedDesc),
        variant: "destructive",
      });
      form.resetField("password");
    }
  };
  
  if (currentUser && currentUser.id !== 'user-unauth') {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]">{getTranslation(T.redirecting)}</div>;
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
            <br />
            {getTranslation(T.hint)}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslation(T.userProfileLabel)}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={getTranslation(T.userProfilePlaceholder)} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel className="flex items-center gap-2"><Users className="h-4 w-4"/>{getTranslation(T.availableUsers)}</SelectLabel>
                          {availableLoginUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.role})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
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
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? getTranslation(T.loggingIn) : getTranslation(T.loginButton)}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
