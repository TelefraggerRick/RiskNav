
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import RiskAssessmentForm from "@/components/risk-assessments/RiskAssessmentForm";
import type { RiskAssessmentFormData } from "@/lib/schemas";
import { riskAssessmentFormSchema } from "@/lib/schemas";
import type { RiskAssessment, Attachment as AttachmentType } from "@/lib/types";
import { approvalLevelsOrder } from "@/lib/types"; // Import approvalLevelsOrder
import { toast } from 'sonner';
import { useUser } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAssessmentByIdFromDB, updateAssessmentInDB, uploadFileToStorage } from "@/lib/firestoreService";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Loader2, ShieldAlert, Edit as EditPageIcon } from "lucide-react"; 
import Link from "next/link";

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
  fileUploadErrorDesc: { en: "Could not upload attachment: {fileName}. Please try again.", fr: "Impossible de téléverser la pièce jointe : {fileName}. Veuillez réessayer."},
  authErrorTitle: { en: "Authentication Error", fr: "Erreur d'authentification" },
  authErrorDescRedirect: { en: "You must be logged in to edit assessments. Redirecting to login...", fr: "Vous devez être connecté pour modifier les évaluations. Redirection vers la connexion..." },
  errorFetchingAssessment: { en: "Error", fr: "Erreur" },
  failedLoadAssessmentData: { en: "Failed to load assessment data.", fr: "Échec du chargement des données de l'évaluation." },
  errorIdMissing: { en: "Assessment ID, reference number, or submission date missing.", fr: "ID d'évaluation, numéro de référence ou date de soumission manquant." },
  errorInvalidSubmissionDate: { en: "Invalid submission date for assessment. Cannot determine upload year.", fr: "Date de soumission invalide pour l'évaluation. Impossible de déterminer l'année de téléversement."},
  workflowResetToast: { en: "Workflow Reset", fr: "Réinitialisation du flux de travail"},
  workflowResetDesc: { en: "Assessment updated and workflow reset to 'Pending Crewing Standards and Oversight' due to significant changes.", fr: "L'évaluation a été mise à jour et le flux de travail réinitialisé à 'En attente Bureau de la conformité et des normes' en raison de modifications importantes."},
};

