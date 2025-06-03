
"use client";

import React from 'react';
import Link from 'next/link';
import type { RiskAssessment, ApprovalLevel, ApprovalDecision, ApprovalStep } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Hourglass, ThumbsUp, ThumbsDown, MessageSquare, CheckCircle2, XCircle, AlertTriangle, Info,
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
};

const statusConfig: Record<RiskAssessment['status'], { icon: React.ElementType, badgeClass: string }> = {
    'Draft': { icon: Edit, badgeClass: 'bg-gray-100 text-gray-800 border-gray-300' },
    'Pending Crewing Standards and Oversight': { icon: Building, badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-400' },
    'Pending Senior Director': { icon: UserCheck, badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-400' },
    'Pending Director General': { icon: UserCircleIcon, badgeClass: 'bg-purple-100 text-purple-800 border-purple-400' },
    'Needs Information': { icon: FileWarning, badgeClass: 'bg-orange-100 text-orange-800 border-orange-400' },
    'Approved': { icon: CheckCircle2, badgeClass: 'bg-green-100 text-green-800 border-green-400' },
    'Rejected': { icon: XCircle, badgeClass: 'bg-red-100 text-red-800 border-red-400' },
  };

const decisionIcons: Record<ApprovalDecision | 'Pending', React.ElementType> = {
  'Approved': ThumbsUp,
  'Rejected': ThumbsDown,
  'Needs Information': MessageSquare,
  'Pending': Hourglass,
};

const decisionColors: Record<ApprovalDecision | 'Pending', string> = {
  'Approved': 'text-green-600 bg-green-50 border-green-200',
  'Rejected': 'text-red-600 bg-red-50 border-red-200',
  'Needs Information': 'text-orange-600 bg-orange-50 border-orange-200',
  'Pending': 'text-muted-foreground bg-muted/50 border-dashed',
};
const decisionTextColors: Record<ApprovalDecision | 'Pending', string> = {
    'Approved': 'text-green-700',
    'Rejected': 'text-red-700',
    'Needs Information': 'text-orange-700',
    'Pending': 'text-muted-foreground',
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

  const formatDateSafe = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const parsedDate = parseISO(dateStr);
      if (isValid(parsedDate)) {
        return format(parsedDate, `MMM d, yyyy '${getTranslation(T_STATUS_CARD.at)}' HH:mm`);
      }
    } catch (e) { /* fall through */ }
    return dateStr;
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {approvalLevelsOrder.map((level, index) => {
            const step = assessment.approvalSteps.find(s => s.level === level);
            const decision = step?.decision || 'Pending';
            const Icon = decisionIcons[decision];
            const colorClass = decisionColors[decision];
            const textColorClass = decisionTextColors[decision];

            let isHighlighted = false;
            if (assessment.status.startsWith('Pending') && assessment.status.includes(level)) {
                isHighlighted = true;
            } else if (assessment.status === 'Needs Information' && step?.decision === 'Needs Information') {
                isHighlighted = true;
            } else if (assessment.status === 'Rejected' && step?.decision === 'Rejected' && (level === 'Senior Director' || level === 'Director General')) {
                 isHighlighted = true;
            }


            return (
              <React.Fragment key={level}>
                <div className={cn("p-3 rounded-md border relative", colorClass, isHighlighted ? 'ring-2 ring-primary shadow-lg' : 'opacity-80 md:opacity-100')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={cn("h-5 w-5", textColorClass)} />
                    <h4 className={cn("text-sm font-semibold", textColorClass)}>{getLevelTranslation(level)}</h4>
                  </div>
                  {step?.decision ? (
                    <div className="text-xs space-y-0.5">
                      <p><strong>{step.decision}</strong></p>
                      {step.userName && <p>{getTranslation(T_STATUS_CARD.by)} {step.userName}</p>}
                      {step.date && <p>{formatDateSafe(step.date)}</p>}
                      {step.notes && (
                        <p className="mt-1 pt-1 border-t border-dashed italic">
                            {getTranslation(T_STATUS_CARD.notes)} <span className="whitespace-pre-wrap">{step.notes}</span>
                        </p>
                      )}
                       {step.level === 'Crewing Standards and Oversight' && (step.isAgainstFSM || step.isAgainstMPR || step.isAgainstCrewingProfile) && (
                        <div className="mt-1 pt-1 border-t border-dashed">
                            <p className="text-xs font-semibold text-orange-700">{getTranslation(T_STATUS_CARD.complianceFlags)}</p>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                                {step.isAgainstFSM && <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 bg-orange-50/50 py-0 px-1">{getTranslation(T_STATUS_CARD.fsmNonCompliance)}</Badge>}
                                {step.isAgainstMPR && <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 bg-orange-50/50 py-0 px-1">{getTranslation(T_STATUS_CARD.mprNonCompliance)}</Badge>}
                                {step.isAgainstCrewingProfile && <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 bg-orange-50/50 py-0 px-1">{getTranslation(T_STATUS_CARD.crewingProfileDeviation)}</Badge>}
                            </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs italic">{getTranslation(T_STATUS_CARD.pending)}</p>
                  )}
                </div>
                {index < approvalLevelsOrder.length - 1 && (
                  <div className="hidden md:flex items-center justify-center">
                    <ChevronRight className="h-6 w-6 text-muted-foreground/70" />
                  </div>
                )}
                {index < approvalLevelsOrder.length - 1 && (
                    <div className="flex md:hidden items-center justify-center my-2">
                        <ChevronRight className="h-5 w-5 text-muted-foreground/70 rotate-90" />
                    </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
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
