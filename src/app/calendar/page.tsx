
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Removed CardDescription
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RiskAssessment } from '@/lib/types';
// import { mockRiskAssessments } from '@/lib/mockData'; // No longer primary source
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, isValid } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, CalendarDays, Info, List, Loader2, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllRiskAssessments } from '@/services/riskAssessmentService'; // Import Firestore service
import { useToast } from "@/hooks/use-toast";

// LOCAL_STORAGE_KEY no longer needed

const T_CALENDAR_PAGE = {
  pageTitle: { en: "Risk Assessment Calendar", fr: "Calendrier des évaluations des risques" },
  pageDescription: { en: "Visualize risk assessment patrol periods. Click a day to see active assessments.", fr: "Visualisez les périodes de patrouille des évaluations de risques. Cliquez sur un jour pour voir les évaluations actives." },
  backToDashboard: { en: "Back to Dashboard", fr: "Retour au tableau de bord" },
  selectedDate: { en: "Assessments for {date}", fr: "Évaluations pour le {date}" },
  noAssessmentsOnDate: { en: "No assessments active on this date.", fr: "Aucune évaluation active à cette date." },
  viewDetails: { en: "View Details", fr: "Voir les détails" },
  patrolPeriod: { en: "Patrol:", fr: "Patrouille :" },
  noPatrolDates: { en: "Patrol dates not set", fr: "Dates de patrouille non définies"},
  loadingAssessments: { en: "Loading assessments...", fr: "Chargement des évaluations..." },
  errorLoadingAssessments: { en: "Error loading assessments", fr: "Erreur lors du chargement des évaluations"},
  errorLoadingAssessmentsDesc: { en: "Could not fetch risk assessments for the calendar.", fr: "Impossible de récupérer les évaluations de risques pour le calendrier."},
  noAssessmentsInSystemTitle: { en: "No Assessments in System", fr: "Aucune évaluation dans le système" },
  noAssessmentsInSystemDesc: { en: "There are currently no risk assessments logged. Get started by creating one.", fr: "Aucune évaluation des risques n'est actuellement enregistrée. Commencez par en créer une." },
  createNewAssessment: { en: "Create New Assessment", fr: "Créer une nouvelle évaluation" },
};

// getAllAssessments from localStorage is no longer needed