export default function EditAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, isLoadingAuth } = useUser();
  const { getTranslation } = useLanguage();

  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [initialFormValues, setInitialFormValues] = useState<Partial<RiskAssessmentFormData> | undefined>(undefined);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const assessmentId = params.id as string;

  const fetchAssessment = useCallback(async () => {
    if (isLoadingAuth || !currentUser) {
      return;
    }
    if (currentUser.uid === 'user-unauth') {
        toast.error(getTranslation(T_EDIT_PAGE.authErrorTitle), { description: getTranslation(T_EDIT_PAGE.authErrorDescRedirect) });
        router.push('/login');
        return;
    }

    if (!assessmentId) {
      setIsLoadingPageData(false);
      toast.error(getTranslation(T_EDIT_PAGE.assessmentNotFound));
      router.push("/");
      return;
    }

    setIsLoadingPageData(true);
    try {
      const fetchedAssessment = await getAssessmentByIdFromDB(assessmentId);
      if (fetchedAssessment) {
        if (currentUser.role === 'Admin' || currentUser.uid === fetchedAssessment.submittedByUid) {
          setAssessment(fetchedAssessment);
          const formValues: Partial<RiskAssessmentFormData> = {
            ...fetchedAssessment,
            attachments: fetchedAssessment.attachments.map(att => ({
              id: att.id,
              name: att.name,
              url: att.url,
              type: att.type,
              size: att.size,
              uploadedAt: att.uploadedAt,
              dataAiHint: att.dataAiHint,
            })),
          };
          setInitialFormValues(formValues);
          setAccessDenied(false);
        } else {
          setAccessDenied(true);
        }
      } else {
        toast.error(getTranslation(T_EDIT_PAGE.assessmentNotFound));
        router.push("/");
      }
    } catch (error) {
      console.error("Error fetching assessment for edit:", error);
      toast.error(getTranslation(T_EDIT_PAGE.errorFetchingAssessment), { description: getTranslation(T_EDIT_PAGE.failedLoadAssessmentData) });
      router.push("/");
    } finally {
      setIsLoadingPageData(false);
    }
  }, [assessmentId, router, currentUser, isLoadingAuth, getTranslation]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

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
    if (!assessment || !assessment.id || !assessment.referenceNumber || !assessment.submissionDate) {
        console.error("Edit Page: handleSubmit - No assessment, assessment ID, reference number, or submission date found.");
        toast.error(getTranslation(T_EDIT_PAGE.errorFetchingAssessment), { description: getTranslation(T_EDIT_PAGE.errorIdMissing) });
        return;
    }
    if (!currentUser || currentUser.uid === 'user-unauth') {
        toast.error(getTranslation(T_EDIT_PAGE.authErrorTitle), { description: getTranslation(T_EDIT_PAGE.authErrorDescRedirect) });
        setIsSubmitting(false);
        router.push('/login');
        return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const processedAttachments: AttachmentType[] = [];
      
      const submissionDateObj = new Date(assessment.submissionDate);
      if (isNaN(submissionDateObj.getTime())) {
        console.error(`Edit Page: Invalid submissionDate on assessment: ${assessment.submissionDate}`);
        toast.error(getTranslation(T_EDIT_PAGE.updateErrorTitle), { description: getTranslation(T_EDIT_PAGE.errorInvalidSubmissionDate) });
        setIsSubmitting(false);
        return;
      }
      const submissionYear = submissionDateObj.getFullYear();

      if (data.attachments && data.attachments.length > 0) {
        for (const att of data.attachments) {
          if (att.file && att.name) { 
            const storagePath = `riskAssessments/attachments/${submissionYear}/${assessment.referenceNumber}/${att.file.name}`;
            try {
              const downloadURL = await uploadFileToStorage(att.file, storagePath); 
              const newAttachment: AttachmentType = {
                id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                name: att.file.name,
                url: downloadURL,
                type: att.file.type || 'unknown',
                size: att.file.size || 0,
                uploadedAt: now.toISOString(),
              };
              if (att.dataAiHint) newAttachment.dataAiHint = att.dataAiHint;
              processedAttachments.push(newAttachment);
            } catch (uploadError: any) {
              console.error(`Edit Page: Error uploading new attachment ${att.name}:`, uploadError);
              toast.error(getTranslation(T_EDIT_PAGE.fileUploadErrorTitle), {
                description: getTranslation(T_EDIT_PAGE.fileUploadErrorDesc).replace('{fileName}', att.name) + ` (Error: ${uploadError.message})`,
              });
              setIsSubmitting(false);
              return;
            }
          } else if (att.id && att.url && att.name && att.type && att.size && att.uploadedAt) { 
            const existingAttachment: AttachmentType = {
              id: att.id, name: att.name, url: att.url, type: att.type, size: att.size, uploadedAt: att.uploadedAt,
            };
            if (att.dataAiHint) existingAttachment.dataAiHint = att.dataAiHint;
            else delete existingAttachment.dataAiHint;
            processedAttachments.push(existingAttachment);
          }
        }
      }
      
      const fieldsToUpdateFromForm: Partial<RiskAssessment> = {
        vesselName: data.vesselName, imoNumber: data.imoNumber, maritimeExemptionNumber: data.maritimeExemptionNumber, 
        department: data.department, region: data.region, patrolStartDate: data.patrolStartDate,
        patrolEndDate: data.patrolEndDate, voyageDetails: data.voyageDetails, reasonForRequest: data.reasonForRequest,
        personnelShortages: data.personnelShortages, proposedOperationalDeviations: data.proposedOperationalDeviations,
        attachments: processedAttachments, patrolLengthDays: calculatePatrolLengthDays(data.patrolStartDate, data.patrolEndDate),
        employeeName: data.employeeName, certificateHeld: data.certificateHeld, requiredCertificate: data.requiredCertificate,
        coDeptHeadSupportExemption: data.coDeptHeadSupportExemption, deptHeadConfidentInIndividual: data.deptHeadConfidentInIndividual,
        deptHeadConfidenceReason: data.deptHeadConfidenceReason, employeeFamiliarizationProvided: data.employeeFamiliarizationProvided,
        workedInDepartmentLast12Months: data.workedInDepartmentLast12Months, workedInDepartmentDetails: data.workedInDepartmentDetails,
        similarResponsibilityExperience: data.similarResponsibilityExperience, similarResponsibilityDetails: data.similarResponsibilityDetails,
        individualHasRequiredSeaService: data.individualHasRequiredSeaService, individualWorkingTowardsCertification: data.individualWorkingTowardsCertification,
        certificationProgressSummary: data.certificationProgressSummary, requestCausesVacancyElsewhere: data.requestCausesVacancyElsewhere,
        crewCompositionSufficientForSafety: data.crewCompositionSufficientForSafety, detailedCrewCompetencyAssessment: data.detailedCrewCompetencyAssessment,
        crewContinuityAsPerProfile: data.crewContinuityAsPerProfile, crewContinuityDetails: data.crewContinuityDetails,
        specialVoyageConsiderations: data.specialVoyageConsiderations, reductionInVesselProgramRequirements: data.reductionInVesselProgramRequirements,
        rocNotificationOfLimitations: data.rocNotificationOfLimitations,
      };

      // Workflow Reset Logic
      let shouldResetWorkflow = false;
      const originalAssessmentData = assessment; // The assessment state *before* form edits

      const substantiveFieldsToCompare: (keyof RiskAssessmentFormData)[] = [
        'vesselName', 'imoNumber', 'maritimeExemptionNumber', 'department', 'region',
        'patrolStartDate', 'patrolEndDate', 'voyageDetails', 'reasonForRequest',
        'personnelShortages', 'proposedOperationalDeviations',
        'employeeName', 'certificateHeld', 'requiredCertificate', 'coDeptHeadSupportExemption',
        'deptHeadConfidentInIndividual', 'deptHeadConfidenceReason', 'employeeFamiliarizationProvided',
        'workedInDepartmentLast12Months', 'workedInDepartmentDetails', 'similarResponsibilityExperience',
        'similarResponsibilityDetails', 'individualHasRequiredSeaService', 'individualWorkingTowardsCertification',
        'certificationProgressSummary', 'requestCausesVacancyElsewhere', 'crewCompositionSufficientForSafety',
        'detailedCrewCompetencyAssessment', 'crewContinuityAsPerProfile', 'crewContinuityDetails',
        'specialVoyageConsiderations', 'reductionInVesselProgramRequirements', 'rocNotificationOfLimitations'
      ];

      let hasSubstantiveChanges = false;
      for (const key of substantiveFieldsToCompare) {
        const formValue = data[key]; // 'data' is the current form submission
        const originalValue = originalAssessmentData[key as keyof RiskAssessment];
        const normalizedFormValue = (formValue === undefined || formValue === "") ? null : formValue;
        const normalizedOriginalValue = (originalValue === undefined || originalValue === "") ? null : originalValue;

        if (JSON.stringify(normalizedFormValue) !== JSON.stringify(normalizedOriginalValue)) {
          hasSubstantiveChanges = true;
          break;
        }
      }
      
      if (!hasSubstantiveChanges) {
        const originalAttachments = originalAssessmentData.attachments || [];
        if (processedAttachments.length !== originalAttachments.length) {
            hasSubstantiveChanges = true;
        } else {
            const newFilesAdded = processedAttachments.some(att => !att.id); // New files won't have an ID yet from the form
            const originalAttachmentIds = new Set(originalAttachments.map(att => att.id));
            const currentAttachmentIds = new Set(processedAttachments.filter(att => att.id).map(att => att.id));
            if (newFilesAdded || originalAttachmentIds.size !== currentAttachmentIds.size || 
                !Array.from(currentAttachmentIds).every(id => originalAttachmentIds.has(id!))) {
                hasSubstantiveChanges = true;
            }
        }
      }

      if (
        currentUser &&
        hasSubstantiveChanges &&
        originalAssessmentData.status !== 'Draft' &&
        originalAssessmentData.status !== 'Pending Crewing Standards and Oversight'
      ) {
        if (currentUser.uid === originalAssessmentData.submittedByUid || currentUser.role === 'Admin') {
          shouldResetWorkflow = true;
        }
      }

      if (shouldResetWorkflow) {
        fieldsToUpdateFromForm.status = 'Pending Crewing Standards and Oversight';
        fieldsToUpdateFromForm.approvalSteps = approvalLevelsOrder.map(level => ({
          level,
          decision: undefined,
          userId: undefined,
          userName: undefined,
          date: undefined,
          notes: undefined,
          isAgainstFSM: false,
          isAgainstMPR: false,
          isAgainstCrewingProfile: false,
        }));
        toast.info(getTranslation(T_EDIT_PAGE.workflowResetToast), {
          description: getTranslation(T_EDIT_PAGE.workflowResetDesc)
        });
      }
      
      await updateAssessmentInDB(assessment.id, fieldsToUpdateFromForm);

      toast.success(getTranslation(T_EDIT_PAGE.updateSuccessTitle), {
        description: getTranslation(T_EDIT_PAGE.updateSuccessDesc).replace('{vesselName}', data.vesselName),
      });
      router.push(`/assessments/${assessment.id}`);
    } catch (error: any) {
      console.error("Edit Page: Error updating assessment in handleSubmit catch block:", error);
      toast.error(getTranslation(T_EDIT_PAGE.updateErrorTitle), {
        description: getTranslation(T_EDIT_PAGE.updateErrorDesc) + ` (Error: ${error.message})`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth || isLoadingPageData) {
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
  
  if (!initialFormValues && !isLoadingPageData && !isLoadingAuth) {
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
