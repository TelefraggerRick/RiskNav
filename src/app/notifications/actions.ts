
'use server';

import { admin } from '@/lib/firebaseAdmin';
import { getUserFCMTokens } from '@/lib/firestoreService'; // We'll need to implement this on client-side, but use admin SDK to fetch here

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string; // Optional icon URL
  click_action?: string; // Optional URL to open on click
}

export async function sendPushNotificationToUser(
  targetUserId: string,
  payload: NotificationPayload
): Promise<{ success: boolean; message: string; results?: any[] }> {
  if (!admin) {
    return { success: false, message: "Firebase Admin SDK not initialized." };
  }
  if (!targetUserId) {
    return { success: false, message: "Target User ID is required." };
  }
  if (!payload || !payload.title || !payload.body) {
    return { success: false, message: "Notification title and body are required." };
  }

  try {
    // In a real scenario, you'd fetch tokens from Firestore using the Admin SDK
    const dbAdmin = admin.firestore();
    const userDoc = await dbAdmin.collection('users').doc(targetUserId).get();

    if (!userDoc.exists) {
      return { success: false, message: `User with ID ${targetUserId} not found.` };
    }

    const userData = userDoc.data();
    const tokens = userData?.fcmTokens as string[] | undefined;

    if (!tokens || tokens.length === 0) {
      return { success: false, message: `No FCM tokens found for user ${targetUserId}.` };
    }

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.icon && { imageUrl: payload.icon }), // FCM uses imageUrl for web
      },
      webpush: {
        fcmOptions: {
            ...(payload.click_action && { link: payload.click_action }),
        },
        notification: { // Webpush specific notification payload for more control
            title: payload.title,
            body: payload.body,
            ...(payload.icon && { icon: payload.icon }),
            ...(payload.click_action && { click_action: payload.click_action }), // Standard click_action
        }
      },
      tokens: tokens, // target multiple tokens for the user
    };

    console.log("Attempting to send multicast message:", JSON.stringify(message, null, 2));
    const response = await admin.messaging().sendEachForMulticast(message); // Changed to sendEachForMulticast
    console.log("FCM multicast response:", JSON.stringify(response, null, 2));


    const successfulSends = response.responses.filter(r => r.success).length;
    const failedSends = response.failureCount;

    // Basic error handling for failed tokens (in a real app, you'd remove invalid tokens from DB)
     response.responses.forEach((result, index) => {
      if (!result.success) {
        console.error(`Failed to send to token ${tokens[index]}: ${result.error?.message} (Code: ${result.error?.code})`);
        // TODO: Implement logic to remove invalid/unregistered tokens
        // e.g. if (result.error.code === 'messaging/registration-token-not-registered') { removeTokenFromDB(tokens[index]); }
      }
    });


    if (response.successCount > 0) {
      return {
        success: true,
        message: `Successfully sent ${response.successCount} notifications to user ${targetUserId}. Failures: ${response.failureCount}.`,
        results: response.responses,
      };
    } else {
       return {
        success: false,
        message: `Failed to send any notifications to user ${targetUserId}. Failures: ${response.failureCount}. See server logs for details.`,
        results: response.responses,
      };
    }

  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return { success: false, message: `Error sending notification: ${error.message}` };
  }
}
