
"use client";

import { useEffect } from "react"; // Import useEffect
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ApprovalDecision, ApprovalLevel } from "@/lib/types"; // Added ApprovalLevel
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
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ThumbsUp, ThumbsDown, MessageSquare, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const approvalDialogSchema = z.object({
  notes: z.string().min(1, "Notes are required for this action.").max(1000, "Notes must be 1000 characters or less."),
  isAgainstFSM: z.boolean().optional(),
  isAgainstMPR: z.boolean().optional(),
  isAgainstCrewingProfile: z.boolean().optional(),
});

export type ApprovalDialogFormData = z.infer<typeof approvalDialogSchema>;

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApprovalDialogFormData) => void; // Changed to accept object
  decision?: ApprovalDecision;
  currentApprovalLevel?: ApprovalLevel; // Added currentApprovalLevel
  isLoading?: boolean;
}

export default function ApprovalDialog({ isOpen, onClose, onSubmit, decision, currentApprovalLevel, isLoading }: ApprovalDialogProps) {
  const form = useForm<ApprovalDialogFormData>({
    resolver: zodResolver(approvalDialogSchema),
    defaultValues: {
      notes: "",
      isAgainstFSM: false,
      isAgainstMPR: false,
      isAgainstCrewingProfile: false,
    },
  });
  const { getTranslation } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      form.reset({ // Reset form when dialog opens, especially for checkbox defaults
        notes: "",
        isAgainstFSM: false,
        isAgainstMPR: false,
        isAgainstCrewingProfile: false,
      });
    }
  }, [isOpen, form]);

  const T = {
    confirmAction: { en: "Confirm Action", fr: "Confirmer l'action" },
    approveAssessment: { en: "Approve Assessment", fr: "Approuver l'évaluation" },
    rejectAssessment: { en: "Reject Assessment", fr: "Rejeter l'évaluation" },
    requestMoreInfo: { en: "Request More Information", fr: "Demander plus d'informations" },
    dialogDescription: { en: "Please provide notes for your decision. This information will be recorded.", fr: "Veuillez fournir des notes pour votre décision. Ces informations seront enregistrées." },
    notesLabel: { en: "Notes *", fr: "Notes *" },
    notesPlaceholder: { en: "Enter your notes for {action}...", fr: "Entrez vos notes pour {action}..." },
    complianceFlagsTitle: { en: "Compliance Flags (CSO Only)", fr: "Indicateurs de conformité (BCN seulement)" },
    complianceFlagsDesc: { en: "If approving, please indicate if this exemption is against:", fr: "Si vous approuvez, veuillez indiquer si cette exemption est contraire à :" },
    isAgainstFSMLabel: { en: "Fleet Safety Manual (FSM)", fr: "Manuel de sécurité de la flotte (MSF)" },
    isAgainstMPRLabel: { en: "Marine Personnel Regulations (MPR)", fr: "Règlement sur le personnel maritime (RPM)" },
    isAgainstCrewingProfileLabel: { en: "Vessel Crewing Profile", fr: "Profil d'armement du navire" },
    cancel: { en: "Cancel", fr: "Annuler" },
    confirm: { en: "Confirm {action}", fr: "Confirmer {action}" },
    processing: { en: "Processing...", fr: "Traitement en cours..." },
  };

  const handleSubmit = (data: ApprovalDialogFormData) => {
    onSubmit(data); // Submit the whole data object
    // Form reset is now handled by useEffect on isOpen change
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

  const showComplianceFlags = decision === 'Approved' && currentApprovalLevel === 'Crewing Standards and Oversight';

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
                      rows={showComplianceFlags ? 3 : 5} // Adjust rows based on flag visibility
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showComplianceFlags && (
              <div className="space-y-3 pt-3 border-t">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-orange-500"/>
                    {getTranslation(T.complianceFlagsTitle)}
                </h4>
                <p className="text-xs text-muted-foreground">{getTranslation(T.complianceFlagsDesc)}</p>
                <FormField
                  control={form.control}
                  name="isAgainstFSM"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-background hover:bg-muted/50">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer flex-grow">
                        {getTranslation(T.isAgainstFSMLabel)}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isAgainstMPR"
                  render={({ field }) => (
                     <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-background hover:bg-muted/50">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer flex-grow">
                        {getTranslation(T.isAgainstMPRLabel)}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isAgainstCrewingProfile"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-background hover:bg-muted/50">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer flex-grow">
                        {getTranslation(T.isAgainstCrewingProfileLabel)}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter className="sm:justify-end gap-2 pt-2">
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
