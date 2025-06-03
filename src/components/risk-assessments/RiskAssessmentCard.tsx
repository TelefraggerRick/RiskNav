
"use client";

import Link from 'next/link';
import type { RiskAssessment, RiskAssessmentStatus, VesselDepartment } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Ship, CalendarDays, AlertTriangle, CheckCircle2, XCircle, Info, Clock, Edit, Building, UserCheck, UserCircle as UserIcon, FileWarning, Globe, Anchor, Cog, Package } from 'lucide-react'; 
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext'; 
import { cn } from '@/lib/utils';
import React from 'react';

interface RiskAssessmentCardProps {
  assessment: RiskAssessment;
}

const statusConfig: Record<RiskAssessmentStatus, { icon: React.ElementType, badgeClass: string }> = {
  'Draft': { icon: Edit, badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300' },
  'Pending Crewing Standards and Oversight': { icon: Building, badgeClass: 'bg-yellow-100 text-yellow-800 border border-yellow-400' },
  'Pending Senior Director': { icon: UserCheck, badgeClass: 'bg-cyan-100 text-cyan-800 border border-cyan-400' },
  'Pending Director General': { icon: UserIcon, badgeClass: 'bg-purple-100 text-purple-800 border border-purple-400' },
  'Needs Information': { icon: FileWarning, badgeClass: 'bg-orange-100 text-orange-800 border border-orange-400' },
  'Approved': { icon: CheckCircle2, badgeClass: 'bg-green-100 text-green-800 border border-green-400' },
  'Rejected': { icon: XCircle, badgeClass: 'bg-red-100 text-red-800 border border-red-400' },
};

const departmentColorConfig: Record<VesselDepartment, { cardClass: string, icon: React.ElementType }> = {
  'Navigation': { cardClass: 'bg-blue-100 border-blue-300 hover:border-blue-400 dark:bg-blue-800/40 dark:border-blue-600 dark:hover:border-blue-500', icon: Globe },
  'Deck': { cardClass: 'bg-slate-100 border-slate-300 hover:border-slate-400 dark:bg-slate-800/40 dark:border-slate-600 dark:hover:border-slate-500', icon: Anchor },
  'Engine Room': { cardClass: 'bg-purple-100 border-purple-300 hover:border-purple-400 dark:bg-purple-800/40 dark:border-purple-600 dark:hover:border-purple-500', icon: Cog },
  'Logistics': { cardClass: 'bg-green-100 border-green-300 hover:border-green-400 dark:bg-green-800/40 dark:border-green-600 dark:hover:border-green-500', icon: Package },
  'Other': { cardClass: 'bg-orange-100 border-orange-300 hover:border-orange-400 dark:bg-orange-800/40 dark:border-orange-600 dark:hover:border-orange-500', icon: Info },
};

const T_CARD = {
    reason: { en: "Reason:", fr: "Raison :" },
    proposedDeviations: { en: "Proposed Deviations:", fr: "Dérogations proposées :" },
    viewDetails: { en: "View Details", fr: "Voir les détails" },
    department: { en: "Department:", fr: "Département :" },
  };

const RiskAssessmentCard: React.FC<RiskAssessmentCardProps> = React.memo(({ assessment }) => {
  const currentStatusConfig = statusConfig[assessment.status] || { icon: Info, badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300' };
  const StatusIcon = currentStatusConfig.icon;
  
  const currentDepartmentConfig = assessment.department 
    ? departmentColorConfig[assessment.department] 
    : { cardClass: 'bg-card hover:border-muted-foreground/50', icon: Ship };
  const DepartmentIcon = currentDepartmentConfig.icon;

  const { getTranslation } = useLanguage(); 

  const submissionDate = parseISO(assessment.submissionDate);
  const formattedSubmissionDate = isValid(submissionDate) 
    ? formatDistanceToNow(submissionDate, { addSuffix: true }) 
    : "Invalid date";

  return (
    <Card className={cn(
        "flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg overflow-hidden",
        currentDepartmentConfig.cardClass
      )}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold text-primary flex items-center gap-2 truncate">
            <Ship className="h-5 w-5 shrink-0" />
            <span className="truncate" title={assessment.vesselName}>{assessment.vesselName}</span>
          </CardTitle>
          <Badge
            className={`text-xs px-2 py-1 whitespace-nowrap rounded-md font-medium ${currentStatusConfig.badgeClass}`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {assessment.status} 
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
          {assessment.referenceNumber}
          {assessment.region && (
            <>
              <span className="mx-1">·</span>
              <Globe className="h-3 w-3 inline-block mr-0.5" />
              {assessment.region} 
            </>
          )}
        </CardDescription>
         {assessment.department && (
            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
                <DepartmentIcon className="h-3 w-3"/>
                <span>{assessment.department}</span> 
            </div>
        )}
      </CardHeader>
      <CardContent className="flex-grow space-y-2 text-sm py-3">
        <div className="space-y-1">
            <p className="font-medium">{getTranslation(T_CARD.reason)}</p>
            <p className="line-clamp-2 text-muted-foreground" title={assessment.reasonForRequest}>
            {assessment.reasonForRequest}
            </p>
        </div>
         <div className="space-y-1">
            <p className="font-medium">{getTranslation(T_CARD.proposedDeviations)}</p>
            <p className="line-clamp-2 text-muted-foreground" title={assessment.proposedOperationalDeviations}>
            {assessment.proposedOperationalDeviations}
            </p>
        </div>
      </CardContent>
      <CardFooter className={cn("border-t pt-3 pb-3", currentDepartmentConfig.cardClass.includes("bg-card") ? "bg-muted/30" : "")}>
        <div className="flex justify-between items-center w-full">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                <span>{formattedSubmissionDate}</span>
            </div>
            <Link href={`/assessments/${assessment.id}`} passHref>
              <Button variant="outline" size="sm" className="bg-card/50 hover:bg-card">
                {getTranslation(T_CARD.viewDetails)}
              </Button>
            </Link>
        </div>
      </CardFooter>
    </Card>
  );
});

RiskAssessmentCard.displayName = 'RiskAssessmentCard';
export default RiskAssessmentCard;

