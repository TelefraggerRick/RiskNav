
"use client";

import React from 'react';
import Link from 'next/link';
import type { RiskAssessment, ApprovalLevel, ApprovalDecision, ApprovalStep } from '@/lib/types';
import { approvalLevelsOrder } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Hourglass, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2, XCircle, Info,
  Building, UserCheck as UserCheckIcon, UserCircle as UserCircleIconLucide, Edit, HelpCircle, ExternalLink, User
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface WorkflowTimelineRowProps {
  assessment: RiskAssessment;
}

const T_TIMELINE_ROW = {
  viewDetails: { en: "View Details", fr: "Voir les détails" },
  by: { en: "By:", fr: "Par :" },
  atDate: { en: "at", fr: "le" }, // "at" for time, "le" for date in French
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
  pending: { en: "Pending", fr: "En attente" },
};

const overallStatusConfig: Record<RiskAssessment['status'], { icon: React.ElementType, badgeClass: string }> = {
    'Draft': { icon: Edit, badgeClass: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200' },
    'Pending Crewing Standards and Oversight': { icon: Building, badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-400 hover:bg-yellow-200' },
    'Pending Senior Director': { icon: UserCheckIcon, badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-400 hover:bg-cyan-200' },
    'Pending Director General': { icon: UserCircleIconLucide, badgeClass: 'bg-purple-100 text-purple-800 border-purple-400 hover:bg-purple-200' },
    'Needs Information': { icon: MessageSquare, badgeClass: 'bg-orange-100 text-orange-800 border-orange-400 hover:bg-orange-200' },
    'Approved': { icon: CheckCircle2, badgeClass: 'bg-green-100 text-green-800 border-green-400 hover:bg-green-200' },
    'Rejected': { icon: XCircle, badgeClass: 'bg-red-100 text-red-800 border-red-400 hover:bg-red-200' },
};

const decisionDisplayConfig: Record<ApprovalDecision | 'Pending', { icon: React.ElementType, colorClass: string, labelKey: keyof typeof T_TIMELINE_ROW }> = {
  'Approved': { icon: ThumbsUp, colorClass: 'bg-green-100 text-green-700 border-green-500', labelKey: 'decision' },
  'Rejected': { icon: ThumbsDown, colorClass: 'bg-red-100 text-red-700 border-red-500', labelKey: 'decision' },
  'Needs Information': { icon: MessageSquare, colorClass: 'bg-orange-100 text-orange-700 border-orange-500', labelKey: 'decision' },
  'Pending': { icon: Hourglass, colorClass: 'bg-gray-100 text-gray-600 border-gray-400', labelKey: 'pending' },
};

const WorkflowTimelineRow: React.FC<WorkflowTimelineRowProps> = ({ assessment }) => {
  const { getTranslation } = useLanguage();

  const getLevelTranslation = (level: ApprovalLevel): string => {
    if (level === 'Crewing Standards and Oversight') return getTranslation(T_TIMELINE_ROW.csoLevel);
    if (level === 'Senior Director') return getTranslation(T_TIMELINE_ROW.sdLevel);
    if (level === 'Director General') return getTranslation(T_TIMELINE_ROW.dgLevel);
    return level;
  };

  const formatDateSafe = (dateStr: string | undefined, template: string = `MMM d, yyyy`) => {
    if (!dateStr) return '';
    try {
      const parsedDate = parseISO(dateStr);
      return isValid(parsedDate) ? format(parsedDate, template) : dateStr;
    } catch (e) { return dateStr; }
  };

  const renderStageCell = (level: ApprovalLevel) => {
    const step = assessment.approvalSteps.find(s => s.level === level);
    const decision = step?.decision || 'Pending';
    const config = decisionDisplayConfig[decision];
    const Icon = config.icon;

    const complianceItems: string[] = [];
    if (step?.level === 'Crewing Standards and Oversight' && step.decision) {
        if (step.isAgainstFSM) complianceItems.push(getTranslation(T_TIMELINE_ROW.fsmNonCompliance));
        if (step.isAgainstMPR) complianceItems.push(getTranslation(T_TIMELINE_ROW.mprNonCompliance));
        if (step.isAgainstCrewingProfile) complianceItems.push(getTranslation(T_TIMELINE_ROW.crewingProfileDeviation));
    }

    const tooltipContent = (
      <div className="p-1 text-xs space-y-0.5 max-w-xs">
        <p className="font-semibold">{getLevelTranslation(level)}</p>
        <p><strong>{getTranslation(T_TIMELINE_ROW.decision)}:</strong> {step?.decision || getTranslation(T_TIMELINE_ROW.pending)}</p>
        {step?.userName && <p><strong>{getTranslation(T_TIMELINE_ROW.by)}</strong> {step.userName}</p>}
        {step?.date && <p><strong>{getTranslation(T_TIMELINE_ROW.date)}:</strong> {formatDateSafe(step.date, 'PP HH:mm')}</p>}
        {step?.notes && <p className="mt-1"><strong>{getTranslation(T_TIMELINE_ROW.notes)}</strong><br/><span className="whitespace-pre-wrap opacity-90">{step.notes}</span></p>}
        {complianceItems.length > 0 && (
            <div className="mt-1 pt-1 border-t border-dashed">
                <p className="font-semibold text-orange-600">{getTranslation(T_TIMELINE_ROW.complianceFlags)}</p>
                <ul className="list-disc list-inside pl-1 text-orange-600 opacity-90">
                    {complianceItems.map(item => <li key={item}>{item}</li>)}
                </ul>
            </div>
        )}
      </div>
    );

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center justify-center p-1.5 rounded border text-xs h-full", config.colorClass)}>
              <Icon className="h-4 w-4 mr-1.5 shrink-0" />
              <span className="hidden sm:inline truncate">{step?.decision || getTranslation(T_TIMELINE_ROW.pending)}</span>
            </div>
          </TooltipTrigger>
          { (step?.decision) && <TooltipContent side="top" align="center">{tooltipContent}</TooltipContent> }
        </Tooltip>
      </TooltipProvider>
    );
  };

  const OverallStatusIcon = overallStatusConfig[assessment.status]?.icon || HelpCircle;
  const overallStatusBadgeClass = overallStatusConfig[assessment.status]?.badgeClass || 'bg-gray-100 text-gray-800 border-gray-300';

  return (
    <div className="grid grid-cols-[2fr_repeat(3,_minmax(100px,_1fr))_1.5fr_1fr] gap-2 p-3 border rounded-md bg-card hover:bg-muted/50 items-center">
      {/* Assessment Info */}
      <div className="flex flex-col overflow-hidden">
        <Link href={`/assessments/${assessment.id}`} className="text-sm font-semibold text-primary hover:underline truncate" title={assessment.vesselName}>
          {assessment.vesselName}
        </Link>
        <span className="text-xs text-muted-foreground truncate" title={assessment.referenceNumber}>{assessment.referenceNumber}</span>
        <span className="text-xs text-muted-foreground mt-0.5">{formatDateSafe(assessment.lastModified)}</span>
      </div>

      {/* Approval Stages */}
      {renderStageCell('Crewing Standards and Oversight')}
      {renderStageCell('Senior Director')}
      {renderStageCell('Director General')}

      {/* Overall Status */}
      <div className="flex justify-center">
        <Badge className={cn("text-xs px-2 py-1 whitespace-nowrap", overallStatusBadgeClass)}>
          <OverallStatusIcon className="h-3.5 w-3.5 mr-1.5" />
          {assessment.status}
        </Badge>
      </div>

      {/* Actions */}
      <div className="text-right">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/assessments/${assessment.id}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            {getTranslation(T_TIMELINE_ROW.viewDetails)}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default WorkflowTimelineRow;
