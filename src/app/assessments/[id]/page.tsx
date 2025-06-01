
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { RiskAssessment, Attachment, ApprovalStep, ApprovalDecision, ApprovalLevel, RiskAssessmentStatus, YesNoOptional } from '@/lib/types';
// import { mockRiskAssessments } from '@/lib/mockData'; // No longer primary source
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Ship, FileText, CalendarDays, Download, AlertTriangle, CheckCircle2, XCircle, Info, Clock, Bot, ShieldCheck, ThumbsUp, ThumbsDown, MessageSquare, BrainCircuit, UserCircle as UserCircleIcon, Users, FileWarning, ArrowLeft, ChevronRight, Hourglass, Building, UserCheck as UserCheckLucideIcon, Edit, HelpCircle, ClipboardList, CheckSquare, Square, Sailboat, UserCog, Anchor, Globe, Lock, Fingerprint, BarChartBig, CalendarClock, User, Award, FileCheck2, Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { generateRiskAssessmentSummary } from '@/ai/flows/generate-risk-assessment-summary';
import { generateRiskScoreAndRecommendations } from '@/ai/flows/generate-risk-score-and-recommendations';
import { cn } from "@/lib/utils";
import { useUser } from '@/contexts/UserContext';
import ApprovalDialog from '@/components/risk-assessments/ApprovalDialog';
import RiskMatrix from '@/components/risk-assessments/RiskMatrix';
import { useLanguage } from '@/contexts/LanguageContext'; 
import { getRiskAssessmentById, updateRiskAssessment } from '@/services/riskAssessmentService'; // Import Firestore service

// LOCAL_STORAGE_KEY no longer needed

const approvalLevelsOrder: ApprovalLevel[] = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];

