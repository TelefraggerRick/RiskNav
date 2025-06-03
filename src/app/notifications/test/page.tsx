
"use client";

import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { sendPushNotificationToUser } from '../actions'; // Adjust path as necessary
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, BellRing, ShieldAlert } from 'lucide-react';

export default function TestNotificationPage() {
  const { currentUser, isLoadingAuth } = useUser();
  const router = useRouter();
  const [targetUserId, setTargetUserId] = useState('');
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test notification from RiskNav!');
  const [iconUrl, setIconUrl] = useState(''); // Optional
  const [clickAction, setClickAction] = useState(''); // Optional
  const [isSending, setIsSending] = useState(false);

  React.useEffect(() => {
    if (!isLoadingAuth && (!currentUser || currentUser.role !== 'Admin')) {
      toast.error("Access Denied", { description: "You do not have permission to view this page." });
      router.replace('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    if (!currentUser || currentUser.role !== 'Admin') {
      toast.error("Unauthorized", { description: "You are not authorized to perform this action." });
      setIsSending(false);
      return;
    }
    if (!targetUserId.trim()) {
        toast.error("Target User ID Required", { description: "Please enter the ID of the user to notify."});
        setIsSending(false);
        return;
    }

    const result = await sendPushNotificationToUser(targetUserId, {
      title,
      body,
      ...(iconUrl && { icon: iconUrl }),
      ...(clickAction && { click_action: clickAction }),
    });

    if (result.success) {
      toast.success("Notification Sent", { description: result.message });
    } else {
      toast.error("Failed to Send Notification", { description: result.message });
      console.error("FCM Send Results:", result.results);
    }
    setIsSending(false);
  };
  
  if (isLoadingAuth || (currentUser && currentUser.role !== 'Admin' && currentUser.uid !== 'user-unauth')) {
    return (
        <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
    );
  }

  if (!currentUser || currentUser.role !== 'Admin') {
     return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You must be an administrator to view this page.</p>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" /> Send Test Push Notification
          </CardTitle>
          <CardDescription>
            Use this form to send a test push notification to a specific user via FCM.
            Ensure the target user has granted notification permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="targetUserId">Target User ID</Label>
              <Input
                id="targetUserId"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="Enter user's Firebase UID"
                required
              />
            </div>
            <div>
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="body">Notification Body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="iconUrl">Icon URL (Optional)</Label>
              <Input
                id="iconUrl"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="e.g., /icons/icon-192x192.png"
              />
            </div>
             <div>
              <Label htmlFor="clickAction">Click Action URL (Optional)</Label>
              <Input
                id="clickAction"
                value={clickAction}
                onChange={(e) => setClickAction(e.target.value)}
                placeholder="e.g., /assessments/some-id"
              />
               <p className="text-xs text-muted-foreground mt-1">
                Relative path from your app's root URL (e.g., /dashboard).
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Notification"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
