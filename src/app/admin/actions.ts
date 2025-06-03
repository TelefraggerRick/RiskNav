
"use server";

import { z } from "zod";
import { admin } from "@/lib/firebaseAdmin"; // Assuming dbAdmin is exported as admin from firebaseAdmin
import type { UserRecord } from "firebase-admin/auth";
import type { UserRole } from "@/lib/types";
import { assignableUserRoles } from "@/lib/types";

// Ensure assignableUserRoles is compatible with z.enum
// It expects a non-empty array of string literals.
const roleEnumValues = assignableUserRoles as [string, ...string[]];

const CreateUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(roleEnumValues, { errorMap: () => ({ message: "Please select a valid role."}) }),
});

export interface CreateUserResult {
  success: boolean;
  message: string;
  userId?: string;
}

export async function createNewUserAction(formData: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<CreateUserResult> {
  try {
    const validation = CreateUserSchema.safeParse(formData);
    if (!validation.success) {
      const errorMessages = Object.values(validation.error.flatten().fieldErrors)
        .flat()
        .filter(Boolean) // Ensure no undefined/null messages
        .join('. ');
      return { success: false, message: "Invalid form data: " + errorMessages };
    }

    const { email, password, name, role } = validation.data;

    if (!admin) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }
    const db = admin.firestore();


    // Check if user already exists in Firebase Auth
    try {
        await admin.auth().getUserByEmail(email);
        return { success: false, message: `User with email ${email} already exists in Firebase Authentication.` };
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
            // Different error, re-throw or handle as Firebase Auth error
            console.error("Error checking existing user in Auth:", error);
            return { success: false, message: "Error checking for existing user in Auth: " + error.message };
        }
        // If 'auth/user-not-found', it's good, we can proceed to create
    }
    
    // Check if a user document with this email already exists in Firestore
    const usersRef = db.collection('users');
    const existingUserQuery = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();

    if (!existingUserQuery.empty) {
        return { success: false, message: `A user profile with the email ${email} already exists in the database.` };
    }


    const userRecord: UserRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: true, // Or false, depending on your flow
    });

    // User created successfully in Firebase Auth, now create Firestore document
    const userProfile = {
      uid: userRecord.uid,
      name,
      email: email.toLowerCase(), // Store email consistently, e.g., lowercase
      role,
    };

    await db.collection("users").doc(userRecord.uid).set(userProfile);

    return { success: true, message: `User ${name} (${email}) created successfully with role ${role}.`, userId: userRecord.uid };

  } catch (error: any) {
    console.error("Error creating new user (Action):", error);
    let errorMessage = "An unexpected error occurred while creating the user.";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = `The email address ${formData.email} is already in use by another account.`;
    } else if (error.code === 'auth/invalid-password') {
      errorMessage = "Password should be at least 6 characters.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { success: false, message: errorMessage };
  }
}

