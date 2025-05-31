
"use client";

import { useState }
from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ApprovalDecision } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

const approvalNotesSchema = z.object({
  notes: z.string().min(1, "Notes are required for this action.").max(1000, "Notes must be 1000 characters or less."),
});

type ApprovalNotesFormData = z.infer<typeof approvalNotesSchema>;

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => void;
  decision?: ApprovalDecision; // To style the dialog/title
  isLoading?: boolean;
}

export default function ApprovalDialog({ isOpen, onClose, onSubmit, decision, isLoading }: ApprovalDialogProps) {
  const form = useForm<ApprovalNotesFormData>({
    resolver: zodResolver(approvalNotesSchema),
    defaultValues: {
      notes: "",
    },
  });

  const handleSubmit = (data: ApprovalNotesFormData) => {
    onSubmit(data.notes);
    form.reset(); // Reset form after submission
  };

  const getDialogTitle = () => {
    if (!decision) return "Confirm Action";
    switch (decision) {
      case 'Approved': return "Approve Assessment";
      case 'Rejected': return "Reject Assessment";
      case 'Needs Information': return "Request More Information";
      default: return "Confirm Action";
    }
  };
  
  const getDialogIcon = () => {
    if (!decision) return null;
    const IconProps = {className: "h-5 w-5 mr-2"};
    switch (decision) {
      case 'Approved': return <ThumbsUp {...IconProps} />;
      case 'Rejected': return <ThumbsDown {...IconProps} />;
      case 'Needs Information': return <MessageSquare {...IconProps} />;
      default: return null;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { form.reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {getDialogIcon()}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            Please provide notes for your decision. This information will be recorded.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Enter your notes for ${decision?.toLowerCase() || 'this action'}...`}
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-end gap-2">
               <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={() => { form.reset(); onClose();}}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading || !form.formState.isValid}
                className={
                    decision === 'Approved' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    decision === 'Rejected' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' :
                    'bg-primary hover:bg-primary/90 text-primary-foreground'
                }
              >
                {isLoading ? "Processing..." : `Confirm ${decision || 'Action'}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