export default function AssessmentCalendarPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [activeAssessmentsForDay, setActiveAssessmentsForDay] = useState<RiskAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { getTranslation, currentLanguage } = useLanguage();
  const { toast } = useToast();

  const loadAssessments = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedAssessments = await getAllRiskAssessments();
      setAssessments(fetchedAssessments);
    } catch (error) {
      console.error("Failed to load assessments for calendar:", error);
      toast({
        title: getTranslation(T_CALENDAR_PAGE.errorLoadingAssessments),
        description: getTranslation(T_CALENDAR_PAGE.errorLoadingAssessmentsDesc),
        variant: "destructive",
      });
       setAssessments([]);
    } finally {
      setIsLoading(false);
    }
  }, [getTranslation, toast]); 

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const patrolDayMatcher = useMemo(() => {
    if (isLoading || assessments.length === 0) return [];
    
    const daysWithPatrols = new Set<string>();
    assessments.forEach(assessment => {
      if (assessment.patrolStartDate && assessment.patrolEndDate) {
        try {
          const startDate = parseISO(assessment.patrolStartDate);
          const endDate = parseISO(assessment.patrolEndDate);

          if (!isValid(startDate) || !isValid(endDate)) {
            console.warn(`Invalid date format for assessment ${assessment.id}: StartDate: ${assessment.patrolStartDate}, EndDate: ${assessment.patrolEndDate}`);
            return;
          }
            
          const start = startOfDay(startDate);
          const end = endOfDay(endDate);
          
          if (start <= end) {
            const intervalDates = eachDayOfInterval({ start, end });
            intervalDates.forEach(date => daysWithPatrols.add(format(date, 'yyyy-MM-dd')));
          } else {
            console.warn(`Patrol start date is after end date for assessment ${assessment.id}`);
          }
        } catch (e) {
          console.error(`Error processing patrol dates for assessment ${assessment.id}:`, e);
        }
      }
    });
    return Array.from(daysWithPatrols).map(dateStr => parseISO(dateStr));
  }, [assessments, isLoading]);

  const handleDayClick = useCallback((day: Date | undefined) => {
    setSelectedDate(day);
    if (day) {
      const clickedDayStart = startOfDay(day);
      const active = assessments.filter(assessment => {
        if (assessment.patrolStartDate && assessment.patrolEndDate) {
          try {
            const patrolStartDate = parseISO(assessment.patrolStartDate);
            const patrolEndDate = parseISO(assessment.patrolEndDate);

            if (!isValid(patrolStartDate) || !isValid(patrolEndDate)) {
                return false;
            }

            const start = startOfDay(patrolStartDate);
            const end = endOfDay(patrolEndDate);
            return start <= end && isWithinInterval(clickedDayStart, { start, end });
          } catch (e) {
            console.error(`Error in handleDayClick for assessment ${assessment.id}:`, e);
            return false; 
          }
        }
        return false;
      });
      setActiveAssessmentsForDay(active);
    } else {
      setActiveAssessmentsForDay([]);
    }
  }, [assessments]);

  useEffect(() => {
    if (!isLoading && assessments.length > 0) { // Ensure assessments are loaded before initial day click
        handleDayClick(new Date());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, assessments, handleDayClick]); // Added assessments to dependencies

  const formatPatrolDateRange = (assessment: RiskAssessment) => {
    if (assessment.patrolStartDate && assessment.patrolEndDate) {
      try {
        const startDate = parseISO(assessment.patrolStartDate);
        const endDate = parseISO(assessment.patrolEndDate);
        if (!isValid(startDate) || !isValid(endDate)) return getTranslation(T_CALENDAR_PAGE.noPatrolDates);
        return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
      } catch (e) { return getTranslation(T_CALENDAR_PAGE.noPatrolDates); }
    }
    return getTranslation(T_CALENDAR_PAGE.noPatrolDates);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" /> 
        <p className="text-xl text-muted-foreground">{getTranslation(T_CALENDAR_PAGE.loadingAssessments)}</p>
      </div>
    );
  }

  if (!isLoading && assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-300px)] gap-6 text-center">
        <CalendarDays className="h-20 w-20 text-muted-foreground/50" />
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{getTranslation(T_CALENDAR_PAGE.noAssessmentsInSystemTitle)}</h2>
          <p className="text-muted-foreground max-w-md">
            {getTranslation(T_CALENDAR_PAGE.noAssessmentsInSystemDesc)}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/assessments/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            {getTranslation(T_CALENDAR_PAGE.createNewAssessment)}
          </Link>
        </Button>
         <Button variant="outline" onClick={() => router.push('/')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {getTranslation(T_CALENDAR_PAGE.backToDashboard)}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <CalendarDays className="h-7 w-7" />
            {getTranslation(T_CALENDAR_PAGE.pageTitle)}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{getTranslation(T_CALENDAR_PAGE.pageDescription)}</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {getTranslation(T_CALENDAR_PAGE.backToDashboard)}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <Card className="lg:col-span-2 shadow-lg rounded-lg">
          <CardContent className="p-2 sm:p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDayClick}
              modifiers={{ patrolDay: patrolDayMatcher }}
              modifiersStyles={{
                patrolDay: {
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                  fontWeight: 'bold',
                  border: '1px solid hsl(var(--primary) / 0.3)',
                  borderRadius: 'var(--radius)',
                },
              }}
              className="w-full"
              numberOfMonths={currentLanguage === 'fr' ? 1 : 2} 
              pagedNavigation
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <List className="h-5 w-5 text-primary"/>
              {selectedDate ? getTranslation(T_CALENDAR_PAGE.selectedDate).replace('{date}', format(selectedDate, 'PPP')) : getTranslation(T_CALENDAR_PAGE.pageDescription)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAssessmentsForDay.length > 0 ? (
              <ul className="space-y-3">
                {activeAssessmentsForDay.map(assessment => (
                  <li key={assessment.id} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <h4 className="font-semibold text-primary text-sm">{assessment.vesselName}</h4>
                    <p className="text-xs text-muted-foreground">{assessment.referenceNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        <strong>{getTranslation(T_CALENDAR_PAGE.patrolPeriod)}</strong> {formatPatrolDateRange(assessment)}
                    </p>
                    <p className="text-xs line-clamp-2 mt-1">{assessment.reasonForRequest}</p>
                    <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1 text-xs">
                      <Link href={`/assessments/${assessment.id}`}>{getTranslation(T_CALENDAR_PAGE.viewDetails)}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <Alert variant="default" className="border-dashed">
                <Info className="h-4 w-4"/>
                <AlertDescription>
                  {selectedDate ? getTranslation(T_CALENDAR_PAGE.noAssessmentsOnDate) : getTranslation(T_CALENDAR_PAGE.pageDescription) }
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

