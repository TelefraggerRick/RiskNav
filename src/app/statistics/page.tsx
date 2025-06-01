
"use client";

import { useEffect, useState, useMemo } from 'react';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, VesselRegion, VesselDepartment, RiskAssessmentStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ArrowLeft, BarChart3, MapPinned, Building, ListChecks, Landmark, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext'; 

interface ChartDataItem {
  name: string;
  total: number;
}

interface DepartmentAvgLengthItem {
  name: string; // Using string for name to match ChartDataItem and allow department names
  averageLength: number;
}

const chartColorHSL = (variable: string) => `hsl(var(--${variable}))`;

export default function StatisticsPage() {
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [assessmentsByRegion, setAssessmentsByRegion] = useState<ChartDataItem[]>([]);
  const [assessmentsByDepartment, setAssessmentsByDepartment] = useState<ChartDataItem[]>([]);
  const [assessmentsByStatusData, setAssessmentsByStatusData] = useState<ChartDataItem[]>([]);
  const [overallAveragePatrolLength, setOverallAveragePatrolLength] = useState<number>(0);
  const [averagePatrolLengthByDepartment, setAveragePatrolLengthByDepartment] = useState<DepartmentAvgLengthItem[]>([]);

  const { getTranslation } = useLanguage(); 

  const T = {
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
  };

  useEffect(() => {
    const data: RiskAssessment[] = mockRiskAssessments;
    setTotalAssessments(data.length);

    // Assessments by Region
    const regionCounts: Record<VesselRegion, number> = {
      'Atlantic': 0, 'Central': 0, 'Western': 0, 'Arctic': 0,
    };
    data.forEach(assessment => {
      if (assessment.region && regionCounts[assessment.region] !== undefined) {
        regionCounts[assessment.region]++;
      }
    });
    setAssessmentsByRegion(Object.entries(regionCounts).map(([name, total]) => ({ name: name as VesselRegion, total })));

    // Assessments by Department
    const departmentCounts: Record<VesselDepartment, number> = {
      'Navigation': 0, 'Deck': 0, 'Engine Room': 0, 'Logistics': 0, 'Other': 0,
    };
    data.forEach(assessment => {
      if (assessment.department && departmentCounts[assessment.department] !== undefined) {
        departmentCounts[assessment.department]++;
      }
    });
    setAssessmentsByDepartment(Object.entries(departmentCounts).map(([name, total]) => ({ name: name as VesselDepartment, total })));

    // Assessments by Status
    const statusCounts: Record<string, number> = {};
    data.forEach(assessment => {
      statusCounts[assessment.status] = (statusCounts[assessment.status] || 0) + 1;
    });
    setAssessmentsByStatusData(Object.entries(statusCounts).map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total));

    // Overall Average Patrol Length
    let totalPatrolDays = 0;
    let countWithPatrolLength = 0;
    data.forEach(assessment => {
      if (assessment.patrolLengthDays !== undefined && assessment.patrolLengthDays > 0) {
        totalPatrolDays += assessment.patrolLengthDays;
        countWithPatrolLength++;
      }
    });
    setOverallAveragePatrolLength(countWithPatrolLength > 0 ? parseFloat((totalPatrolDays / countWithPatrolLength).toFixed(1)) : 0);
    
    // Average Patrol Length by Department
    const deptPatrolLengths: Record<VesselDepartment, { totalDays: number; count: number }> = {
      'Navigation': { totalDays: 0, count: 0 },
      'Deck': { totalDays: 0, count: 0 },
      'Engine Room': { totalDays: 0, count: 0 },
      'Logistics': { totalDays: 0, count: 0 },
      'Other': { totalDays: 0, count: 0 },
    };
    data.forEach(assessment => {
      if (assessment.department && assessment.patrolLengthDays !== undefined && assessment.patrolLengthDays > 0) {
        if (deptPatrolLengths[assessment.department]) {
          deptPatrolLengths[assessment.department].totalDays += assessment.patrolLengthDays;
          deptPatrolLengths[assessment.department].count++;
        }
      }
    });
    
    const avgLengthByDeptData = (Object.keys(deptPatrolLengths) as VesselDepartment[]).map(dept => ({
      name: dept,
      averageLength: deptPatrolLengths[dept].count > 0 
        ? parseFloat((deptPatrolLengths[dept].totalDays / deptPatrolLengths[dept].count).toFixed(1))
        : 0,
    })).sort((a,b) => b.averageLength - a.averageLength);
    setAveragePatrolLengthByDepartment(avgLengthByDeptData);

  }, []);

  const commonChartConfig = useMemo(() => ({
    total: {
      label: getTranslation(T.assessmentsLabel),
      color: chartColorHSL("chart-1"),
    },
  }), [getTranslation, T.assessmentsLabel]) satisfies ChartConfig;
  
  const avgLengthChartConfig = useMemo(() => ({
    averageLength: {
      label: getTranslation(T.averageDaysLabel),
      color: chartColorHSL("chart-2"),
    },
  }), [getTranslation, T.averageDaysLabel]) satisfies ChartConfig;

  const statusDisplayConfig = useMemo(() => {
    const config: ChartConfig = {};
    assessmentsByStatusData.forEach((item, index) => {
        config[item.name] = { 
            label: item.name,
            color: chartColorHSL(`chart-${(index % 5) + 1}` as "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5")
        };
    });
    return config;
  }, [assessmentsByStatusData]);


  const renderBarChart = (
    data: ChartDataItem[] | DepartmentAvgLengthItem[], 
    titleKey: keyof typeof T, 
    descriptionKey: keyof typeof T,
    Icon: React.ElementType,
    chartConfig: ChartConfig = commonChartConfig,
    dataKey: string = "total" // "total" or "averageLength"
  ) => (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <Icon className="h-6 w-6" />
          <CardTitle className="text-xl">{getTranslation(T[titleKey])}</CardTitle>
        </div>
        <CardDescription>{getTranslation(T[descriptionKey])}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] sm:h-[350px] w-full">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ right: 20, left: titleKey === "assessmentsByStatusTitle" ? 150 : (titleKey === "averagePatrolLengthByDeptTitle" ? 100 : 100) }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                width={titleKey === "assessmentsByStatusTitle" ? 150 : (titleKey === "averagePatrolLengthByDeptTitle" ? 100 : 100)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={<ChartTooltipContent labelClassName="text-sm" formatter={(value, name, props) => {
                    if (name === getTranslation(T.averageDaysLabel)) {
                        return [`${value} ${getTranslation(T.daysLabel)}`, name];
                    }
                    return [value, name];
                }} />}
              />
              <Bar dataKey={dataKey} radius={4} barSize={30}>
                { (titleKey === "assessmentsByStatusTitle" || chartConfig === statusDisplayConfig) && Array.isArray(data) ? data.map((entry, index) => (
                  <Cell 
                    key={`cell-${entry.name}-${index}`} 
                    fill={(statusDisplayConfig as ChartConfig)[entry.name]?.color || chartColorHSL("chart-1")}
                  />
                )) : 
                (chartConfig[dataKey] && Array.isArray(data)) ? data.map((_entry, index) => (
                     <Cell key={`cell-generic-${index}`} fill={chartConfig[dataKey]?.color || chartColorHSL("chart-1")} />
                )) : null }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-7 w-7" />
            {getTranslation(T.pageTitle)}
        </h1>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {getTranslation(T.backToDashboard)}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg rounded-lg bg-muted/20 md:col-span-1">
          <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                  <Landmark className="h-6 w-6" />
                  <CardTitle className="text-xl">{getTranslation(T.overallSummaryTitle)}</CardTitle>
              </div>
            <CardDescription>{getTranslation(T.overallSummaryDesc)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">{totalAssessments}</p>
            <p className="text-muted-foreground">{getTranslation(T.totalAssessmentsLogged)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg bg-muted/20 md:col-span-1">
          <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                  <Clock className="h-6 w-6" />
                  <CardTitle className="text-xl">{getTranslation(T.overallAveragePatrolLengthTitle)}</CardTitle>
              </div>
            <CardDescription>{getTranslation(T.overallAveragePatrolLengthDesc)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">
              {overallAveragePatrolLength} <span className="text-2xl text-muted-foreground">{getTranslation(T.daysLabel)}</span>
            </p>
          </CardContent>
        </Card>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBarChart(assessmentsByRegion, "assessmentsByRegionTitle", "assessmentsByRegionDesc", MapPinned)}
        {renderBarChart(assessmentsByDepartment, "assessmentsByDeptTitle", "assessmentsByDeptDesc", Building)}
      </div>
      
      {renderBarChart(
        averagePatrolLengthByDepartment, 
        "averagePatrolLengthByDeptTitle", 
        "averagePatrolLengthByDeptDesc", 
        Clock,
        avgLengthChartConfig,
        "averageLength"
      )}

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
            <div className="flex items-center gap-2 text-primary">
                <ListChecks className="h-6 w-6" />
                <CardTitle className="text-xl">{getTranslation(T.assessmentsByStatusTitle)}</CardTitle>
            </div>
          <CardDescription>{getTranslation(T.assessmentsByStatusDesc)}</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] sm:h-[450px] w-full">
          <ChartContainer config={statusDisplayConfig} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assessmentsByStatusData} layout="vertical" margin={{ right: 20, left: 150 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis 
                    dataKey="name" 
                    type="category" 
                    tickLine={false} 
                    axisLine={false} 
                    width={150} 
                    tick={{ fontSize: 12 }}
                />
                <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={<ChartTooltipContent labelClassName="text-sm" />}
                />
                <Bar dataKey="total" radius={4} barSize={30}>
                  {assessmentsByStatusData.map((entry, index) => (
                    <Cell 
                      key={`cell-status-${entry.name}-${index}`} 
                      fill={statusDisplayConfig[entry.name]?.color || chartColorHSL("chart-1")}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

    </div>
  );
}

