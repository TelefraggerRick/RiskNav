
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import RiskAssessmentForm from "@/components/risk-assessments/RiskAssessmentForm";
import type { RiskAssessmentFormData } from "@/lib/schemas";
import type { RiskAssessment, Attachment as AttachmentType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAssessmentByIdFromDB, updateAssessmentInDB, uploadFileToStorage } from "@/lib/firestoreService";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Loader2, ShieldAlert, Edit as EditPageIcon } from "lucide-react"; // Renamed Edit icon
import Link from "next/link";
import { doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const T_EDIT_PAGE = {
  pageTitle: { en: "Edit Risk Assessment", fr: "Modifier l'évaluation des risques" },
  loadingAssessment: { en: "Loading assessment data...", fr: "Chargement des données de l'évaluation..." },
  assessmentNotFound: { en: "Assessment Not Found", fr: "Évaluation non trouvée" },
  accessDeniedTitle: { en: "Access Denied", fr: "Accès refusé" },
  accessDeniedDesc: { en: "You do not have permission to edit this risk assessment.", fr: "Vous n'avez pas la permission de modifier cette évaluation des risques." },
  backToDashboard: { en: "Back to Dashboard", fr: "Retour au tableau de bord" },
  viewAssessment: { en: "View Assessment", fr: "Voir l'évaluation" },
  updateSuccessTitle: { en: "Assessment Updated", fr: "Évaluation mise à jour" },
  updateSuccessDesc: { en: "Risk assessment for {vesselName} has been updated.", fr: "L'évaluation des risques pour {vesselName} a été mise à jour." },
  updateErrorTitle: { en: "Update Failed", fr: "Échec de la mise à jour" },
  updateErrorDesc: { en: "Could not update the risk assessment. Please try again.", fr: "Impossible de mettre à jour l'évaluation des risques. Veuillez réessayer." },
  fileUploadErrorTitle: { en: "File Upload Failed", fr: "Échec du téléversement de fichier" },
  fileUploadErrorDesc: { en: "Could not upload attachment: {fileName}. Please try again.", fr: "Impossible de téléverser la pièce jointe : {fileName}. Veuillez réessayer."}
};

export default function EditAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useUser();
  const { getTranslation } = useLanguage();

  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [initialFormValues, setInitialFormValues] = useState<Partial<RiskAssessmentFormData> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const assessmentId = params.id as string;

  const fetchAssessment = useCallback(async () => {
    if (!assessmentId) {
      setIsLoading(false);
      toast({ title: getTranslation(T_EDIT_PAGE.assessmentNotFound), variant: "destructive" });
      router.push("/");
      return;
    }

    setIsLoading(true);
    try {
      const fetchedAssessment = await getAssessmentByIdFromDB(assessmentId);
      if (fetchedAssessment) {
        // IMPORTANT: Access control check
        if (currentUser.role === 'Admin' || currentUser.name === fetchedAssessment.submittedBy) {
          setAssessment(fetchedAssessment);
          const formValues: Partial<RiskAssessmentFormData> = {
            ...fetchedAssessment, // Spread all fields from RiskAssessment
            // Ensure attachments are mapped correctly for the form, including all necessary fields for existing ones
            attachments: fetchedAssessment.attachments.map(att => ({
              id: att.id,
              name: att.name,
              url: att.url,
              type: att.type,
              size: att.size,
              uploadedAt: att.uploadedAt,
              dataAiHint: att.dataAiHint,
              // 'file' property will be undefined for existing attachments from DB
            })),
          };
          setInitialFormValues(formValues);
          setAccessDenied(false);
        } else {
          setAccessDenied(true);
        }
      } else {
        toast({ title: getTranslation(T_EDIT_PAGE.assessmentNotFound), variant: "destructive" });
        router.push("/");
      }
    } catch (error) {
      console.error("Error fetching assessment for edit:", error);
      toast({ title: "Error", description: "Failed to load assessment data.", variant: "destructive" });
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId, router, toast, currentUser, getTranslation]);

  useEffect(() => {
    if (currentUser.id === 'user-unauth') { 
        router.push('/login');
        return;
    }
    fetchAssessment();
  }, [fetchAssessment, currentUser, router]);

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
    if (!assessment || !assessment.id) return;
    if (currentUser.id === 'user-unauth') {
        toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const processedAttachments: AttachmentType[] = [];

      if (data.attachments && data.attachments.length > 0) {
        for (const att of data.attachments) {
          if (att.file && att.name) { // New file to upload
            try {
              const storagePath = `riskAssessments/attachments/${assessment.id}/${att.file.name}`;
              const downloadURL = await uploadFileToStorage(att.file, storagePath);
              processedAttachments.push({
                id: doc(collection(db, '_temp')).id,
                name: att.file.name,
                url: downloadURL,
                type: att.file.type,
                size: att.file.size,
                uploadedAt: now.toISOString(),
                dataAiHint: att.dataAiHint,
              });
            } catch (uploadError) {
              console.error(`Error uploading new attachment ${att.name}:`, uploadError);
              toast({
                title: getTranslation(T_EDIT_PAGE.fileUploadErrorTitle),
                description: getTranslation(T_EDIT_PAGE.fileUploadErrorDesc).replace('{fileName}', att.name),
                variant: "destructive",
              });
              setIsSubmitting(false);
              return;
            }
          } else if (att.id && att.url && att.name && att.type && att.size && att.uploadedAt) { // Existing attachment to keep
            processedAttachments.push({
              id: att.id,
              name: att.name,
              url: att.url,
              type: att.type,
              size: att.size,
              uploadedAt: att.uploadedAt,
              dataAiHint: att.dataAiHint,
            });
          }
        }
      }
      
      const fieldsToUpdateFromForm: Partial<RiskAssessment> = {
        vesselName: data.vesselName,
        imoNumber: data.imoNumber, // Keep empty string if provided, or undefined if not
        maritimeExemptionNumber: data.maritimeExemptionNumber, // Keep empty string if provided, or undefined if not
        department: data.department,
        region: data.region,
        patrolStartDate: data.patrolStartDate || undefined,
        patrolEndDate: data.patrolEndDate || undefined,
        voyageDetails: data.voyageDetails,
        reasonForRequest: data.reasonForRequest,
        personnelShortages: data.personnelShortages,
        proposedOperationalDeviations: data.proposedOperationalDeviations,
        attachments: processedAttachments,
        patrolLengthDays: calculatePatrolLengthDays(data.patrolStartDate, data.patrolEndDate),
        employeeName: data.employeeName, // Keep empty string if provided, or undefined if not
        certificateHeld: data.certificateHeld, // Keep empty string if provided, or undefined if not
        requiredCertificate: data.requiredCertificate, // Keep empty string if provided, or undefined if not
        coDeptHeadSupportExemption: data.coDeptHeadSupportExemption,
        deptHeadConfidentInIndividual: data.deptHeadConfidentInIndividual,
        deptHeadConfidenceReason: data.deptHeadConfidenceReason, // Keep empty string if provided, or undefined if not
        employeeFamiliarizationProvided: data.employeeFamiliarizationProvided,
        workedInDepartmentLast12Months: data.workedInDepartmentLast12Months,
        workedInDepartmentDetails: data.workedInDepartmentDetails, // Keep empty string if provided, or undefined if not
        similarResponsibilityExperience: data.similarResponsibilityExperience,
        similarResponsibilityDetails: data.similarResponsibilityDetails, // Keep empty string if provided, or undefined if not
        individualHasRequiredSeaService: data.individualHasRequiredSeaService,
        individualWorkingTowardsCertification: data.individualWorkingTowardsCertification,
        certificationProgressSummary: data.certificationProgressSummary, // Keep empty string if provided, or undefined if not
        requestCausesVacancyElsewhere: data.requestCausesVacancyElsewhere,
        crewCompositionSufficientForSafety: data.crewCompositionSufficientForSafety,
        detailedCrewCompetencyAssessment: data.detailedCrewCompetencyAssessment, // Keep empty string if provided, or undefined if not
        crewContinuityAsPerProfile: data.crewContinuityAsPerProfile,
        crewContinuityDetails: data.crewContinuityDetails, // Keep empty string if provided, or undefined if not
        specialVoyageConsiderations: data.specialVoyageConsiderations, // Keep empty string if provided, or undefined if not
        reductionInVesselProgramRequirements: data.reductionInVesselProgramRequirements,
        rocNotificationOfLimitations: data.rocNotificationOfLimitations,
        // lastModified will be handled by updateAssessmentInDB with serverTimestamp
      };

      await updateAssessmentInDB(assessment.id, fieldsToUpdateFromForm);

      toast({
        title: getTranslation(T_EDIT_PAGE.updateSuccessTitle),
        description: getTranslation(T_EDIT_PAGE.updateSuccessDesc).replace('{vesselName}', data.vesselName),
      });
      router.push(`/assessments/${assessment.id}`);
    } catch (error) {
      console.error("Error updating assessment:", error);
      toast({
        title: getTranslation(T_EDIT_PAGE.updateErrorTitle),
        description: getTranslation(T_EDIT_PAGE.updateErrorDesc),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-xl text-muted-foreground">{getTranslation(T_EDIT_PAGE.loadingAssessment)}</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4 text-center">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{getTranslation(T_EDIT_PAGE.accessDeniedTitle)}</AlertTitle>
          <AlertDescription>{getTranslation(T_EDIT_PAGE.accessDeniedDesc)}</AlertDescription>
        </Alert>
        <div className="flex gap-4 mt-4">
            <Button variant="outline" asChild>
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {getTranslation(T_EDIT_PAGE.backToDashboard)}
                </Link>
            </Button>
            {assessmentId && (
                 <Button variant="default" asChild>
                    <Link href={`/assessments/${assessmentId}`}>
                        {getTranslation(T_EDIT_PAGE.viewAssessment)}
                    </Link>
                </Button>
            )}
        </div>
      </div>
    );
  }
  
  if (!initialFormValues && !isLoading) {
     return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4 text-center">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{getTranslation(T_EDIT_PAGE.assessmentNotFound)}</AlertTitle>
        </Alert>
        <Button variant="outline" asChild>
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {getTranslation(T_EDIT_PAGE.backToDashboard)}
            </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <EditPageIcon className="h-7 w-7" />
            {getTranslation(T_EDIT_PAGE.pageTitle)} {(assessment && assessment.vesselName) ? `- ${assessment.vesselName}`: ""}
        </h1>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
            <Link href={assessmentId ? `/assessments/${assessmentId}` : '/'}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {assessmentId ? getTranslation(T_EDIT_PAGE.viewAssessment) : getTranslation(T_EDIT_PAGE.backToDashboard)}
            </Link>
            </Button>
        </div>
      </div>
      {initialFormValues && (
        <RiskAssessmentForm
          onSubmit={handleSubmit}
          initialData={initialFormValues}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}
