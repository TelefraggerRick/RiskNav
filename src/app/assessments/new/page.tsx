
"use client";

import RiskAssessmentForm from "@/components/risk-assessments/RiskAssessmentForm";
import type { RiskAssessmentFormData } from "@/lib/schemas";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { RiskAssessment, ApprovalLevel, Attachment as AttachmentType } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
// import { mockRiskAssessments } from '@/lib/mockData'; // No longer primary source
import { useLanguage } from '@/contexts/LanguageContext';
import { addRiskAssessment } from "@/services/riskAssessmentService"; // Import Firestore service

// LOCAL_STORAGE_KEY no longer needed
const approvalLevelsOrder: ApprovalLevel[] = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];


// getAllStoredAssessments and addNewAssessmentToStorage are no longer needed as Firestore is used

export default function NewAssessmentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useUser();
  const { getTranslation } = useLanguage(); 

  const T = {
    pageTitle: { en: "New Risk Assessment", fr: "Nouvelle évaluation des risques" },
    backToDashboard: { en: "Back to Dashboard", fr: "Retour au tableau de bord" },
    submitSuccessTitle: { en: "Assessment Submitted Successfully", fr: "Évaluation soumise avec succès" },
    submitSuccessDesc: { en: "Risk assessment for {vesselName} has been submitted. You will be redirected to the dashboard.", fr: "L'évaluation des risques pour {vesselName} a été soumise. Vous allez être redirigé vers le tableau de bord." },
    submitErrorTitle: { en: "Submission Failed", fr: "Échec de la soumission"},
    submitErrorDesc: { en: "Could not submit the risk assessment. Please try again.", fr: "Impossible de soumettre l'évaluation des risques. Veuillez réessayer."},
  };

  const calculatePatrolLengthDays = (startDateStr?: string, endDateStr?: string): number | undefined => {
    if (startDateStr && endDateStr) {
      try {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate >= startDate) {
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays === 0 ? 1 : diffDays; // Minimum 1 day if start and end are same
        }
      } catch (e) {
        console.error("Error parsing patrol dates:", e);
      }
    }
    return undefined;
  };


  const handleSubmit = async (data: RiskAssessmentFormData) => {
    if (!currentUser || currentUser.id === 'user-unauth') {
        toast({ title: "Authentication Error", description: "You must be logged in to submit an assessment.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    
    try {
        // Reference number can be generated client-side or server-side (e.g., via Cloud Function trigger)
        // For now, keeping client-side generation.
        const now = new Date();
        const referenceNumber = `CCG-RA-${now.getFullYear()}-${String(Date.now()).slice(-5)}`;
        
        // The addRiskAssessment service now handles attachment uploads and data structuring.
        // We just pass the raw form data and the submitter's name.
        
        const assessmentDataWithRef = {
            ...data,
            referenceNumber, // Add the generated reference number
             // patrolLengthDays is calculated by the service or not needed if start/end is enough
            patrolLengthDays: calculatePatrolLengthDays(data.patrolStartDate, data.patrolEndDate),
            status: 'Pending Crewing Standards and Oversight', // Initial status
            approvalSteps: approvalLevelsOrder.map(level => ({ level })), // Initial approval steps
        };

        await addRiskAssessment(assessmentDataWithRef as RiskAssessmentFormData, currentUser.name);

        toast({
          title: getTranslation(T.submitSuccessTitle),
          description: getTranslation(T.submitSuccessDesc).replace('{vesselName}', data.vesselName),
          variant: "default",
        });
        
        setTimeout(() => router.push("/"), 2000);

    } catch (error) {
        console.error("Error submitting assessment:", error);
        toast({
            title: getTranslation(T.submitErrorTitle),
            description: getTranslation(T.submitErrorDesc),
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
       <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">{getTranslation(T.pageTitle)}</h1>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {getTranslation(T.backToDashboard)}
          </Link>
        </Button>
      </div>
      <RiskAssessmentForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
