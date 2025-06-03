
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import type { RiskAssessment } from '@/lib/types';
import { getAllAssessmentsFromDB } from '@/lib/firestoreService';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, AlertTriangle, Workflow, PlusCircle, ArrowLeft, Users, Building, UserCheck as UserCheckIcon, UserCircle, Sigma } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import WorkflowTimelineRow from '@/components/risk-assessments/WorkflowTimelineRow'; // New component
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const T_WORKFLOW_PAGE = {
  pageTitle: { en: "Workflow Status Overview", fr: "Aperçu de l'état du flux de travail" },
  pageDescription: { en: "Track assessments through their approval stages.", fr: "Suivez les évaluations à travers leurs étapes d'approbation."},
  loadingAssessments: { en: "Loading assessments...", fr: "Chargement des évaluations..." },
  noAssessmentsTitle: { en: "No Risk Assessments Found", fr: "Aucune évaluation des risques trouvée" },
  noAssessmentsDescription: { en: "There are currently no risk assessments in the system.", fr: "Il n'y a actuellement aucune évaluation des risques dans le système." },
  createNewAssessment: { en: "Create New Assessment", fr: "Créer une nouvelle évaluation" },
  errorLoadingTitle: { en: "Error Loading Assessments", fr: "Erreur de chargement des évaluations" },
  errorLoadingDescription: { en: "Could not fetch assessments. Please try again later.", fr: "Impossible de charger les évaluations. Veuillez réessayer plus tard." },
  backToDashboard: { en: "Back to Dashboard", fr: "Retour au tableau de bord" },
  assessmentHeader: { en: "Assessment", fr: "Évaluation" },
  csoHeader: { en: "CSO", fr: "BCN" }, // Bureau de la conformité et des normes
  sdHeader: { en: "Sr. Director", fr: "Dir. Principal" },
  dgHeader: { en: "Dir. General", fr: "Dir. Générale" },
  overallStatusHeader: { en: "Overall Status", fr: "Statut Général" },
  actionsHeader: { en: "Actions", fr: "Actions" },
};

export default function WorkflowStatusPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getTranslation } = useLanguage();
  const router = useRouter();

  const loadAssessments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllAssessmentsFromDB();
      data.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
      setAssessments(data);
    } catch (err) {
      console.error("Error fetching assessments for workflow status page:", err);
      setError(getTranslation(T_WORKFLOW_PAGE.errorLoadingDescription));
      toast.error(getTranslation(T_WORKFLOW_PAGE.errorLoadingTitle), {
        description: getTranslation(T_WORKFLOW_PAGE.errorLoadingDescription),
      });
    } finally {
      setIsLoading(false);
    }
  }, [getTranslation]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-xl text-muted-foreground">{getTranslation(T_WORKFLOW_PAGE.loadingAssessments)}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle>{getTranslation(T_WORKFLOW_PAGE.errorLoadingTitle)}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push('/')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {getTranslation(T_WORKFLOW_PAGE.backToDashboard)}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <Workflow className="h-7 w-7" />
            {getTranslation(T_WORKFLOW_PAGE.pageTitle)}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{getTranslation(T_WORKFLOW_PAGE.pageDescription)}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {getTranslation(T_WORKFLOW_PAGE.backToDashboard)}
        </Button>
      </div>

      {assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] gap-6 text-center">
            <Workflow className="h-20 w-20 text-muted-foreground/50" />
             <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{getTranslation(T_WORKFLOW_PAGE.noAssessmentsTitle)}</h2>
                <p className="text-muted-foreground max-w-md">
                    {getTranslation(T_WORKFLOW_PAGE.noAssessmentsDescription)}
                </p>
            </div>
            <Button asChild size="lg">
            <Link href="/assessments/new">
                <PlusCircle className="mr-2 h-5 w-5" />
                {getTranslation(T_WORKFLOW_PAGE.createNewAssessment)}
            </Link>
            </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1000px] xl:min-w-full"> {/* Ensure table is scrollable on small screens */}
            {/* Header Row */}
            <div className="grid grid-cols-[2fr_repeat(3,_minmax(100px,_1fr))_1.5fr_1fr] gap-2 p-3 bg-muted rounded-t-md sticky top-0 z-10">
              <div className="font-semibold text-sm text-muted-foreground">{getTranslation(T_WORKFLOW_PAGE.assessmentHeader)}</div>
              <div className="font-semibold text-sm text-muted-foreground text-center flex items-center justify-center gap-1"><Building size={16}/>{getTranslation(T_WORKFLOW_PAGE.csoHeader)}</div>
              <div className="font-semibold text-sm text-muted-foreground text-center flex items-center justify-center gap-1"><UserCheckIcon size={16}/>{getTranslation(T_WORKFLOW_PAGE.sdHeader)}</div>
              <div className="font-semibold text-sm text-muted-foreground text-center flex items-center justify-center gap-1"><UserCircle size={16}/>{getTranslation(T_WORKFLOW_PAGE.dgHeader)}</div>
              <div className="font-semibold text-sm text-muted-foreground text-center flex items-center justify-center gap-1"><Sigma size={16}/>{getTranslation(T_WORKFLOW_PAGE.overallStatusHeader)}</div>
              <div className="font-semibold text-sm text-muted-foreground text-right">{getTranslation(T_WORKFLOW_PAGE.actionsHeader)}</div>
            </div>
            {/* Data Rows */}
            <div className="space-y-2 mt-1">
              {assessments.map((assessment) => (
                <WorkflowTimelineRow key={assessment.id} assessment={assessment} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
