
"use client";

import RiskAssessmentForm from "@/components/risk-assessments/RiskAssessmentForm";
import type { RiskAssessmentFormData } from "@/lib/schemas";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { RiskAssessment, ApprovalLevel, Attachment as AttachmentType, ApprovalStep } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
// mockRiskAssessments and localStorage logic removed
import { useLanguage } from '@/contexts/LanguageContext';
import { addAssessmentToDB } from '@/lib/firestoreService'; // Import Firestore service

const approvalLevelsOrder: ApprovalLevel[] = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];

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
      const now = new Date();
      const referenceNumber = `CCG-RA-${now.getFullYear()}-${String(Date.now()).slice(-5)}`;

      // Prepare attachments for Firestore service, keeping File object for potential upload logic later (service strips it for DB)
      const newAttachmentsForDB: Array<Partial<AttachmentType> & { file?: File }> = (data.attachments || []).map(att => ({
        name: att.file?.name || att.name || "unknown_file",
        url: att.url || '#', // Placeholder URL - actual upload would generate this
        type: att.file?.type || att.type || "unknown",
        size: att.file?.size || att.size || 0,
        uploadedAt: now.toISOString(), // Client-side timestamp for now, service converts to Firestore.Timestamp
        file: att.file, // Pass the file, service function will handle not storing it.
        dataAiHint: att.dataAiHint,
      }));

      const assessmentDataForDB: Omit<RiskAssessment, 'id' | 'submissionDate' | 'lastModified'> & { attachments?: Array<Partial<AttachmentType> & { file?: File }> } = {
        referenceNumber,
        maritimeExemptionNumber: data.maritimeExemptionNumber || undefined,
        vesselName: data.vesselName,
        imoNumber: data.imoNumber || undefined,
        department: data.department,
        region: data.region,
        patrolStartDate: data.patrolStartDate || undefined,
        patrolEndDate: data.patrolEndDate || undefined,
        patrolLengthDays: calculatePatrolLengthDays(data.patrolStartDate, data.patrolEndDate),
        voyageDetails: data.voyageDetails,
        reasonForRequest: data.reasonForRequest,
        personnelShortages: data.personnelShortages,
        proposedOperationalDeviations: data.proposedOperationalDeviations,
        submittedBy: currentUser.name,
        status: 'Pending Crewing Standards and Oversight', // Initial status
        attachments: newAttachmentsForDB,
        approvalSteps: approvalLevelsOrder.map(level => ({ level } as ApprovalStep)), // Initial approval steps
        
        // Exemption & Individual Assessment Data
        employeeName: data.employeeName || undefined,
        certificateHeld: data.certificateHeld || undefined,
        requiredCertificate: data.requiredCertificate || undefined,
        coDeptHeadSupportExemption: data.coDeptHeadSupportExemption,
        deptHeadConfidentInIndividual: data.deptHeadConfidentInIndividual,
        deptHeadConfidenceReason: data.deptHeadConfidenceReason || undefined,
        employeeFamiliarizationProvided: data.employeeFamiliarizationProvided,
        workedInDepartmentLast12Months: data.workedInDepartmentLast12Months,
        workedInDepartmentDetails: data.workedInDepartmentDetails || undefined,
        similarResponsibilityExperience: data.similarResponsibilityExperience,
        similarResponsibilityDetails: data.similarResponsibilityDetails || undefined,
        individualHasRequiredSeaService: data.individualHasRequiredSeaService,
        individualWorkingTowardsCertification: data.individualWorkingTowardsCertification,
        certificationProgressSummary: data.certificationProgressSummary || undefined,
        
        // Operational Considerations
        requestCausesVacancyElsewhere: data.requestCausesVacancyElsewhere,
        crewCompositionSufficientForSafety: data.crewCompositionSufficientForSafety,
        detailedCrewCompetencyAssessment: data.detailedCrewCompetencyAssessment || undefined,
        crewContinuityAsPerProfile: data.crewContinuityAsPerProfile,
        crewContinuityDetails: data.crewContinuityDetails || undefined,
        specialVoyageConsiderations: data.specialVoyageConsiderations || undefined,
        reductionInVesselProgramRequirements: data.reductionInVesselProgramRequirements,
        rocNotificationOfLimitations: data.rocNotificationOfLimitations,

        // AI fields will be undefined initially
        aiRiskScore: undefined,
        aiGeneratedSummary: undefined,
        aiSuggestedMitigations: undefined,
        aiRegulatoryConsiderations: undefined,
        aiLikelihoodScore: undefined,
        aiConsequenceScore: undefined,
      };

      // Simulate async operation for UX if addAssessmentToDB is very fast
      // await new Promise(resolve => setTimeout(resolve, 500)); 
      
      const newDocId = await addAssessmentToDB(assessmentDataForDB);
      console.log("New assessment added with ID:", newDocId);

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

