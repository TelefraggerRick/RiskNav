
"use client";

import { useEffect, useState, useMemo } from 'react';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, VesselRegion, VesselDepartment, RiskAssessmentStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ArrowLeft, BarChart3, MapPinned, Building, ListChecks, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext'; // Added

interface ChartDataItem {
  name: string;
  total: number;
}

const chartColorHSL = (variable: string) => `hsl(var(--${variable}))`;

export default function StatisticsPage() {
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [assessmentsByRegion, setAssessmentsByRegion] = useState<ChartDataItem[]>([]);
  const [assessmentsByDepartment, setAssessmentsByDepartment] = useState<ChartDataItem[]>([]);
  const [assessmentsByStatusData, setAssessmentsByStatusData] = useState<ChartDataItem[]>([]);
  const { getTranslation } = useLanguage(); // Added

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
  };

  useEffect(() => {
    const data: RiskAssessment[] = mockRiskAssessments;
    setTotalAssessments(data.length);

    const regionCounts: Record<VesselRegion, number> = {
      'Atlantic': 0,
      'Central': 0,
      'Western': 0,
      'Arctic': 0,
    };
    data.forEach(assessment => {
      if (assessment.region && regionCounts[assessment.region] !== undefined) {
        regionCounts[assessment.region]++;
      }
    });
    setAssessmentsByRegion(Object.entries(regionCounts).map(([name, total]) => ({ name, total })));

    const departmentCounts: Record<VesselDepartment, number> = {
      'Navigation': 0,
      'Deck': 0,
      'Engine Room': 0,
      'Logistics': 0,
      'Other': 0,
    };
    data.forEach(assessment => {
      if (assessment.department && departmentCounts[assessment.department] !== undefined) {
        departmentCounts[assessment.department]++;
      }
    });
    setAssessmentsByDepartment(Object.entries(departmentCounts).map(([name, total]) => ({ name, total })));

    const statusCounts: Record<string, number> = {};
    data.forEach(assessment => {
      statusCounts[assessment.status] = (statusCounts[assessment.status] || 0) + 1;
    });
    setAssessmentsByStatusData(Object.entries(statusCounts).map(([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total));

  }, []);

  const commonChartConfig = useMemo(() => ({
    total: {
      label: getTranslation(T.assessmentsLabel),
      color: chartColorHSL("chart-1"),
    },
  }), [getTranslation, T.assessmentsLabel]) satisfies ChartConfig;
  
  const statusDisplayConfig = useMemo(() => {
    const config: ChartConfig = {};
    assessmentsByStatusData.forEach((item, index) => {
        config[item.name] = { 
            label: item.name, // Status names are usually codes, might not translate directly or handled by full i18n system
            color: chartColorHSL(`chart-${(index % 5) + 1}` as "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5")
        };
    });
    return config;
  }, [assessmentsByStatusData]);


  const renderBarChart = (
    data: ChartDataItem[], 
    titleKey: keyof typeof T, 
    descriptionKey: keyof typeof T,
    Icon: React.ElementType,
    chartConfig: ChartConfig = commonChartConfig,
    dataKey: string = "total"
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
            <BarChart data={data} layout="vertical" margin={{ right: 20, left: titleKey === "assessmentsByStatusTitle" ? 150 : 100 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                width={titleKey === "assessmentsByStatusTitle" ? 150 : 100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={<ChartTooltipContent labelClassName="text-sm" />}
              />
              <Bar dataKey={dataKey} radius={4} barSize={30}>
                {titleKey === "assessmentsByStatusTitle" && data.map((entry, index) => (
                  <Cell 
                    key={`cell-${entry.name}-${index}`} 
                    fill={statusDisplayConfig[entry.name]?.color || chartColorHSL("chart-1")}
                  />
                ))}
                {(titleKey !== "assessmentsByStatusTitle" && chartConfig[dataKey]) && (
                    // For simple charts, apply color directly to Bar or use a single Cell
                    // This assumes `dataKey` (e.g. "total") exists in chartConfig
                    <Cell fill={chartConfig[dataKey]?.color || chartColorHSL("chart-1")} />
                )}
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

      <Card className="shadow-lg rounded-lg bg-muted/20">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBarChart(assessmentsByRegion, "assessmentsByRegionTitle", "assessmentsByRegionDesc", MapPinned)}
        {renderBarChart(assessmentsByDepartment, "assessmentsByDeptTitle", "assessmentsByDeptDesc", Building)}
      </div>
      
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