const T_DETAILS_PAGE = {
  backToDashboard: { en: "Back to Dashboard", fr: "Retour au tableau de bord" },
  imo: { en: "IMO", fr: "IMO" },
  maritimeExemptionNumber: { en: "Maritime Exemption #", fr: "N° d'exemption maritime" },
  lastModified: { en: "Last Modified", fr: "Dernière modification" },
  at: { en: "at", fr: "à" },
  vesselOverview: { en: "Vessel & Assessment Overview", fr: "Aperçu du navire et de l'évaluation" },
  submittedBy: { en: "Submitted By", fr: "Soumis par" },
  submissionDate: { en: "Submission Date", fr: "Date de soumission" },
  imoNumber: { en: "IMO Number", fr: "Numéro IMO" },
  department: { en: "Department", fr: "Département" },
  region: { en: "Region", fr: "Région" },
  patrolStartDate: { en: "Patrol Start Date", fr: "Date de début de patrouille" },
  patrolEndDate: { en: "Patrol End Date", fr: "Date de fin de patrouille" },
  patrolLength: { en: "Length of Patrol", fr: "Durée de la patrouille" },
  days: { en: "days", fr: "jours" },
  voyageDetails: { en: "Voyage Details", fr: "Détails du voyage" },
  reasonForRequest: { en: "Reason for Request", fr: "Raison de la demande" },
  personnelShortages: { en: "Personnel Shortages & Impact", fr: "Pénuries de personnel et impact" },
  proposedDeviations: { en: "Proposed Deviations/Mitigations", fr: "Dérogations/Mesures d'atténuation proposées" },
  exemptionIndividualAssessment: { en: "Exemption & Individual Assessment", fr: "Exemption et évaluation individuelle" },
  employeeName: { en: "Employee Name", fr: "Nom de l'employé" },
  certificateHeld: { en: "Certificate Held", fr: "Certificat détenu" },
  requiredCertificate: { en: "Required Certificate", fr: "Certificat requis" },
  coSupportExemption: { en: "CO & Dept. Head Support Exemption", fr: "Soutien de l'exemption par le commandant et le chef de département" },
  deptHeadConfident: { en: "Dept. Head Confident in Individual", fr: "Chef de département confiant envers l'individu" },
  reasonForConfidence: { en: "Reason for Dept. Head Confidence", fr: "Raison de la confiance du chef de département" },
  familiarizationProvided: { en: "Employee Familiarization Provided", fr: "Familiarisation de l'employé fournie" },
  workedInDeptLast12Months: { en: "Worked in Dept. (Last 12 Months)", fr: "A travaillé dans le département (12 derniers mois)" },
  positionAndDuration: { en: "Position and Duration", fr: "Poste et durée" },
  similarExperience: { en: "Similar Responsibility Experience", fr: "Expérience de responsabilité similaire" },
  detailsSimilarResponsibility: { en: "Details of Similar Responsibility", fr: "Détails de la responsabilité similaire" },
  hasRequiredSeaService: { en: "Has Required Sea Service", fr: "Possède le service en mer requis" },
  workingTowardsCert: { en: "Working Towards Certification", fr: "Travaille à l'obtention de la certification" },
  certProgressSummary: { en: "Certification Progress Summary", fr: "Résumé des progrès de la certification" },
  operationalConsiderations: { en: "Operational Considerations (Crew & Voyage)", fr: "Considérations opérationnelles (Équipage et voyage)" },
  crewTeamConsiderations: { en: "Crew/Team Considerations", fr: "Considérations relatives à l'équipage/l'équipe" },
  requestCausesVacancy: { en: "Request Causes Vacancy Elsewhere", fr: "La demande cause un poste vacant ailleurs" },
  crewSufficientForSafety: { en: "Crew Composition Sufficient for Safety", fr: "Composition de l'équipage suffisante pour la sécurité" },
  detailedCrewCompetency: { en: "Detailed Crew Competency Assessment", fr: "Évaluation détaillée des compétences de l'équipage" },
  crewContinuityProfile: { en: "Crew Continuity as per Profile", fr: "Continuité de l'équipage selon le profil" },
  crewContinuityDetails: { en: "Crew Continuity Details", fr: "Détails de la continuité de l'équipage" },
  voyageConsiderations: { en: "Voyage Considerations", fr: "Considérations relatives au voyage" },
  specialVoyageConsiderations: { en: "Special Voyage Considerations", fr: "Considérations spéciales relatives au voyage" },
  programReduction: { en: "Reduction in Vessel Program Requirements", fr: "Réduction des exigences du programme du navire" },
  rocNotified: { en: "ROC/JRCC Notified of Limitations", fr: "CRO/JRCC informé des limitations" },
  attachments: { en: "Attachments", fr: "Pièces jointes" },
  download: { en: "Download", fr: "Télécharger" },
  noAttachments: { en: "No attachments for this assessment.", fr: "Aucune pièce jointe pour cette évaluation." },
  aiInsights: { en: "AI Insights", fr: "Perspectives de l'IA" },
  generateSummary: { en: "Generate Summary", fr: "Générer un résumé" },
  summaryGenerated: { en: "Summary Generated", fr: "Résumé généré" },
  generating: { en: "Generating...", fr: "Génération en cours..." },
  assessRiskMitigations: { en: "Assess Risk & Mitigations", fr: "Évaluer les risques et les mesures d'atténuation" },
  analysisComplete: { en: "Analysis Complete", fr: "Analyse terminée" },
  analyzing: { en: "Analyzing...", fr: "Analyse en cours..." },
  aiGeneratedSummary: { en: "AI Generated Summary", fr: "Résumé généré par l'IA" },
  aiRiskScore: { en: "AI Risk Score", fr: "Score de risque IA" },
  suggestedMitigations: { en: "Suggested Mitigations:", fr: "Mesures d'atténuation suggérées :" },
  regulatoryConsiderations: { en: "Regulatory Considerations:", fr: "Considérations réglementaires :" },
  runAiTools: { en: "Run AI tools to generate summaries, risk scores, and suggested mitigations.", fr: "Exécutez les outils d'IA pour générer des résumés, des scores de risque et des mesures d'atténuation suggérées." },
  approvalWorkflow: { en: "Approval Workflow", fr: "Flux d'approbation" },
  by: { en: "By:", fr: "Par :" },
  date: { en: "Date:", fr: "Date :" },
  notes: { en: "Notes:", fr: "Notes :" },
  pendingAction: { en: "Pending Action", fr: "Action en attente" },
  queued: { en: "Queued", fr: "En attente" },
  actionsFor: { en: "Actions for {level}:", fr: "Actions pour {level} :" },
  approve: { en: "Approve", fr: "Approuver" },
  reject: { en: "Reject", fr: "Rejeter" },
  requestInformation: { en: "Request Information", fr: "Demander des informations" },
  actionRequiredByAnotherRole: { en: "Action Required by Another Role", fr: "Action requise par un autre rôle" },
  actionRequiredDesc: { en: "Your current role ({currentUserRole}) does not match the required role for this action ({requiredRole}).", fr: "Votre rôle actuel ({currentUserRole}) ne correspond pas au rôle requis pour cette action ({requiredRole})." },
  assessmentFullyApproved: { en: "Assessment Fully Approved", fr: "Évaluation entièrement approuvée" },
  assessmentFullyApprovedDesc: { en: "This risk assessment has been approved by all required levels.", fr: "Cette évaluation des risques a été approuvée par tous les niveaux requis." },
  assessmentRejected: { en: "Assessment Rejected", fr: "Évaluation rejetée" },
  assessmentRejectedDesc: { en: "This risk assessment was rejected at the {level} stage. See details in the workflow steps above.", fr: "Cette évaluation des risques a été rejetée à l'étape {level}. Voir les détails dans les étapes du flux de travail ci-dessus." },
  informationRequested: { en: "Information Requested", fr: "Informations demandées" },
  informationRequestedDesc: { en: "Further information was requested at the {level} stage. See notes in the relevant step.", fr: "Des informations supplémentaires ont été demandées à l'étape {level}. Voir les notes dans l'étape correspondante." },
  awaitingInitialReview: { en: "This assessment is awaiting initial review.", fr: "Cette évaluation est en attente d'examen initial." },
  loadingAssessment: { en: "Loading Assessment Details...", fr: "Chargement des détails de l'évaluation..." },
  assessmentNotFound: { en: "Assessment Not Found", fr: "Évaluation non trouvée" },
  assessmentNotFoundDesc: { en: "The requested risk assessment could not be found.", fr: "L'évaluation des risques demandée n'a pas pu être trouvée." },
  returnToDashboard: { en: "Return to Dashboard", fr: "Retour au tableau de bord" },
  error: { en: "Error", fr: "Erreur" },
  assessmentNotFoundToast: { en: "Assessment not found.", fr: "Évaluation non trouvée." },
  aiSummaryGenerated: { en: "AI Summary Generated", fr: "Résumé IA généré" },
  aiSummaryAdded: { en: "Summary has been added.", fr: "Le résumé a été ajouté." },
  aiError: { en: "AI Error", fr: "Erreur IA" },
  failedToGenerateSummary: { en: "Failed to generate summary.", fr: "Échec de la génération du résumé." },
  aiRiskScoreGenerated: { en: "AI Risk Score & Recommendations Generated", fr: "Score de risque IA et recommandations générés" },
  failedToGenerateRiskScore: { en: "Failed to generate risk score and recommendations.", fr: "Échec de la génération du score de risque et des recommandations." },
  assessmentActionToastTitle: { en: "Assessment {decision}", fr: "Évaluation {decision}" },
  assessmentActionToastDesc: { en: "The assessment has been {decision} with your notes.", fr: "L'évaluation a été {decision} avec vos notes." },
  na: { en: "N/A", fr: "S.O." },
  updateError: { en: "Update Error", fr: "Erreur de mise à jour" },
  failedToUpdateAssessment: { en: "Failed to update assessment in the database.", fr: "Échec de la mise à jour de l'évaluation dans la base de données." },
};


