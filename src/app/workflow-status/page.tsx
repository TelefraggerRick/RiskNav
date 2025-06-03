
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import type { RiskAssessment } from '@/lib/types';
import { getAllAssessmentsFromDB } from '@/lib/firestoreService';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, AlertTriangle, Workflow, PlusCircle, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import WorkflowStatusCard from '@/components/risk-assessments/WorkflowStatusCard';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const T_WORKFLOW_PAGE = {
  pageTitle: { en: "Workflow Status Overview", fr: "Aperçu de l'état du flux de travail" },
  loadingAssessments: { en: "Loading assessments...", fr: "Chargement des évaluations..." },
  noAssessmentsTitle: { en: "No Risk Assessments Found", fr: "Aucune évaluation des risques trouvée" },
  noAssessmentsDescription: { en: "There are currently no risk assessments in the system.", fr: "Il n'y a actuellement aucune évaluation des risques dans le système." },
  createNewAssessment: { en: "Create New Assessment", fr: "Créer une nouvelle évaluation" },
  errorLoadingTitle: { en: "Error Loading Assessments", fr: "Erreur de chargement des évaluations" },
  errorLoadingDescription: { en: "Could not fetch assessments. Please try again later.", fr: "Impossible de charger les évaluations. Veuillez réessayer plus tard." },
  backToDashboard: { en: "Back to Dashboard", fr: "Retour au tableau de bord" },
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
      // Sort assessments by lastModified date, newest first
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
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
          <Workflow className="h-7 w-7" />
          {getTranslation(T_WORKFLOW_PAGE.pageTitle)}
        </h1>
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
        <div className="space-y-6">
          {assessments.map((assessment) => (
            <WorkflowStatusCard key={assessment.id} assessment={assessment} />
          ))}
        </div>
      )}
    </div>
  );
}
