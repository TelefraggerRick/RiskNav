
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
import { useLanguage } from '@/contexts/LanguageContext';
import { addAssessmentToDB, uploadFileToStorage } from '@/lib/firestoreService'; // Import Firestore service and uploadFileToStorage
// Removed: import { doc, collection } from 'firebase/firestore'; // No longer needed for temp path
// Removed: import { db } from '@/lib/firebase'; // No longer needed for temp path

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
    fileUploadErrorTitle: { en: "File Upload Failed", fr: "Échec du téléversement de fichier" },
    fileUploadErrorDesc: { en: "Could not upload attachment: {fileName}. Please try again.", fr: "Impossible de téléverser la pièce jointe : {fileName}. Veuillez réessayer."}
  };

  const calculatePatrolLengthDays = (startDateStr?: string, endDateStr?: string): number | undefined => {
    if (startDateStr && endDateStr) {
      try {
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate >= startDate) {
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays === 0 ? 1 : diffDays;
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
      const currentYear = now.getFullYear();
      const referenceNumber = `CCG-RA-${currentYear}-${String(Date.now()).slice(-5)}`;
      
      const processedAttachments: AttachmentType[] = [];
      if (data.attachments && data.attachments.length > 0) {
        for (const att of data.attachments) {
          if (att.file && att.name) { 
            try {
              const storagePath = `riskAssessments/attachments/${currentYear}/${referenceNumber}/${att.file.name}`;
              const downloadURL = await uploadFileToStorage(att.file, storagePath);
              processedAttachments.push({
                // Generate a unique ID for the attachment metadata itself
                id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, 
                name: att.file.name,
                url: downloadURL,
                type: att.file.type,
                size: att.file.size,
                uploadedAt: now.toISOString(),
                dataAiHint: att.dataAiHint,
              });
            } catch (uploadError) {
              console.error(`Error uploading attachment ${att.name}:`, uploadError);
              toast({
                title: getTranslation(T.fileUploadErrorTitle),
                description: getTranslation(T.fileUploadErrorDesc).replace('{fileName}', att.name),
                variant: "destructive",
              });
              setIsLoading(false);
              return; 
            }
          } else if (att.url && att.id) { 
             processedAttachments.push({
                id: att.id,
                name: att.name || "unknown_file",
                url: att.url,
                type: att.type || "unknown",
                size: att.size || 0,
                uploadedAt: att.uploadedAt || now.toISOString(),
                dataAiHint: att.dataAiHint,
            });
          }
        }
      }

      const assessmentDataForDB: Omit<RiskAssessment, 'id' | 'submissionDate' | 'lastModified'> = {
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
        status: 'Pending Crewing Standards and Oversight',
        attachments: processedAttachments, 
        approvalSteps: approvalLevelsOrder.map(level => ({ level } as ApprovalStep)),
        
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
        
        requestCausesVacancyElsewhere: data.requestCausesVacancyElsewhere,
        crewCompositionSufficientForSafety: data.crewCompositionSufficientForSafety,
        detailedCrewCompetencyAssessment: data.detailedCrewCompetencyAssessment || undefined,
        crewContinuityAsPerProfile: data.crewContinuityAsPerProfile,
        crewContinuityDetails: data.crewContinuityDetails || undefined,
        specialVoyageConsiderations: data.specialVoyageConsiderations || undefined,
        reductionInVesselProgramRequirements: data.reductionInVesselProgramRequirements,
        rocNotificationOfLimitations: data.rocNotificationOfLimitations,

        aiRiskScore: undefined,
        aiGeneratedSummary: undefined,
        aiSuggestedMitigations: undefined,
        aiRegulatoryConsiderations: undefined,
        aiLikelihoodScore: undefined,
        aiConsequenceScore: undefined,
      };
      
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