// Functions like getAllAssessments, getAssessmentById, saveAssessmentUpdate are now handled by riskAssessmentService.ts

const handleDownloadAttachment = (attachment: Attachment) => {
  // For Firestore, URL should always be present (Cloud Storage URL)
  if (attachment.url && attachment.url !== '#') {
     window.open(attachment.url, '_blank');
  } else {
    alert(`Download link for ${attachment.name} is not available.`);
  }
};

const SectionTitle: React.FC<{ icon: React.ElementType; title: string; className?: string }> = React.memo(({ icon: Icon, title, className }) => (
  <h3 className={cn("text-lg font-semibold mb-4 text-foreground flex items-center gap-2 pt-1", className)}>
    <Icon className="h-5 w-5 text-primary" />
    {title}
  </h3>
));
SectionTitle.displayName = 'SectionTitle';

const DetailItem: React.FC<{ label: string; value?: React.ReactNode | string | null | YesNoOptional; isPreformatted?: boolean; fullWidth?: boolean; icon?: React.ElementType }> = React.memo(({ label, value, isPreformatted = false, fullWidth = false, icon: Icon }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <strong className="font-medium text-muted-foreground block mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground"/>}
        {label}:
      </strong>
      {isPreformatted && typeof value === 'string' ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{value}</p> : <div className="text-sm leading-relaxed">{value}</div>}
    </div>
  );
});
DetailItem.displayName = 'DetailItem';

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useUser();
  const { getTranslation } = useLanguage(); 
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState<Partial<Record<'summary' | 'riskScore', boolean>>>({});
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [currentDecision, setCurrentDecision] = useState<ApprovalDecision | undefined>(undefined);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const fetchAssessment = useCallback(async () => {
    if (params.id) {
      setIsLoading(true);
      try {
        const foundAssessment = await getRiskAssessmentById(params.id as string);
        if (foundAssessment) {
          const populatedAssessment = {
            ...foundAssessment,
            approvalSteps: foundAssessment.approvalSteps && foundAssessment.approvalSteps.length > 0 
              ? foundAssessment.approvalSteps 
              : approvalLevelsOrder.map(level => ({ level } as ApprovalStep)) 
          };
          setAssessment(populatedAssessment);
        } else {
          toast({ title: getTranslation(T_DETAILS_PAGE.error), description: getTranslation(T_DETAILS_PAGE.assessmentNotFoundToast), variant: "destructive" });
          router.push('/');
        }
      } catch (error) {
        console.error("Error fetching assessment:", error);
        toast({ title: getTranslation(T_DETAILS_PAGE.error), description: (error as Error).message, variant: "destructive" });
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    }
  }, [params.id, router, toast, getTranslation]); 

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  const runAiSummary = useCallback(async () => {
    if (!assessment) return;
    setIsAiLoading(prev => ({...prev, summary: true}));
    try {
      const summaryResult = await generateRiskAssessmentSummary({
        vesselInformation: `Name: ${assessment.vesselName}, Region: ${assessment.region || 'N/A'}`,
        imoNumber: assessment.imoNumber,
        personnelShortages: assessment.personnelShortages,
        proposedOperationalDeviations: assessment.proposedOperationalDeviations,
        additionalDetails: `Voyage: ${assessment.voyageDetails}. Reason: ${assessment.reasonForRequest}`
      });
      
      const updates: Partial<RiskAssessment> = { 
        aiGeneratedSummary: summaryResult.summary, 
        lastModified: new Date().toISOString(), // Will be replaced by serverTimestamp by service
      };
      await updateRiskAssessment(assessment.id, updates);
      setAssessment(prev => prev ? {...prev, ...updates, aiGeneratedSummary: summaryResult.summary} : null); // Optimistic update
      
      toast({ title: getTranslation(T_DETAILS_PAGE.aiSummaryGenerated), description: getTranslation(T_DETAILS_PAGE.aiSummaryAdded) });
    } catch (error) {
      console.error("AI Summary Error:", error);
      toast({ title: getTranslation(T_DETAILS_PAGE.aiError), description: getTranslation(T_DETAILS_PAGE.failedToGenerateSummary), variant: "destructive" });
    }
    setIsAiLoading(prev => ({...prev, summary: false}));
  }, [assessment, toast, getTranslation]);
  
  const runAiRiskScoreAndRecommendations = useCallback(async () => {
    if (!assessment) return;
    setIsAiLoading(prev => ({...prev, riskScore: true}));
    try {
      const result = await generateRiskScoreAndRecommendations({
        vesselInformation: `Name: ${assessment.vesselName}. Voyage: ${assessment.voyageDetails}. Region: ${assessment.region || 'N/A'}`,
        imoNumber: assessment.imoNumber,
        personnelShortages: assessment.personnelShortages,
        operationalDeviations: assessment.proposedOperationalDeviations,
        attachedDocuments: assessment.attachments.map(a => a.url || a.name), 
      });
      
      const updates: Partial<RiskAssessment> = { 
        aiRiskScore: result.riskScore,
        aiLikelihoodScore: result.likelihoodScore,
        aiConsequenceScore: result.consequenceScore,
        aiSuggestedMitigations: result.recommendations,
        aiRegulatoryConsiderations: result.regulatoryConsiderations,
        lastModified: new Date().toISOString(), // Will be replaced by serverTimestamp
      };
      await updateRiskAssessment(assessment.id, updates);
      setAssessment(prev => prev ? {...prev, ...updates} : null); // Optimistic update

      toast({ title: getTranslation(T_DETAILS_PAGE.aiRiskScoreGenerated) });
    } catch (error) {
      console.error("AI Risk Score Error:", error);
      toast({ title: getTranslation(T_DETAILS_PAGE.aiError), description: getTranslation(T_DETAILS_PAGE.failedToGenerateRiskScore), variant: "destructive" });
    }
    setIsAiLoading(prev => ({...prev, riskScore: false}));
  }, [assessment, toast, getTranslation]);

  const getCurrentApprovalStepInfo = useCallback(() => {
    if (!assessment || !currentUser) return { currentLevelToAct: null, canAct: false, isHalted: false, userIsApproverForCurrentStep: false, overallStatus: assessment?.status };
    
    let currentLevelToAct: ApprovalLevel | null = null;
    let isHalted = false;
    let overallStatus: RiskAssessmentStatus = assessment.status;

    for (const level of approvalLevelsOrder) {
      const step = assessment.approvalSteps.find(s => s.level === level);
      if (!step || !step.decision) {
        currentLevelToAct = level;
        break;
      }
      if (step.decision === 'Rejected' || step.decision === 'Needs Information') {
        currentLevelToAct = level; 
        isHalted = true;
        overallStatus = step.decision === 'Rejected' ? 'Rejected' : 'Needs Information';
        break;
      }
    }
     if (!currentLevelToAct && assessment.approvalSteps.every(s => s.decision === 'Approved')) {
      overallStatus = 'Approved';
    }
    
    const userIsApproverForCurrentStep = currentUser.role === currentLevelToAct;
    const canAct = !!currentLevelToAct && !isHalted && userIsApproverForCurrentStep;

    return { currentLevelToAct, canAct, isHalted, userIsApproverForCurrentStep, overallStatus };
  }, [assessment, currentUser]);
  
  const { currentLevelToAct, canAct: userCanActOnCurrentStep, isHalted } = getCurrentApprovalStepInfo();

  const handleOpenApprovalDialog = useCallback((decision: ApprovalDecision) => {
    setCurrentDecision(decision);
    setIsApprovalDialogOpen(true);
  }, []);

  const handleApprovalAction = useCallback(async (notes: string) => {
    if (!assessment || !currentLevelToAct || !currentUser || !currentDecision) return;

    setIsSubmittingApproval(true);

    const nowISO = new Date().toISOString();

    const updatedApprovalSteps = assessment.approvalSteps.map(step =>
      step.level === currentLevelToAct
        ? { ...step, decision: currentDecision, userName: currentUser.name, date: nowISO, notes }
        : step
    );

    let newStatus: RiskAssessmentStatus = assessment.status;
    if (currentDecision === 'Approved') {
      const currentIndex = approvalLevelsOrder.indexOf(currentLevelToAct);
      if (currentIndex === approvalLevelsOrder.length - 1) {
        newStatus = 'Approved';
      } else {
        const nextLevel = approvalLevelsOrder[currentIndex + 1];
        newStatus = `Pending ${nextLevel}` as RiskAssessmentStatus;
      }
    } else if (currentDecision === 'Rejected') {
      newStatus = 'Rejected';
    } else if (currentDecision === 'Needs Information') {
      newStatus = 'Needs Information';
    }
    
    const updatesToSave: Partial<RiskAssessment> = {
      approvalSteps: updatedApprovalSteps,
      status: newStatus,
      lastModified: nowISO, // This will be handled by serverTimestamp in service
    };

    try {
      await updateRiskAssessment(assessment.id, updatesToSave);
      setAssessment(prev => prev ? { ...prev, ...updatesToSave, approvalSteps: updatedApprovalSteps, status: newStatus } : null); // Optimistic update
      
      toast({
        title: getTranslation(T_DETAILS_PAGE.assessmentActionToastTitle).replace('{decision}', currentDecision),
        description: getTranslation(T_DETAILS_PAGE.assessmentActionToastDesc).replace('{decision}', currentDecision.toLowerCase()),
      });
    } catch (error) {
        console.error("Error updating assessment:", error);
        toast({
            title: getTranslation(T_DETAILS_PAGE.updateError),
            description: getTranslation(T_DETAILS_PAGE.failedToUpdateAssessment),
            variant: "destructive",
        });
    } finally {
        setIsSubmittingApproval(false);
        setIsApprovalDialogOpen(false);
        setCurrentDecision(undefined);
    }
  }, [assessment, currentLevelToAct, currentUser, currentDecision, toast, getTranslation]);


  if (isLoading && !assessment) { // Show loader only if assessment is not yet loaded
    return <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" /> 
        <p className="text-xl text-muted-foreground">{getTranslation(T_DETAILS_PAGE.loadingAssessment)}</p>
    </div>;
  }

  if (!assessment) { // This case handles if loading finished but assessment is still null (e.g. not found)
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto text-center">
        <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
        <AlertTitle className="text-xl">{getTranslation(T_DETAILS_PAGE.assessmentNotFound)}</AlertTitle>
        <AlertDescription>{getTranslation(T_DETAILS_PAGE.assessmentNotFoundDesc)}</AlertDescription>
         <Button onClick={() => router.push('/')} variant="link" className="mt-4">{getTranslation(T_DETAILS_PAGE.returnToDashboard)}</Button>
      </Alert>
    );
  }

  const statusConfig: Record<RiskAssessmentStatus, { icon: React.ElementType, badgeClass: string, progressClass?: string }> = {
    'Draft': { icon: Edit, badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300', progressClass: '[&>div]:bg-gray-500' },
    'Pending Crewing Standards and Oversight': { icon: Building, badgeClass: 'bg-yellow-100 text-yellow-800 border border-yellow-400', progressClass: '[&>div]:bg-yellow-500' },
    'Pending Senior Director': { icon: UserCheckLucideIcon, badgeClass: 'bg-cyan-100 text-cyan-800 border border-cyan-400', progressClass: '[&>div]:bg-cyan-500' },
    'Pending Director General': { icon: UserCircleIcon, badgeClass: 'bg-purple-100 text-purple-800 border border-purple-400', progressClass: '[&>div]:bg-purple-500' },
    'Needs Information': { icon: FileWarning, badgeClass: 'bg-orange-100 text-orange-800 border border-orange-400', progressClass: '[&>div]:bg-orange-500' },
    'Approved': { icon: CheckCircle2, badgeClass: 'bg-green-100 text-green-800 border border-green-400', progressClass: '[&>div]:bg-green-500' },
    'Rejected': { icon: XCircle, badgeClass: 'bg-red-100 text-red-800 border border-red-400', progressClass: '[&>div]:bg-red-500' },
  };
  const currentStatusConfig = statusConfig[assessment.status] || { icon: HelpCircle, badgeClass: 'bg-gray-200 text-gray-800' };
  const StatusIcon = currentStatusConfig.icon;

  const aiRiskColorClass = assessment.aiRiskScore !== undefined 
    ? assessment.aiRiskScore > 70 ? '[&>div]:bg-red-500' : assessment.aiRiskScore > 40 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
    : '[&>div]:bg-gray-300';

  const getStepStatusIcon = (decision?: ApprovalDecision) => {
    if (!decision) return Hourglass;
    switch (decision) {
      case 'Approved': return ThumbsUp;
      case 'Rejected': return ThumbsDown;
      case 'Needs Information': return MessageSquare;
      default: return Hourglass;
    }
  };

  const getStepStatusColor = (decision?: ApprovalDecision) => {
    if (!decision) return 'text-muted-foreground';
    switch (decision) {
      case 'Approved': return 'text-green-600';
      case 'Rejected': return 'text-red-600';
      case 'Needs Information': return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };
  
  const YesNoIcon = ({ value }: { value?: YesNoOptional }) => {
    if (value === 'Yes') return <CheckSquare className="h-4 w-4 text-green-600 inline-block mr-1" />;
    if (value === 'No') return <Square className="h-4 w-4 text-red-600 inline-block mr-1" />;
    return <HelpCircle className="h-4 w-4 text-muted-foreground inline-block mr-1" />;
  };


  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/')} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> {getTranslation(T_DETAILS_PAGE.backToDashboard)}
        </Button>
      </div>

      <Card className="shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="bg-muted/20 p-6">
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
                <Ship className="h-8 w-8" /> {assessment.vesselName}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {assessment.referenceNumber}
                {assessment.maritimeExemptionNumber && (
                    <span className="ml-2 pl-2 border-l border-muted-foreground/50">{getTranslation(T_DETAILS_PAGE.maritimeExemptionNumber)}: {assessment.maritimeExemptionNumber}</span>
                )}
                {assessment.imoNumber && (
                    <span className="ml-2 pl-2 border-l border-muted-foreground/50">{getTranslation(T_DETAILS_PAGE.imo)}: {assessment.imoNumber}</span>
                )}
              </CardDescription>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
                 <Badge className={`text-base px-4 py-2 rounded-full font-medium ${currentStatusConfig.badgeClass}`}>
                    <StatusIcon className="h-5 w-5 mr-2" />
                    {assessment.status} 
                </Badge>
                <p className="text-xs text-muted-foreground">
                    {getTranslation(T_DETAILS_PAGE.lastModified)}: {format(parseISO(assessment.lastModified), `MMM d, yyyy '${getTranslation(T_DETAILS_PAGE.at)}' h:mm a`)}
                </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          
          <section>
            <SectionTitle icon={Sailboat} title={getTranslation(T_DETAILS_PAGE.vesselOverview)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <DetailItem label={getTranslation(T_DETAILS_PAGE.submittedBy)} value={assessment.submittedBy} />
              <DetailItem label={getTranslation(T_DETAILS_PAGE.submissionDate)} value={format(parseISO(assessment.submissionDate), "PPP p")} />
              {assessment.imoNumber && <DetailItem label={getTranslation(T_DETAILS_PAGE.imoNumber)} value={assessment.imoNumber} icon={Fingerprint} />}
              {assessment.maritimeExemptionNumber && <DetailItem label={getTranslation(T_DETAILS_PAGE.maritimeExemptionNumber)} value={assessment.maritimeExemptionNumber} icon={FileBadge} />}
              <DetailItem label={getTranslation(T_DETAILS_PAGE.department)} value={assessment.department} />
              <DetailItem label={getTranslation(T_DETAILS_PAGE.region)} value={assessment.region} />
              {assessment.patrolStartDate && <DetailItem label={getTranslation(T_DETAILS_PAGE.patrolStartDate)} value={format(parseISO(assessment.patrolStartDate), "PPP")} icon={CalendarClock} />}
              {assessment.patrolEndDate && <DetailItem label={getTranslation(T_DETAILS_PAGE.patrolEndDate)} value={format(parseISO(assessment.patrolEndDate), "PPP")} icon={CalendarClock} />}
              {assessment.patrolLengthDays !== undefined && <DetailItem label={getTranslation(T_DETAILS_PAGE.patrolLength)} value={`${assessment.patrolLengthDays} ${getTranslation(T_DETAILS_PAGE.days)}`} icon={Clock} />}
              <DetailItem label={getTranslation(T_DETAILS_PAGE.voyageDetails)} value={assessment.voyageDetails} isPreformatted fullWidth/>
              <DetailItem label={getTranslation(T_DETAILS_PAGE.reasonForRequest)} value={assessment.reasonForRequest} isPreformatted fullWidth/>
              <DetailItem label={getTranslation(T_DETAILS_PAGE.personnelShortages)} value={assessment.personnelShortages} isPreformatted fullWidth/>
              <DetailItem label={getTranslation(T_DETAILS_PAGE.proposedDeviations)} value={assessment.proposedOperationalDeviations} isPreformatted fullWidth/>
            </div>
          </section>
          <Separator />
          
          <section>
            <SectionTitle icon={UserCog} title={getTranslation(T_DETAILS_PAGE.exemptionIndividualAssessment)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <DetailItem label={getTranslation(T_DETAILS_PAGE.employeeName)} value={assessment.employeeName} icon={User} />
                <DetailItem label={getTranslation(T_DETAILS_PAGE.certificateHeld)} value={assessment.certificateHeld} icon={Award} />
                <DetailItem label={getTranslation(T_DETAILS_PAGE.requiredCertificate)} value={assessment.requiredCertificate} icon={FileCheck2} fullWidth/>
                <DetailItem label={getTranslation(T_DETAILS_PAGE.coSupportExemption)} value={<><YesNoIcon value={assessment.coDeptHeadSupportExemption} /> {assessment.coDeptHeadSupportExemption || getTranslation(T_DETAILS_PAGE.na)}</>} />
                <DetailItem label={getTranslation(T_DETAILS_PAGE.deptHeadConfident)} value={<><YesNoIcon value={assessment.deptHeadConfidentInIndividual} /> {assessment.deptHeadConfidentInIndividual || getTranslation(T_DETAILS_PAGE.na)}</>} />
                {assessment.deptHeadConfidentInIndividual === 'Yes' && <DetailItem label={getTranslation(T_DETAILS_PAGE.reasonForConfidence)} value={assessment.deptHeadConfidenceReason} isPreformatted fullWidth />}
                <DetailItem label={getTranslation(T_DETAILS_PAGE.familiarizationProvided)} value={<><YesNoIcon value={assessment.employeeFamiliarizationProvided} /> {assessment.employeeFamiliarizationProvided || getTranslation(T_DETAILS_PAGE.na)}</>} />
                <DetailItem label={getTranslation(T_DETAILS_PAGE.workedInDeptLast12Months)} value={<><YesNoIcon value={assessment.workedInDepartmentLast12Months} /> {assessment.workedInDepartmentLast12Months || getTranslation(T_DETAILS_PAGE.na)}</>} />
                {assessment.workedInDepartmentLast12Months === 'Yes' && <DetailItem label={getTranslation(T_DETAILS_PAGE.positionAndDuration)} value={assessment.workedInDepartmentDetails} isPreformatted fullWidth />}
                <DetailItem label={getTranslation(T_DETAILS_PAGE.similarExperience)} value={<><YesNoIcon value={assessment.similarResponsibilityExperience} /> {assessment.similarResponsibilityExperience || getTranslation(T_DETAILS_PAGE.na)}</>} />
                {assessment.similarResponsibilityExperience === 'Yes' && <DetailItem label={getTranslation(T_DETAILS_PAGE.detailsSimilarResponsibility)} value={assessment.similarResponsibilityDetails} isPreformatted fullWidth />}
                <DetailItem label={getTranslation(T_DETAILS_PAGE.hasRequiredSeaService)} value={<><YesNoIcon value={assessment.individualHasRequiredSeaService} /> {assessment.individualHasRequiredSeaService || getTranslation(T_DETAILS_PAGE.na)}</>} />
                <DetailItem label={getTranslation(T_DETAILS_PAGE.workingTowardsCert)} value={<><YesNoIcon value={assessment.individualWorkingTowardsCertification} /> {assessment.individualWorkingTowardsCertification || getTranslation(T_DETAILS_PAGE.na)}</>} />
                {assessment.individualWorkingTowardsCertification === 'Yes' && <DetailItem label={getTranslation(T_DETAILS_PAGE.certProgressSummary)} value={assessment.certificationProgressSummary} isPreformatted fullWidth />}
            </div>
          </section>
          <Separator />

          <section>
            <SectionTitle icon={ClipboardList} title={getTranslation(T_DETAILS_PAGE.operationalConsiderations)} />
             <h4 className="text-md font-medium mb-2 text-muted-foreground">{getTranslation(T_DETAILS_PAGE.crewTeamConsiderations)}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
                <DetailItem label={getTranslation(T_DETAILS_PAGE.requestCausesVacancy)} value={<><YesNoIcon value={assessment.requestCausesVacancyElsewhere} /> {assessment.requestCausesVacancyElsewhere || getTranslation(T_DETAILS_PAGE.na)}</>} />
                <DetailItem label={getTranslation(T_DETAILS_PAGE.crewSufficientForSafety)} value={<><YesNoIcon value={assessment.crewCompositionSufficientForSafety} /> {assessment.crewCompositionSufficientForSafety || getTranslation(T_DETAILS_PAGE.na)}</>} />
                <DetailItem label={getTranslation(T_DETAILS_PAGE.detailedCrewCompetency)} value={assessment.detailedCrewCompetencyAssessment} isPreformatted fullWidth />
                <DetailItem label={getTranslation(T_DETAILS_PAGE.crewContinuityProfile)} value={<><YesNoIcon value={assessment.crewContinuityAsPerProfile} /> {assessment.crewContinuityAsPerProfile || getTranslation(T_DETAILS_PAGE.na)}</>} />
                {assessment.crewContinuityAsPerProfile === 'No' && <DetailItem label={getTranslation(T_DETAILS_PAGE.crewContinuityDetails)} value={assessment.crewContinuityDetails} isPreformatted fullWidth />}
            </div>
            <h4 className="text-md font-medium mb-2 text-muted-foreground">{getTranslation(T_DETAILS_PAGE.voyageConsiderations)}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <DetailItem label={getTranslation(T_DETAILS_PAGE.specialVoyageConsiderations)} value={assessment.specialVoyageConsiderations} isPreformatted fullWidth />
                <DetailItem label={getTranslation(T_DETAILS_PAGE.programReduction)} value={<><YesNoIcon value={assessment.reductionInVesselProgramRequirements} /> {assessment.reductionInVesselProgramRequirements || getTranslation(T_DETAILS_PAGE.na)}</>} />
                {assessment.reductionInVesselProgramRequirements === 'Yes' && <DetailItem label={getTranslation(T_DETAILS_PAGE.rocNotified)} value={<><YesNoIcon value={assessment.rocNotificationOfLimitations} /> {assessment.rocNotificationOfLimitations || getTranslation(T_DETAILS_PAGE.na)}</>} />}
            </div>
          </section>
          <Separator />

          <section>
            <SectionTitle icon={FileText} title={getTranslation(T_DETAILS_PAGE.attachments)} />
            {assessment.attachments && assessment.attachments.length > 0 ? (
              <ul className="space-y-3">
                {assessment.attachments.map(att => (
                  <li key={att.id || att.name} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-6 w-6 text-primary shrink-0" />
                      <div className="overflow-hidden">
                        <span className="font-medium text-sm truncate block" title={att.name}>{att.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {(att.size / 1024).toFixed(1)} KB - {att.type} - {format(parseISO(att.uploadedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadAttachment(att)}>
                      <Download className="h-4 w-4 mr-2" /> {getTranslation(T_DETAILS_PAGE.download)}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <Alert variant="default" className="border-dashed">
                <Info className="h-4 w-4" />
                <AlertDescription>{getTranslation(T_DETAILS_PAGE.noAttachments)}</AlertDescription>
              </Alert>
            )}
          </section>
          <Separator />

          <section>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
              <SectionTitle icon={Bot} title={getTranslation(T_DETAILS_PAGE.aiInsights)} className="mb-0"/>
              <div className="flex flex-wrap gap-2">
                <Button onClick={runAiSummary} disabled={isAiLoading.summary || !!assessment.aiGeneratedSummary} variant="outline" size="sm">
                  {isAiLoading.summary ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{getTranslation(T_DETAILS_PAGE.generating)}</> : (assessment.aiGeneratedSummary ? getTranslation(T_DETAILS_PAGE.summaryGenerated) : getTranslation(T_DETAILS_PAGE.generateSummary))}
                </Button>
                <Button onClick={runAiRiskScoreAndRecommendations} disabled={isAiLoading.riskScore || (!!assessment.aiRiskScore && !!assessment.aiLikelihoodScore)} variant="outline" size="sm">
                  {isAiLoading.riskScore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{getTranslation(T_DETAILS_PAGE.analyzing)}</> : ((assessment.aiRiskScore && assessment.aiLikelihoodScore) ? getTranslation(T_DETAILS_PAGE.analysisComplete) : getTranslation(T_DETAILS_PAGE.assessRiskMitigations))}
                </Button>
              </div>
            </div>
            {(isAiLoading.summary && !assessment.aiGeneratedSummary) || (isAiLoading.riskScore && (!assessment.aiRiskScore || !assessment.aiLikelihoodScore)) && <Progress value={50} className={`w-full my-2 h-1.5 ${currentStatusConfig.progressClass || ''} animate-pulse`} />}

            {assessment.aiGeneratedSummary && (
              <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <AlertTitle className="font-semibold text-blue-700 dark:text-blue-300">{getTranslation(T_DETAILS_PAGE.aiGeneratedSummary)}</AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-400 whitespace-pre-wrap">{assessment.aiGeneratedSummary}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {assessment.aiRiskScore !== undefined && (
                <Card className="my-4 p-4 bg-muted/30 md:col-span-1">
                  <CardHeader className="p-0 pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> {getTranslation(T_DETAILS_PAGE.aiRiskScore)}: {assessment.aiRiskScore}/100</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                      <Progress value={assessment.aiRiskScore} className={`w-full h-2.5 mb-3 ${aiRiskColorClass}`} />
                      {assessment.aiSuggestedMitigations && (
                          <div className="mt-2">
                              <h4 className="font-semibold text-sm">{getTranslation(T_DETAILS_PAGE.suggestedMitigations)}</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assessment.aiSuggestedMitigations}</p>
                          </div>
                      )}
                      {assessment.aiRegulatoryConsiderations && (
                          <div className="mt-3 pt-3 border-t">
                              <h4 className="font-semibold text-sm">{getTranslation(T_DETAILS_PAGE.regulatoryConsiderations)}</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assessment.aiRegulatoryConsiderations}</p>
                          </div>
                      )}
                  </CardContent>
                </Card>
              )}

              {(assessment.aiLikelihoodScore !== undefined && assessment.aiConsequenceScore !== undefined) && (
                 <div className="my-4 md:col-span-1">
                    <RiskMatrix likelihoodScore={assessment.aiLikelihoodScore} consequenceScore={assessment.aiConsequenceScore} />
                 </div>
              )}
            </div>

            {!assessment.aiRiskScore && !assessment.aiLikelihoodScore && !assessment.aiGeneratedSummary && !isAiLoading.summary && !isAiLoading.riskScore &&
              <Alert variant="default" className="border-dashed">
                <BarChartBig className="h-4 w-4" />
                <AlertDescription>{getTranslation(T_DETAILS_PAGE.runAiTools)}</AlertDescription>
              </Alert>
            }
          </section>
          <Separator />

          <section>
            <SectionTitle icon={Users} title={getTranslation(T_DETAILS_PAGE.approvalWorkflow)} />
            <div className="space-y-4">
              {assessment.approvalSteps.map((step, index) => {
                const StepIcon = getStepStatusIcon(step.decision);
                const stepColor = getStepStatusColor(step.decision);
                const isLastStep = index === assessment.approvalSteps.length - 1;
                const isPending = !step.decision;
                
                return (
                  <div key={step.level}>
                    <Card className={`p-4 ${isPending && step.level === currentLevelToAct && !isHalted ? 'border-primary shadow-md' : 'bg-muted/30'}`}>
                      <CardHeader className="p-0 pb-2">
                        <CardTitle className={`text-md font-semibold flex items-center justify-between ${stepColor}`}>
                          <span className="flex items-center gap-2">
                            <StepIcon className="h-5 w-5" />
                            {step.level} 
                          </span>
                          {step.decision ? (
                            <Badge
                              variant={
                                step.decision === 'Rejected' ? 'destructive' :
                                'outline' 
                              }
                              className={`text-xs px-2 py-0.5 rounded-sm ${ 
                                step.decision === 'Approved' ? 'bg-green-100 text-green-800 border-green-400' :
                                step.decision === 'Needs Information' ? 'bg-orange-100 text-orange-800 border-orange-400' :
                                '' 
                              }`}
                            >
                              {step.decision} 
                            </Badge>
                          ) : ( step.level === currentLevelToAct && !isHalted ? 
                            <Badge variant="outline" className="border-yellow-400 text-yellow-600 text-xs px-2 py-0.5 rounded-sm">{getTranslation(T_DETAILS_PAGE.pendingAction)}</Badge> 
                            : <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-sm">{getTranslation(T_DETAILS_PAGE.queued)}</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      {step.decision && (
                        <CardContent className="text-sm space-y-1 pt-2 p-0">
                          {step.userName && <p><strong>{getTranslation(T_DETAILS_PAGE.by)}</strong> {step.userName}</p>}
                          {step.date && <p><strong>{getTranslation(T_DETAILS_PAGE.date)}</strong> {format(parseISO(step.date), "PPP p")}</p>}
                          {step.notes && <p className="mt-1"><strong>{getTranslation(T_DETAILS_PAGE.notes)}</strong> <span className="whitespace-pre-wrap">{step.notes}</span></p>}
                        </CardContent>
                      )}
                    </Card>
                    {!isLastStep && (
                      <div className="flex justify-center my-1">
                        <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90 md:rotate-0" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {currentLevelToAct && !isHalted && (
                <div className="mt-6 pt-4 border-t">
                    <h4 className="text-md font-semibold mb-3">{getTranslation(T_DETAILS_PAGE.actionsFor).replace('{level}', currentLevelToAct)}</h4>
                    {userCanActOnCurrentStep ? (
                      <div className="flex flex-wrap gap-3">
                          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleOpenApprovalDialog('Approved')} disabled={isSubmittingApproval}>
                              <ThumbsUp className="mr-2 h-4 w-4"/> {getTranslation(T_DETAILS_PAGE.approve)}
                          </Button>
                          <Button variant="destructive" onClick={() => handleOpenApprovalDialog('Rejected')} disabled={isSubmittingApproval}>
                              <ThumbsDown className="mr-2 h-4 w-4"/> {getTranslation(T_DETAILS_PAGE.reject)}
                          </Button>
                          <Button variant="outline" onClick={() => handleOpenApprovalDialog('Needs Information')} disabled={isSubmittingApproval}>
                              <MessageSquare className="mr-2 h-4 w-4"/> {getTranslation(T_DETAILS_PAGE.requestInformation)}
                          </Button>
                      </div>
                    ) : (
                       <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                          <Lock className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-700 dark:text-blue-300">{getTranslation(T_DETAILS_PAGE.actionRequiredByAnotherRole)}</AlertTitle>
                          <AlertDescription className="text-blue-600 dark:text-blue-400">
                            {getTranslation(T_DETAILS_PAGE.actionRequiredDesc).replace('{currentUserRole}', currentUser.role).replace('{requiredRole}', currentLevelToAct)}
                          </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}
            {assessment.status === 'Approved' && (
                <Alert variant="default" className="mt-6 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <AlertTitle className="text-green-700 font-semibold">{getTranslation(T_DETAILS_PAGE.assessmentFullyApproved)}</AlertTitle>
                  <AlertDescription className="text-green-600">{getTranslation(T_DETAILS_PAGE.assessmentFullyApprovedDesc)}</AlertDescription>
                </Alert>
            )}
            {(assessment.status === 'Rejected' && isHalted) && ( 
                 <Alert variant="destructive" className="mt-6">
                  <XCircle className="h-5 w-5" />
                  <AlertTitle className="font-semibold">{getTranslation(T_DETAILS_PAGE.assessmentRejected)}</AlertTitle>
                  <AlertDescription>{getTranslation(T_DETAILS_PAGE.assessmentRejectedDesc).replace('{level}', String(currentLevelToAct))}</AlertDescription>
                </Alert>
            )}
             {(assessment.status === 'Needs Information' && isHalted) && (
                 <Alert variant="default" className="mt-6 bg-orange-50 border-orange-200">
                  <FileWarning className="h-5 w-5 text-orange-600" />
                  <AlertTitle className="text-orange-700 font-semibold">{getTranslation(T_DETAILS_PAGE.informationRequested)}</AlertTitle>
                  <AlertDescription className="text-orange-600">{getTranslation(T_DETAILS_PAGE.informationRequestedDesc).replace('{level}', String(currentLevelToAct))}</AlertDescription>
                </Alert>
            )}
             {!currentLevelToAct && !['Approved', 'Rejected', 'Needs Information'].includes(assessment.status) && assessment.approvalSteps.every(s => !s.decision) && (
                 <Alert variant="default" className="mt-6 border-dashed">
                    <Users className="h-4 w-4" />
                    <AlertDescription>{getTranslation(T_DETAILS_PAGE.awaitingInitialReview)}</AlertDescription>
                </Alert>
            )}

          </section>
        </CardContent>
      </Card>
       <ApprovalDialog
        isOpen={isApprovalDialogOpen}
        onClose={() => { setIsApprovalDialogOpen(false); setCurrentDecision(undefined);}}
        onSubmit={handleApprovalAction}
        decision={currentDecision}
        isLoading={isSubmittingApproval}
      />
    </div>
  );
}
