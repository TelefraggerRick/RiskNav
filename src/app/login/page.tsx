
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

  // Redirect if user is already logged in
  useEffect(() => {
    if (currentUser && currentUser.id !== 'user-unauth') {
      router.replace('/'); // Redirect to dashboard or home
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
    // The login function in UserContext will update currentUser if successful
    const success = await login(data.userId, data.password);
    if (success) {
      // We need to get the updated user's name for the toast.
      // Since context update might be async, it's safer to find user again or delay toast.
      // For simplicity here, we'll assume login updates currentUser synchronously for the toast.
      const loggedInUser = mockUsers.find(u => u.id === data.userId);
      toast({
        title: "Login Successful",
        description: `Welcome back, ${loggedInUser?.name || 'User'}!`, 
      });
      router.push("/"); // Redirect to dashboard
    } else {
      toast({
        title: "Login Failed",
        description: "Invalid User ID or Password.",
        variant: "destructive",
      });
      form.resetField("password");
    }
  };
  
  // Do not render the form if the user is already authenticated and redirection is in progress
  if (currentUser && currentUser.id !== 'user-unauth') {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]">Redirecting...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <LogIn className="h-6 w-6 text-primary" /> Login
          </CardTitle>
          <CardDescription>
            Select your user profile and enter the password.
            (Hint: password is "coastguard2025" for all mock users)
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
                    <FormLabel>User Profile</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user profile..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel className="flex items-center gap-2"><Users className="h-4 w-4"/>Available Users</SelectLabel>
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
                    <FormLabel>Password</FormLabel>
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
                {form.formState.isSubmitting ? "Logging in..." : "Login"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
