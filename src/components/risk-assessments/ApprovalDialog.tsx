
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
import { useLanguage } from '@/contexts/LanguageContext'; // Added

const approvalNotesSchema = z.object({
  notes: z.string().min(1, "Notes are required for this action.").max(1000, "Notes must be 1000 characters or less."),
});

type ApprovalNotesFormData = z.infer<typeof approvalNotesSchema>;

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (notes: string) => void;
  decision?: ApprovalDecision; 
  isLoading?: boolean;
}

export default function ApprovalDialog({ isOpen, onClose, onSubmit, decision, isLoading }: ApprovalDialogProps) {
  const form = useForm<ApprovalNotesFormData>({
    resolver: zodResolver(approvalNotesSchema),
    defaultValues: {
      notes: "",
    },
  });
  const { getTranslation } = useLanguage(); // Added

  const T = {
    confirmAction: { en: "Confirm Action", fr: "Confirmer l'action" },
    approveAssessment: { en: "Approve Assessment", fr: "Approuver l'évaluation" },
    rejectAssessment: { en: "Reject Assessment", fr: "Rejeter l'évaluation" },
    requestMoreInfo: { en: "Request More Information", fr: "Demander plus d'informations" },
    dialogDescription: { en: "Please provide notes for your decision. This information will be recorded.", fr: "Veuillez fournir des notes pour votre décision. Ces informations seront enregistrées." },
    notesLabel: { en: "Notes *", fr: "Notes *" },
    notesPlaceholder: { en: "Enter your notes for {action}...", fr: "Entrez vos notes pour {action}..." },
    cancel: { en: "Cancel", fr: "Annuler" },
    confirm: { en: "Confirm {action}", fr: "Confirmer {action}" },
    processing: { en: "Processing...", fr: "Traitement en cours..." },
  };

  const handleSubmit = (data: ApprovalNotesFormData) => {
    onSubmit(data.notes);
    form.reset(); 
  };

  const getDialogTitle = () => {
    if (!decision) return getTranslation(T.confirmAction);
    switch (decision) {
      case 'Approved': return getTranslation(T.approveAssessment);
      case 'Rejected': return getTranslation(T.rejectAssessment);
      case 'Needs Information': return getTranslation(T.requestMoreInfo);
      default: return getTranslation(T.confirmAction);
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

  const getActionText = (baseText: { en: string, fr: string }) => {
    return getTranslation(baseText).replace('{action}', decision || getTranslation(T.confirmAction).toLowerCase());
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
            {getTranslation(T.dialogDescription)}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getTranslation(T.notesLabel)}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={getActionText(T.notesPlaceholder)}
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
                  {getTranslation(T.cancel)}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading || !form.formState.isValid}
                className={
                    decision === 'Approved' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    decision === 'Rejected' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' :
                    'bg-primary hover:bg-primary/90 text-primary-foreground'
                }
              >
                {isLoading ? getTranslation(T.processing) : getActionText(T.confirm)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
