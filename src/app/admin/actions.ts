
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
      return { success: false, message: "Invalid form data: " + validation.error.flatten().fieldErrors };
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
            return { success: false, message: "Error checking for existing user: " + error.message };
        }
        // If 'auth/user-not-found', it's good, we can proceed to create
    }
    
    // Check if user document already exists in Firestore (e.g. if Auth user was deleted but FS doc remained)
    const firestoreUserDoc = await db.collection("users").doc(email.toLowerCase()).get(); // Using email as temp ID before UID
     if (firestoreUserDoc.exists()) {
        // Heuristic: if a doc exists with this email as ID, it's likely a remnant or conflict.
        // More robust would be to query by email field if you store email as a field.
        // For this example, let's assume email is not the doc ID for users.
        // If using UID as doc ID (which is standard), this check is less relevant here,
        // as we don't have UID yet. The createUser will give us the UID.
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
      email,
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
