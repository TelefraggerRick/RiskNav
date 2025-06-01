
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
// import { mockRiskAssessments } from '@/lib/mockData'; // No longer primary source
import type { RiskAssessment, VesselRegion, VesselDepartment, RiskAssessmentStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ArrowLeft, BarChart3, MapPinned, Building, ListChecks, Landmark, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext'; 
import { getAllRiskAssessments } from '@/services/riskAssessmentService'; // Import Firestore service
import { useToast } from "@/hooks/use-toast";


interface ChartDataItem {
  name: string; // Can be department, region, or status name
  total: number;
}

interface DepartmentAvgLengthItem {
  name: string; // Department name
  averageLength: number;
}

const chartColorHSL = (variable: string) => `hsl(var(--${variable}))`;

const T_STATISTICS_PAGE = {
  pageTitle: { en: "Assessment Statistics", fr: "Statistiques des évaluations" },
  backToDashboard: { en: "Back to Dashboard", fr: "Retour au tableau de bord" },
  overallSummaryTitle: { en: "Overall Summary", fr: "Résumé général" },
  overallSummaryDesc: { en: "High-level overview of all risk assessments.", fr: "Aperçu de haut niveau de toutes les évaluations des risques." },
  totalAssessmentsLogged: { en: "Total Risk Assessments Logged", fr: "Total des évaluations des risques enregistrées" },
  assessmentsByRegionTitle: { en: "Assessments by Region", fr: "Évaluations par région" },
  assessmentsByRegionDesc: { en: "Distribution of assessments across different operational regions.", fr: "Répartition des évaluations entre les différentes régions opérationnelles." },
  assessmentsByDeptTitle: { en: "Assessments by Department", fr: "Évaluations par département" },
  assessmentsByDeptDesc: { en: "Breakdown of assessments by the vessel department involved.", fr: "Ventilation des évaluations par département de navire concerné." },
  assessmentsByStatusTitle: { en: "Assessments by Status", fr: "Évaluations par statut" },
  assessmentsByStatusDesc: { en: "Current status distribution of all assessments.", fr: "Répartition actuelle du statut de toutes les évaluations." },
  assessmentsLabel: { en: "Assessments", fr: "Évaluations" },
  overallAveragePatrolLengthTitle: { en: "Overall Average Patrol Length", fr: "Durée moyenne globale des patrouilles" },
  overallAveragePatrolLengthDesc: { en: "Average duration of patrols across all assessments.", fr: "Durée moyenne des patrouilles pour toutes les évaluations."},
  daysLabel: { en: "days", fr: "jours" },
  averagePatrolLengthByDeptTitle: { en: "Average Patrol Length by Department", fr: "Durée moyenne des patrouilles par département" },
  averagePatrolLengthByDeptDesc: { en: "Average patrol duration for assessments, broken down by department.", fr: "Durée moyenne des patrouilles pour les évaluations, ventilée par département." },
  averageDaysLabel: { en: "Avg. Days", fr: "Jours moy." },
  Navigation: { en: 'Navigation', fr: 'Navigation'},
  Deck: { en: 'Deck', fr: 'Pont'},
  EngineRoom: { en: 'Engine Room', fr: 'Salle des machines'},
  Logistics: { en: 'Logistics', fr: 'Logistique'},
  Other: { en: 'Other', fr: 'Autre'},
  Atlantic: { en: 'Atlantic', fr: 'Atlantique' },
  Central: { en: 'Central', fr: 'Centre' },
  Western: { en: 'Western', fr: 'Ouest' },
  Arctic: { en: 'Arctic', fr: 'Arctique' },
  loadingStatistics: { en: "Loading statistics...", fr: "Chargement des statistiques..." },
  errorLoadingStats: { en: "Error Loading Statistics", fr: "Erreur de chargement des statistiques"},
  errorLoadingStatsDesc: { en: "Could not fetch data for statistics.", fr: "Impossible de récupérer les données pour les statistiques."},
};


export default function StatisticsPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAssessmentsCount, setTotalAssessmentsCount] = useState(0);
  const [assessmentsByRegionData, setAssessmentsByRegionData] = useState<ChartDataItem[]>([]);
  const [assessmentsByDepartmentData, setAssessmentsByDepartmentData] = useState<ChartDataItem[]>([]);
  const [assessmentsByStatusData, setAssessmentsByStatusData] = useState<ChartDataItem[]>([]);
  const [overallAveragePatrolLength, setOverallAveragePatrolLength] = useState<number>(0);
  const [averagePatrolLengthByDepartmentData, setAveragePatrolLengthByDepartmentData] = useState<DepartmentAvgLengthItem[]>([]);

  const { getTranslation } = useLanguage(); 
  const { toast } = useToast();

  const processData = useCallback((data: RiskAssessment[]) => {
    setTotalAssessmentsCount(data.length);

    const regionCounts: Record<string, number> = {};
    data.forEach(assessment => {
      if (assessment.region) {
        regionCounts[assessment.region] = (regionCounts[assessment.region] || 0) + 1;
      }
    });
    setAssessmentsByRegionData(Object.entries(regionCounts).map(([name, total]) => ({ name: getTranslation(T_STATISTICS_PAGE[name as keyof typeof T_STATISTICS_PAGE]), total })).sort((a,b) => b.total - a.total));

    const departmentCounts: Record<string, number> = {};
    data.forEach(assessment => {
      if (assessment.department) {
        departmentCounts[assessment.department] = (departmentCounts[assessment.department] || 0) + 1;
      }
    });
    setAssessmentsByDepartmentData(Object.entries(departmentCounts).map(([name, total]) => ({ name: getTranslation(T_STATISTICS_PAGE[name.replace(' ', '') as keyof typeof T_STATISTICS_PAGE]), total })).sort((a,b) => b.total - a.total));
    
    const statusCounts: Record<string, number> = {};
    data.forEach(assessment => {
      statusCounts[assessment.status] = (statusCounts[assessment.status] || 0) + 1;
    });
    setAssessmentsByStatusData(Object.entries(statusCounts).map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total));
    
    let totalPatrolDays = 0;
    let countWithPatrolLength = 0;
    data.forEach(assessment => {
      if (assessment.patrolLengthDays !== undefined && assessment.patrolLengthDays > 0) {
        totalPatrolDays += assessment.patrolLengthDays;
        countWithPatrolLength++;
      }
    });
    setOverallAveragePatrolLength(countWithPatrolLength > 0 ? parseFloat((totalPatrolDays / countWithPatrolLength).toFixed(1)) : 0);
    
    const deptPatrolLengths: Record<string, { totalDays: number; count: number }> = {};
    (Object.keys(T_STATISTICS_PAGE) as Array<keyof typeof T_STATISTICS_PAGE>)
        .filter(key => ['Navigation', 'Deck', 'EngineRoom', 'Logistics', 'Other'].includes(key))
        .forEach(key => {
            deptPatrolLengths[getTranslation(T_STATISTICS_PAGE[key as 'Navigation'])] = { totalDays: 0, count: 0 };
        });

    data.forEach(assessment => {
      if (assessment.department && assessment.patrolLengthDays !== undefined && assessment.patrolLengthDays > 0) {
        const departmentName = getTranslation(T_STATISTICS_PAGE[assessment.department.replace(' ', '') as 'Navigation' | 'Deck' | 'EngineRoom' | 'Logistics' | 'Other']);
        if (deptPatrolLengths[departmentName]) {
          deptPatrolLengths[departmentName].totalDays += assessment.patrolLengthDays;
          deptPatrolLengths[departmentName].count++;
        }
      }
    });
    
    const avgLengthByDeptData = Object.entries(deptPatrolLengths).map(([deptName, {totalDays, count}]) => ({
      name: deptName,
      averageLength: count > 0 
        ? parseFloat((totalDays / count).toFixed(1))
        : 0,
    })).sort((a,b) => b.averageLength - a.averageLength);
    setAveragePatrolLengthByDepartmentData(avgLengthByDeptData);
  }, [getTranslation]);


  useEffect(() => {
    const fetchAndProcessData = async () => {
      setIsLoading(true);
      try {
        const fetchedAssessments = await getAllRiskAssessments();
        setAssessments(fetchedAssessments); // Store raw data if needed elsewhere
        processData(fetchedAssessments);   // Process for statistics
      } catch (error) {
        console.error("Error fetching assessments for statistics:", error);
        toast({
          title: getTranslation(T_STATISTICS_PAGE.errorLoadingStats),
          description: getTranslation(T_STATISTICS_PAGE.errorLoadingStatsDesc),
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAndProcessData();
  }, [getTranslation, processData, toast]); // processData is memoized by useCallback

  const departmentDisplayConfig = useMemo((): ChartConfig => ({
    [getTranslation(T_STATISTICS_PAGE.Navigation)]: { label: getTranslation(T_STATISTICS_PAGE.Navigation), color: 'hsl(210, 65%, 50%)' }, 
    [getTranslation(T_STATISTICS_PAGE.Deck)]: { label: getTranslation(T_STATISTICS_PAGE.Deck), color: 'hsl(210, 25%, 35%)' }, 
    [getTranslation(T_STATISTICS_PAGE.EngineRoom)]: { label: getTranslation(T_STATISTICS_PAGE.EngineRoom), color: 'hsl(270, 50%, 55%)' }, 
    [getTranslation(T_STATISTICS_PAGE.Logistics)]: { label: getTranslation(T_STATISTICS_PAGE.Logistics), color: 'hsl(120, 50%, 45%)' }, 
    [getTranslation(T_STATISTICS_PAGE.Other)]: { label: getTranslation(T_STATISTICS_PAGE.Other), color: 'hsl(30, 80%, 55%)' }, 
  }), [getTranslation]);

  const regionDisplayConfig = useMemo((): ChartConfig => ({
    [getTranslation(T_STATISTICS_PAGE.Atlantic)]: { label: getTranslation(T_STATISTICS_PAGE.Atlantic), color: chartColorHSL("chart-1") }, 
    [getTranslation(T_STATISTICS_PAGE.Central)]: { label: getTranslation(T_STATISTICS_PAGE.Central), color: chartColorHSL("chart-2") },  
    [getTranslation(T_STATISTICS_PAGE.Western)]: { label: getTranslation(T_STATISTICS_PAGE.Western), color: chartColorHSL("chart-3") },  
    [getTranslation(T_STATISTICS_PAGE.Arctic)]: { label: getTranslation(T_STATISTICS_PAGE.Arctic), color: chartColorHSL("chart-4") },   
  }), [getTranslation]);

  const statusDisplayConfig = useMemo((): ChartConfig => {
    const config: ChartConfig = {};
    assessmentsByStatusData.forEach((item, index) => { // Use state variable already set
        config[item.name] = { 
            label: item.name, 
            color: chartColorHSL(`chart-${(index % 5) + 1}` as "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5")
        };
    });
    return config;
  }, [assessmentsByStatusData]); // Depends on the processed data
  
  const avgLengthDataKeyConfig = useMemo((): ChartConfig => ({ 
    averageLength: {
      label: getTranslation(T_STATISTICS_PAGE.averageDaysLabel),
      color: chartColorHSL("chart-2"), 
    },
  }), [getTranslation]);


  const renderBarChart = (
    data: ChartDataItem[] | DepartmentAvgLengthItem[], 
    titleKey: keyof typeof T_STATISTICS_PAGE, 
    descriptionKey: keyof typeof T_STATISTICS_PAGE,
    Icon: React.ElementType,
    chartConfigToUse: ChartConfig, 
    dataKey: string = "total" 
  ) => (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <Icon className="h-6 w-6" />
          <CardTitle className="text-xl">{getTranslation(T_STATISTICS_PAGE[titleKey])}</CardTitle>
        </div>
        <CardDescription>{getTranslation(T_STATISTICS_PAGE[descriptionKey])}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] sm:h-[350px] w-full">
        <ChartContainer config={chartConfigToUse} className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ right: 20, left: (titleKey === "assessmentsByStatusTitle" || titleKey === "assessmentsByDeptTitle" || titleKey === "averagePatrolLengthByDeptTitle") ? 120 : 100 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={dataKey === "averageLength"} />
              <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                width={(titleKey === "assessmentsByStatusTitle" || titleKey === "assessmentsByDeptTitle" || titleKey === "averagePatrolLengthByDeptTitle") ? 120 : 100}
                tick={{ fontSize: 12 }}
                className="truncate"
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={<ChartTooltipContent labelClassName="text-sm" formatter={(value, name, props) => {
                    if (props.dataKey === "averageLength") { 
                        return [`${value} ${getTranslation(T_STATISTICS_PAGE.daysLabel)}`, props.payload?.name || name];
                    }
                    return [value, props.payload?.name || name];
                }} />}
              />
              <Bar dataKey={dataKey} radius={4} barSize={30}>
                {data.map((entry, index) => {
                    const color = chartConfigToUse[entry.name]?.color || 
                                  chartConfigToUse[dataKey]?.color ||    
                                  chartColorHSL("chart-1"); 
                    return <Cell key={`cell-${entry.name}-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-xl text-muted-foreground">{getTranslation(T_STATISTICS_PAGE.loadingStatistics)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-7 w-7" />
            {getTranslation(T_STATISTICS_PAGE.pageTitle)}
        </h1>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {getTranslation(T_STATISTICS_PAGE.backToDashboard)}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg rounded-lg bg-muted/20 md:col-span-1">
          <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                  <Landmark className="h-6 w-6" />
                  <CardTitle className="text-xl">{getTranslation(T_STATISTICS_PAGE.overallSummaryTitle)}</CardTitle>
              </div>
            <CardDescription>{getTranslation(T_STATISTICS_PAGE.overallSummaryDesc)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">{totalAssessmentsCount}</p>
            <p className="text-muted-foreground">{getTranslation(T_STATISTICS_PAGE.totalAssessmentsLogged)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg bg-muted/20 md:col-span-1">
          <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                  <Clock className="h-6 w-6" />
                  <CardTitle className="text-xl">{getTranslation(T_STATISTICS_PAGE.overallAveragePatrolLengthTitle)}</CardTitle>
              </div>
            <CardDescription>{getTranslation(T_STATISTICS_PAGE.overallAveragePatrolLengthDesc)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">
              {overallAveragePatrolLength} <span className="text-2xl text-muted-foreground">{getTranslation(T_STATISTICS_PAGE.daysLabel)}</span>
            </p>
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBarChart(assessmentsByRegionData, "assessmentsByRegionTitle", "assessmentsByRegionDesc", MapPinned, regionDisplayConfig, "total")}
        {renderBarChart(assessmentsByDepartmentData, "assessmentsByDeptTitle", "assessmentsByDeptDesc", Building, departmentDisplayConfig, "total")}
      </div>
      
      {renderBarChart(
        averagePatrolLengthByDepartmentData, 
        "averagePatrolLengthByDeptTitle", 
        "averagePatrolLengthByDeptDesc", 
        Clock,
        departmentDisplayConfig, 
        "averageLength"
      )}

      {renderBarChart(
        assessmentsByStatusData, 
        "assessmentsByStatusTitle", 
        "assessmentsByStatusDesc", 
        ListChecks,
        statusDisplayConfig,
        "total"
      )}

    </div>
  );
}
