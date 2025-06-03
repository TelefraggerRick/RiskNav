
"use client";

import React from 'react';
import Link from 'next/link';
import type { RiskAssessment, ApprovalLevel, ApprovalDecision, ApprovalStep } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Hourglass, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2, XCircle, Info,
  ChevronRight, Building, UserCheck, UserCircle as UserCircleIcon, FileWarning, Edit, HelpCircle, Users
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface WorkflowStatusCardProps {
  assessment: RiskAssessment;
}

const approvalLevelsOrder: ApprovalLevel[] = ['Crewing Standards and Oversight', 'Senior Director', 'Director General'];

const T_STATUS_CARD = {
  viewDetails: { en: "View Details", fr: "Voir les détails" },
  overallStatus: { en: "Overall Status:", fr: "Statut général :" },
  by: { en: "By:", fr: "Par :" },
  at: { en: "at", fr: "à" },
  pending: { en: "Pending", fr: "En attente" },
  notes: { en: "Notes:", fr: "Notes :" },
  complianceFlags: { en: "Compliance Flags:", fr: "Indicateurs de conformité :" },
  fsmNonCompliance: { en: "FSM Non-Compliance", fr: "Non-conformité MSF" },
  mprNonCompliance: { en: "MPR Non-Compliance", fr: "Non-conformité RPM" },
  crewingProfileDeviation: { en: "Crewing Profile Deviation", fr: "Écart au profil d'armement" },
  csoLevel: { en: "Crewing Standards & Oversight", fr: "Bureau de la conformité et des normes" },
  sdLevel: { en: "Senior Director", fr: "Directeur Principal" },
  dgLevel: { en: "Director General", fr: "Directeur Général" },
  decision: { en: "Decision", fr: "Décision" },
  userName: { en: "User", fr: "Utilisateur" },
  date: { en: "Date", fr: "Date" },
};

