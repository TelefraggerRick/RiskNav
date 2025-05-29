
"use client";

import { useEffect, useState, useMemo } from 'react';
import { mockRiskAssessments } from '@/lib/mockData';
import type { RiskAssessment, VesselRegion, VesselDepartment, RiskAssessmentStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'; // Added Cell
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ArrowLeft, BarChart3, MapPinned, Building, ListChecks, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ChartDataItem {
  name: string;
  total: number;
}

const chartColorHSL = (variable: string) => `hsl(var(--${variable}))`;

export default function StatisticsPage() {
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [assessmentsByRegion, setAssessmentsByRegion] = useState<ChartDataItem[]>([]);
  const [assessmentsByDepartment, setAssessmentsByDepartment] = useState<ChartDataItem[]>([]);
  const [assessmentsByStatusData, setAssessmentsByStatusData] = useState<ChartDataItem[]>([]); // Renamed for clarity

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

  const commonChartConfig = {
    total: {
      label: "Assessments",
      color: chartColorHSL("chart-1"),
    },
  } satisfies ChartConfig;
  
  // This config is used by ChartContainer for the status chart.
  // It maps status names (e.g., "Approved") to their display properties.
  const statusDisplayConfig = useMemo(() => {
    const config: ChartConfig = {};
    assessmentsByStatusData.forEach((item, index) => {
        config[item.name] = { // item.name is the status like "Approved", "Rejected"
            label: item.name,
            color: chartColorHSL(`chart-${(index % 5) + 1}` as "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5")
        };
    });
    return config;
  }, [assessmentsByStatusData]);


  const renderBarChart = (
    data: ChartDataItem[], 
    title: string, 
    description: string,
    Icon: React.ElementType,
    chartConfig: ChartConfig = commonChartConfig, // Default to commonChartConfig
    dataKey: string = "total" // Default dataKey for simple charts
  ) => (
    <Card className="shadow-lg rounded-lg">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <Icon className="h-6 w-6" />
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] sm:h-[350px] w-full">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ right: 20, left: title === "Assessments by Status" ? 150 : 100 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                width={title === "Assessments by Status" ? 150 : 100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                content={<ChartTooltipContent />} // Let default content handle it
              />
              <Bar dataKey={dataKey} radius={4} barSize={30}>
                 {/* For charts where each bar segment might need a different color based on its data item */}
                {title === "Assessments by Status" && data.map((entry, index) => (
                  <Cell 
                    key={`cell-${entry.name}-${index}`} 
                    fill={statusDisplayConfig[entry.name]?.color || chartColorHSL("chart-1")}
                  />
                ))}
                {/* For simple charts with a single color bar series, no Cells needed if color is on <Bar /> */}
                {(title !== "Assessments by Status" && chartConfig[dataKey]) && (
                    <Cell fill={chartConfig[dataKey]?.color} />
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
            Assessment Statistics
        </h1>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg rounded-lg bg-muted/20">
        <CardHeader>
            <div className="flex items-center gap-2 text-primary">
                <Landmark className="h-6 w-6" />
                <CardTitle className="text-xl">Overall Summary</CardTitle>
            </div>
          <CardDescription>High-level overview of all risk assessments.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-foreground">{totalAssessments}</p>
          <p className="text-muted-foreground">Total Risk Assessments Logged</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderBarChart(assessmentsByRegion, "Assessments by Region", "Distribution of assessments across different operational regions.", MapPinned)}
        {renderBarChart(assessmentsByDepartment, "Assessments by Department", "Breakdown of assessments by the vessel department involved.", Building)}
      </div>
      
      {/* Specific rendering for Assessments by Status chart */}
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
            <div className="flex items-center gap-2 text-primary">
                <ListChecks className="h-6 w-6" />
                <CardTitle className="text-xl">Assessments by Status</CardTitle>
            </div>
          <CardDescription>Current status distribution of all assessments.</CardDescription>
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
                    content={<ChartTooltipContent />} // Let default handle it, config should provide labels
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
