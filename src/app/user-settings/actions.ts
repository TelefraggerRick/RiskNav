
"use server";

import { z } from "zod";
import { admin, dbAdmin } from "@/lib/firebaseAdmin"; // Use firebase-admin
import { auth } from "@/lib/firebase"; // For getting current user on server if needed, or use context from Next.js
import { revalidatePath } from "next/cache";
import type { UserRecord } from "firebase-admin/auth";

// This action assumes re-authentication has been handled client-side before calling.
// It needs a way to get the authenticated user's UID on the server.
// For Firebase, this often means the client sends an ID token that the server verifies,
// or if using a framework like NextAuth.js, the session provides the UID.
// For simplicity here, we'll assume a mechanism to get UID (e.g., from a verified session).
// In a real Firebase client-SDK-only setup, client would send ID token.

const UpdateEmailServerSchema = z.object({
  newEmail: z.string().email({ message: "Invalid new email address." }),
});

export interface UpdateUserEmailResult {
  success: boolean;
  message: string;
}

export async function updateUserEmailAction(formData: {
  newEmail: string;
  // We need the UID. This should be securely obtained from the server's auth context.
  // For now, we'll simulate this or expect it to be passed if not available through context.
  // Ideally, a helper function `getAuthenticatedUserUidFromServer()` would exist.
  // If using Firebase client-side auth, the client might pass its ID token, and server verifies it.
  // For this example, let's assume the calling context (page.tsx) will obtain and pass the UID.
  uid: string; 
}): Promise<UpdateUserEmailResult> {
  try {
    const validation = UpdateEmailServerSchema.safeParse({ newEmail: formData.newEmail });
    if (!validation.success) {
      const errorMessages = Object.values(validation.error.flatten().fieldErrors)
        .flat()
        .filter(Boolean)
        .join(". ");
      return { success: false, message: "Invalid form data: " + errorMessages };
    }

    const { newEmail } = validation.data;
    const uid = formData.uid; // UID passed from client after re-auth

    if (!admin || !dbAdmin) { // Check if firebaseAdmin is initialized
      throw new Error("Firebase Admin SDK is not initialized on the server.");
    }

    // Check if the new email is already in use by another Firebase Auth user
    try {
      const existingUserByNewEmail = await admin.auth().getUserByEmail(newEmail);
      if (existingUserByNewEmail.uid !== uid) {
        return { success: false, message: `The email address ${newEmail} is already in use by another account.` };
      }
    } catch (error: any) {
      if (error.code !== 'auth/user-not-found') {
        // Unexpected error checking email
        console.error("Error checking new email in Auth:", error);
        return { success: false, message: "Error verifying new email availability: " + error.message };
      }
      // If user-not-found, it's good, the email is available.
    }
    
    // Check if the new email is already in use in Firestore 'users' collection by another user
    const usersRef = dbAdmin.collection('users');
    const existingFirestoreUserQuery = await usersRef.where('email', '==', newEmail.toLowerCase()).limit(1).get();
    if (!existingFirestoreUserQuery.empty) {
        const foundUser = existingFirestoreUserQuery.docs[0].data();
        if (foundUser.uid !== uid) {
            return { success: false, message: `The email address ${newEmail} is already associated with another user profile.` };
        }
    }

    // Update email in Firebase Authentication
    await admin.auth().updateUser(uid, {
      email: newEmail,
      emailVerified: false, // Email will need verification
    });

    // Update email in Firestore 'users' collection
    const userDocRef = dbAdmin.collection("users").doc(uid);
    await userDocRef.update({
      email: newEmail.toLowerCase(), // Store email in lowercase consistently
    });

    revalidatePath("/user-settings"); // Revalidate the settings page path
    // Consider revalidating other paths if email is displayed elsewhere, or revalidate all ('/')

    return {
      success: true,
      message: `Email successfully updated to ${newEmail}. Please check your new email address for a verification link.`,
    };
  } catch (error: any) {
    console.error("Error updating user email (Server Action):", error);
    let errorMessage = "An unexpected error occurred while updating your email.";
    if (error.code === "auth/email-already-exists" || error.message.includes("EMAIL_EXISTS")) {
      errorMessage = `The email address ${formData.newEmail} is already in use by another account.`;
    } else if (error.code === "auth/requires-recent-login") {
      errorMessage = "This operation is sensitive and requires recent authentication. Please log out and log back in, then try again.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { success: false, message: errorMessage };
  }
}
