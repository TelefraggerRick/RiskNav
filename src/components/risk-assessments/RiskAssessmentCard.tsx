
import Link from 'next/link';
import type { RiskAssessment, RiskAssessmentStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ship, CalendarDays, AlertTriangle, CheckCircle2, XCircle, Info, Clock, Edit, Building, UserCheck, UserCircle as UserIcon, FileWarning, Globe } from 'lucide-react'; 
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext'; // Added

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


export default function RiskAssessmentCard({ assessment }: RiskAssessmentCardProps) {
  const config = statusConfig[assessment.status] || { icon: Info, badgeClass: 'bg-gray-100 text-gray-800 border border-gray-300' };
  const StatusIcon = config.icon;
  const { getTranslation } = useLanguage(); // Added

  const T = {
    reason: { en: "Reason:", fr: "Raison :" },
    proposedDeviations: { en: "Proposed Deviations:", fr: "Dérogations proposées :" },
    viewDetails: { en: "View Details", fr: "Voir les détails" },
  };

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold text-primary flex items-center gap-2 truncate">
            <Ship className="h-5 w-5 shrink-0" />
            <span className="truncate" title={assessment.vesselName}>{assessment.vesselName}</span>
          </CardTitle>
          <Badge
            className={`text-xs px-2 py-1 whitespace-nowrap rounded-md font-medium ${config.badgeClass}`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {assessment.status} {/* Status names not translated */}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
          {assessment.referenceNumber}
          {assessment.region && (
            <>
              <span className="mx-1">·</span>
              <Globe className="h-3 w-3 inline-block mr-0.5" />
              {assessment.region} {/* Region names not translated */}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 text-sm py-3">
        <div className="space-y-1">
            <p className="font-medium">{getTranslation(T.reason)}</p>
            <p className="line-clamp-2 text-muted-foreground" title={assessment.reasonForRequest}>
            {assessment.reasonForRequest}
            </p>
        </div>
         <div className="space-y-1">
            <p className="font-medium">{getTranslation(T.proposedDeviations)}</p>
            <p className="line-clamp-2 text-muted-foreground" title={assessment.proposedOperationalDeviations}>
            {assessment.proposedOperationalDeviations}
            </p>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 pb-3 bg-muted/30">
        <div className="flex justify-between items-center w-full">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                <span>{formatDistanceToNow(parseISO(assessment.submissionDate), { addSuffix: true })}</span>
            </div>
            <Link href={`/assessments/${assessment.id}`} passHref>
              <Button variant="outline" size="sm">
                {getTranslation(T.viewDetails)}
              </Button>
            </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
