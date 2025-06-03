
"use server";

import { z } from "zod";
import { admin } from "@/lib/firebaseAdmin";
import type { UserRecord } from "firebase-admin/auth";
import type { UserRole, VesselRegion } from "@/lib/types";
import { assignableUserRoles, ALL_VESSEL_REGIONS } from "@/lib/types";

const roleEnumValues = assignableUserRoles as [string, ...string[]];
const regionEnumValues = ALL_VESSEL_REGIONS; // z.enum can take readonly string[]

const CreateUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(roleEnumValues, { errorMap: () => ({ message: "Please select a valid role."}) }),
  region: z.enum(regionEnumValues).optional(), // Added region, optional
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
  region?: VesselRegion; // Added region
}): Promise<CreateUserResult> {
  try {
    const validation = CreateUserSchema.safeParse(formData);
    if (!validation.success) {
      const errorMessages = Object.values(validation.error.flatten().fieldErrors)
        .flat()
        .filter(Boolean) 
        .join('. ');
      return { success: false, message: "Invalid form data: " + errorMessages };
    }

    const { email, password, name, role, region } = validation.data;

    if (!admin) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }
    const db = admin.firestore();


    try {
        await admin.auth().getUserByEmail(email);
        return { success: false, message: `User with email ${email} already exists in Firebase Authentication.` };
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
            console.error("Error checking existing user in Auth:", error);
            return { success: false, message: "Error checking for existing user in Auth: " + error.message };
        }
    }
    
    const usersRef = db.collection('users');
    const existingUserQuery = await usersRef.where('email', '==', email.toLowerCase()).limit(1).get();

    if (!existingUserQuery.empty) {
        return { success: false, message: `A user profile with the email ${email} already exists in the database.` };
    }


    const userRecord: UserRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: true, 
    });

    const userProfile: AppUser = {
      uid: userRecord.uid,
      name,
      email: email.toLowerCase(), 
      role,
      ...(region && { region }), // Add region if provided
    };

    await db.collection("users").doc(userRecord.uid).set(userProfile);

    return { success: true, message: `User ${name} (${email}) created successfully with role ${role}${region ? ` and region ${region}`: ''}.`, userId: userRecord.uid };

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