const statusConfig: Record<RiskAssessment['status'], { icon: React.ElementType, badgeClass: string }> = {
    'Draft': { icon: Edit, badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300' },
    'Pending Crewing Standards and Oversight': { icon: Building, badgeClass: 'bg-yellow-100 text-yellow-800 border border-yellow-400' },
    'Pending Senior Director': { icon: UserCheck, badgeClass: 'bg-cyan-100 text-cyan-800 border border-cyan-400' },
    'Pending Director General': { icon: UserCircleIcon, badgeClass: 'bg-purple-100 text-purple-800 border border-purple-400' },
    'Needs Information': { icon: FileWarning, badgeClass: 'bg-orange-100 text-orange-800 border border-orange-400' },
    'Approved': { icon: CheckCircle2, badgeClass: 'bg-green-100 text-green-800 border border-green-400' },
    'Rejected': { icon: XCircle, badgeClass: 'bg-red-100 text-red-800 border border-red-400' },
  };

const decisionIcons: Record<ApprovalDecision | 'Pending', React.ElementType> = {
  'Approved': ThumbsUp,
  'Rejected': ThumbsDown,
  'Needs Information': MessageSquare,
  'Pending': Hourglass,
};

const decisionBadgeConfig: Record<ApprovalDecision | 'Pending', { variant: 'default' | 'secondary' | 'destructive' | 'outline', textClass?: string }> = {
  'Approved': { variant: 'default', textClass: 'text-green-700 bg-green-100 border-green-300 hover:bg-green-200' },
  'Rejected': { variant: 'destructive', textClass: 'text-red-700 bg-red-100 border-red-300 hover:bg-red-200' },
  'Needs Information': { variant: 'secondary', textClass: 'text-orange-700 bg-orange-100 border-orange-300 hover:bg-orange-200' },
  'Pending': { variant: 'outline', textClass: 'text-muted-foreground' },
};


const WorkflowStatusCard: React.FC<WorkflowStatusCardProps> = ({ assessment }) => {
  const { getTranslation } = useLanguage();

  const getLevelTranslation = (level: ApprovalLevel): string => {
    if (level === 'Crewing Standards and Oversight') return getTranslation(T_STATUS_CARD.csoLevel);
    if (level === 'Senior Director') return getTranslation(T_STATUS_CARD.sdLevel);
    if (level === 'Director General') return getTranslation(T_STATUS_CARD.dgLevel);
    return level;
  };

  const overallStatusInfo = statusConfig[assessment.status] || { icon: HelpCircle, badgeClass: 'bg-gray-200 text-gray-800' };
  const OverallStatusIcon = overallStatusInfo.icon;

  const formatDateSafe = (dateStr: string | undefined, template: string = `MMM d, yyyy '${getTranslation(T_STATUS_CARD.at)}' HH:mm`) => {
    if (!dateStr) return '';
    try {
      const parsedDate = parseISO(dateStr);
      if (isValid(parsedDate)) {
        return format(parsedDate, template);
      }
    } catch (e) { /* fall through */ }
    return dateStr;
  };

  const renderTooltipContent = (step: ApprovalStep) => {
    if (!step.decision) return null;

    const complianceItems: string[] = [];
    if (step.level === 'Crewing Standards and Oversight') {
        if (step.isAgainstFSM) complianceItems.push(getTranslation(T_STATUS_CARD.fsmNonCompliance));
        if (step.isAgainstMPR) complianceItems.push(getTranslation(T_STATUS_CARD.mprNonCompliance));
        if (step.isAgainstCrewingProfile) complianceItems.push(getTranslation(T_STATUS_CARD.crewingProfileDeviation));
    }

    return (
        <div className="text-xs space-y-1 p-1">
            <p><strong>{getTranslation(T_STATUS_CARD.decision)}:</strong> {step.decision}</p>
            {step.userName && <p><strong>{getTranslation(T_STATUS_CARD.by)}</strong> {step.userName}</p>}
            {step.date && <p><strong>{getTranslation(T_STATUS_CARD.date)}:</strong> {formatDateSafe(step.date, 'PPpp')}</p>}
            {step.notes && <p className="mt-1"><strong>{getTranslation(T_STATUS_CARD.notes)}</strong> <span className="whitespace-pre-wrap">{step.notes}</span></p>}
            {complianceItems.length > 0 && (
                 <div className="mt-1 pt-1 border-t">
                    <p className="font-semibold">{getTranslation(T_STATUS_CARD.complianceFlags)}</p>
                    <ul className="list-disc list-inside pl-1">
                        {complianceItems.map(item => <li key={item}>{item}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
  };


  return (
    <Card className="shadow-md rounded-lg overflow-hidden">
      <CardHeader className="bg-muted/20">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
          <div>
            <CardTitle className="text-lg font-semibold text-primary">{assessment.vesselName}</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">{assessment.referenceNumber}</CardDescription>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
             <Badge className={`text-xs px-2 py-0.5 ${overallStatusInfo.badgeClass}`}>
                <OverallStatusIcon className="h-3.5 w-3.5 mr-1.5" />
                {assessment.status}
            </Badge>
            <p className="text-xs text-muted-foreground">
                Last Updated: {formatDateSafe(assessment.lastModified)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <TooltipProvider delayDuration={100}>
            <div className="flex flex-row items-stretch justify-start gap-2 md:gap-3 overflow-x-auto py-2">
            {approvalLevelsOrder.map((level, index) => {
                const step = assessment.approvalSteps.find(s => s.level === level);
                const decision = step?.decision || 'Pending';
                const Icon = decisionIcons[decision];
                const badgeConfig = decisionBadgeConfig[decision];

                let isHighlighted = false;
                if (assessment.status.startsWith('Pending') && assessment.status.includes(level)) {
                    isHighlighted = true;
                } else if (assessment.status === 'Needs Information' && step?.decision === 'Needs Information') {
                    isHighlighted = true;
                } else if (assessment.status === 'Rejected' && step?.decision === 'Rejected' && (level === 'Senior Director' || level === 'Director General')) {
                    isHighlighted = true;
                }

                const stageElement = (
                    <div className={cn(
                        "flex-shrink-0 w-[140px] flex flex-col items-center p-2 rounded-md border",
                        isHighlighted ? 'ring-2 ring-primary shadow-md bg-background' : 'bg-muted/40 hover:bg-muted/70 transition-colors'
                    )}>
                        <Icon className={cn("h-5 w-5 mb-1", badgeConfig.textClass?.split(' ').find(c => c.startsWith('text-')) || 'text-foreground')} />
                        <h4 className={cn("text-xs text-center font-medium mb-1 truncate w-full", badgeConfig.textClass?.split(' ').find(c => c.startsWith('text-')) || 'text-foreground')}>{getLevelTranslation(level)}</h4>
                        <Badge variant={badgeConfig.variant} className={cn("text-xs px-1.5 py-0.5 whitespace-nowrap", badgeConfig.textClass)}>
                            {step?.decision || getTranslation(T_STATUS_CARD.pending)}
                        </Badge>
                    </div>
                );

                return (
                <React.Fragment key={level}>
                    {step?.decision ? (
                    <Tooltip>
                        <TooltipTrigger asChild>{stageElement}</TooltipTrigger>
                        <TooltipContent className="max-w-xs sm:max-w-sm md:max-w-md" side="bottom" align="center">
                            {renderTooltipContent(step)}
                        </TooltipContent>
                    </Tooltip>
                    ) : (
                    stageElement
                    )}

                    {index < approvalLevelsOrder.length - 1 && (
                    <div className="flex-none flex items-center justify-center px-1 sm:px-1.5">
                        <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                    )}
                </React.Fragment>
                );
            })}
            </div>
        </TooltipProvider>
        <div className="mt-6 text-right">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/assessments/${assessment.id}`}>
              {getTranslation(T_STATUS_CARD.viewDetails)}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowStatusCard;
