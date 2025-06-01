
"use client";

import RiskAssessmentForm from "@/components/risk-assessments/RiskAssessmentForm";
import type { RiskAssessmentFormData } from "@/lib/schemas";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { RiskAssessment, ApprovalLevel, Attachment as AttachmentType } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
import { mockRiskAssessments } from '@/lib/mockData'; 
import { useLanguage } from '@/contexts/LanguageContext'; // Added

const LOCAL_STORAGE_KEY = 'riskAssessmentsData';
const approvalLevelsOrder: ApprovalLevel[] = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];


const getAllStoredAssessments = (): RiskAssessment[] => {
  if (typeof window === 'undefined') return [...mockRiskAssessments]; 
  const storedAssessmentsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
  const storedAssessments: RiskAssessment[] = storedAssessmentsRaw ? JSON.parse(storedAssessmentsRaw) : [];
  
  const combinedAssessments = [...mockRiskAssessments];
  storedAssessments.forEach(storedAssessment => {
    const index = combinedAssessments.findIndex(mock => mock.id === storedAssessment.id);
    if (index !== -1) {
      combinedAssessments[index] = storedAssessment; 
    } else {
      combinedAssessments.push(storedAssessment); 
    }
  });
  return combinedAssessments;
};


const addNewAssessmentToStorage = (newAssessment: RiskAssessment) => {
  if (typeof window === 'undefined') return;
  const assessments = getAllStoredAssessments(); 
  
  if (assessments.some(a => a.id === newAssessment.id)) {
    console.error("Error: Duplicate ID generated for new assessment.");
    return;
  }
  
  assessments.push(newAssessment);
  const storedAssessmentsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
  const existingStoredAssessments : RiskAssessment[] = storedAssessmentsRaw ? JSON.parse(storedAssessmentsRaw) : [];
  existingStoredAssessments.push(newAssessment);

  const assessmentsToStore = existingStoredAssessments.filter(assessment => {
    const mockEquivalent = mockRiskAssessments.find(mock => mock.id === assessment.id);
    return !mockEquivalent || JSON.stringify(assessment) !== JSON.stringify(mockEquivalent);
  });
   localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(assessmentsToStore.filter((value, index, self) =>
    index === self.findIndex((t) => (
      t.id === value.id 
    ))
  )));
};


export default function NewAssessmentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useUser();
  const { getTranslation } = useLanguage(); // Added

  const T = {
    pageTitle: { en: "New Risk Assessment", fr: "Nouvelle évaluation des risques" },
    backToDashboard: { en: "Back to Dashboard", fr: "Retour au tableau de bord" },
    submitSuccessTitle: { en: "Assessment Submitted Successfully", fr: "Évaluation soumise avec succès" },
    submitSuccessDesc: { en: "Risk assessment for {vesselName} has been submitted. You will be redirected to the dashboard.", fr: "L'évaluation des risques pour {vesselName} a été soumise. Vous allez être redirigé vers le tableau de bord." },
  };


  const handleSubmit = async (data: RiskAssessmentFormData) => {
    setIsLoading(true);
    
    const now = new Date();
    const newId = `ra-${Date.now()}`; 
    
    const newAttachments: AttachmentType[] = data.attachments?.map((att, index) => ({
      id: `att-${newId}-${index}`,
      name: att.file?.name || att.name || "Unnamed File",
      url: att.file ? '#' : (att.url || '#'), 
      type: att.file?.type || att.type || "application/octet-stream",
      size: att.file?.size || att.size || 0,
      uploadedAt: now.toISOString(),
      file: att.file, 
    })) || [];

    const newAssessment: RiskAssessment = {
      id: newId,
      referenceNumber: `CCG-RA-${now.getFullYear()}-${String(Date.now()).slice(-5)}`, 
      vesselName: data.vesselName,
      imoNumber: data.imoNumber,
      department: data.department,
      region: data.region,
      voyageDetails: data.voyageDetails,
      reasonForRequest: data.reasonForRequest,
      personnelShortages: data.personnelShortages,
      proposedOperationalDeviations: data.proposedOperationalDeviations,
      attachments: newAttachments,
      
      coDeptHeadSupportExemption: data.coDeptHeadSupportExemption,
      deptHeadConfidentInIndividual: data.deptHeadConfidentInIndividual,
      deptHeadConfidenceReason: data.deptHeadConfidenceReason,
      employeeFamiliarizationProvided: data.employeeFamiliarizationProvided,
      workedInDepartmentLast12Months: data.workedInDepartmentLast12Months,
      workedInDepartmentDetails: data.workedInDepartmentDetails,
      similarResponsibilityExperience: data.similarResponsibilityExperience,
      similarResponsibilityDetails: data.similarResponsibilityDetails,
      individualHasRequiredSeaService: data.individualHasRequiredSeaService,
      individualWorkingTowardsCertification: data.individualWorkingTowardsCertification,
      certificationProgressSummary: data.certificationProgressSummary,

      requestCausesVacancyElsewhere: data.requestCausesVacancyElsewhere,
      crewCompositionSufficientForSafety: data.crewCompositionSufficientForSafety,
      detailedCrewCompetencyAssessment: data.detailedCrewCompetencyAssessment,
      crewContinuityAsPerProfile: data.crewContinuityAsPerProfile,
      crewContinuityDetails: data.crewContinuityDetails,
      specialVoyageConsiderations: data.specialVoyageConsiderations,
      reductionInVesselProgramRequirements: data.reductionInVesselProgramRequirements,
      rocNotificationOfLimitations: data.rocNotificationOfLimitations,

      submittedBy: currentUser.name, 
      submissionDate: now.toISOString(),
      submissionTimestamp: now.getTime(),
      status: 'Pending Crewing Standards and Oversight',
      approvalSteps: approvalLevelsOrder.map(level => ({ level })), 
      lastModified: now.toISOString(),
      lastModifiedTimestamp: now.getTime(),
    };

    addNewAssessmentToStorage(newAssessment);

    setIsLoading(false);
    toast({
      title: getTranslation(T.submitSuccessTitle),
      description: getTranslation(T.submitSuccessDesc).replace('{vesselName}', data.vesselName),
      variant: "default",
    });
    
    setTimeout(() => router.push("/"), 2000);
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
