
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
import { mockRiskAssessments } from '@/lib/mockData'; // To get initial approval steps structure

const LOCAL_STORAGE_KEY = 'riskAssessmentsData';
const approvalLevelsOrder: ApprovalLevel[] = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];


// Helper to get all assessments (mock + localStorage)
const getAllStoredAssessments = (): RiskAssessment[] => {
  if (typeof window === 'undefined') return [...mockRiskAssessments]; // Fallback for SSR or if localStorage is not available
  const storedAssessmentsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
  const storedAssessments: RiskAssessment[] = storedAssessmentsRaw ? JSON.parse(storedAssessmentsRaw) : [];
  
  const combinedAssessments = [...mockRiskAssessments];
  storedAssessments.forEach(storedAssessment => {
    const index = combinedAssessments.findIndex(mock => mock.id === storedAssessment.id);
    if (index !== -1) {
      combinedAssessments[index] = storedAssessment; // Replace mock with stored if ID matches
    } else {
      combinedAssessments.push(storedAssessment); // Add new assessment from storage
    }
  });
  return combinedAssessments;
};


// Helper function to save a new assessment
const addNewAssessmentToStorage = (newAssessment: RiskAssessment) => {
  if (typeof window === 'undefined') return;
  const assessments = getAllStoredAssessments(); // Get all, including mocks and existing stored
  
  // Ensure no ID collision (though unlikely with timestamp-based ID)
  if (assessments.some(a => a.id === newAssessment.id)) {
    console.error("Error: Duplicate ID generated for new assessment.");
    // Potentially regenerate ID or handle error
    return;
  }
  
  assessments.push(newAssessment);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(assessments.filter(a => !mockRiskAssessments.find(m => m.id === a.id) || storedAssessmentsRaw.includes(a.id))));
  // Correction: Only store items not in original mock or explicitly from storage previously
  const storedAssessmentsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
  const existingStoredAssessments : RiskAssessment[] = storedAssessmentsRaw ? JSON.parse(storedAssessmentsRaw) : [];
  existingStoredAssessments.push(newAssessment);

  // Filter out mock assessments that haven't been modified from the array before saving to localStorage
  // This ensures localStorage only contains *new* or *modified* assessments
  const assessmentsToStore = existingStoredAssessments.filter(assessment => {
    const mockEquivalent = mockRiskAssessments.find(mock => mock.id === assessment.id);
    // If it's not in mock, it's new, store it.
    // If it is in mock, only store it if it's different from the mock version (which it will be if new, or if modified)
    // For new items, this logic is fine. For modified items, comparison might be needed, but adding is simpler now.
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

  const handleSubmit = async (data: RiskAssessmentFormData) => {
    setIsLoading(true);
    
    const now = new Date();
    const newId = `ra-${Date.now()}`; // Simple unique ID generation
    
    const newAttachments: AttachmentType[] = data.attachments?.map((att, index) => ({
      id: `att-${newId}-${index}`,
      name: att.file?.name || att.name || "Unnamed File",
      // For new files, URL would be set after upload to a storage service.
      // For this mock, we'll leave it as '#' or use a placeholder if it was a File object.
      url: att.file ? '#' : (att.url || '#'), 
      type: att.file?.type || att.type || "application/octet-stream",
      size: att.file?.size || att.size || 0,
      uploadedAt: now.toISOString(),
      file: att.file, // Keep the File object if it exists, for potential future use
    })) || [];

    const newAssessment: RiskAssessment = {
      id: newId,
      referenceNumber: `CCG-RA-${now.getFullYear()}-${String(Date.now()).slice(-5)}`, // More dynamic ref number
      vesselName: data.vesselName,
      department: data.department,
      region: data.region,
      voyageDetails: data.voyageDetails,
      reasonForRequest: data.reasonForRequest,
      personnelShortages: data.personnelShortages,
      proposedOperationalDeviations: data.proposedOperationalDeviations,
      attachments: newAttachments,
      
      // Exemption & Individual Assessment fields
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

      // Crew & Voyage Considerations
      requestCausesVacancyElsewhere: data.requestCausesVacancyElsewhere,
      crewCompositionSufficientForSafety: data.crewCompositionSufficientForSafety,
      detailedCrewCompetencyAssessment: data.detailedCrewCompetencyAssessment,
      crewContinuityAsPerProfile: data.crewContinuityAsPerProfile,
      crewContinuityDetails: data.crewContinuityDetails,
      specialVoyageConsiderations: data.specialVoyageConsiderations,
      reductionInVesselProgramRequirements: data.reductionInVesselProgramRequirements,
      rocNotificationOfLimitations: data.rocNotificationOfLimitations,

      submittedBy: currentUser.name, // Use current user's name
      submissionDate: now.toISOString(),
      submissionTimestamp: now.getTime(),
      status: 'Pending Crewing Standards and Oversight',
      approvalSteps: approvalLevelsOrder.map(level => ({ level })), // Initialize approval steps
      lastModified: now.toISOString(),
      lastModifiedTimestamp: now.getTime(),
      // AI fields will be populated later if needed
    };

    addNewAssessmentToStorage(newAssessment);

    setIsLoading(false);
    toast({
      title: "Assessment Submitted Successfully",
      description: `Risk assessment for ${data.vesselName} has been submitted. You will be redirected to the dashboard.`,
      variant: "default",
    });
    
    setTimeout(() => router.push("/"), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
       <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">New Risk Assessment</h1>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <RiskAssessmentForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
