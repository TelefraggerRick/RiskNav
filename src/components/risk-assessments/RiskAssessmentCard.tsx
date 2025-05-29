import Link from 'next/link';
import type { RiskAssessment, RiskAssessmentStatus } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ship, CalendarDays, AlertTriangle, CheckCircle2, XCircle, Info, Clock, Edit, Building, UserCheck, UserCircle as UserIcon, FileWarning } from 'lucide-react'; // Added UserIcon alias
import { formatDistanceToNow, parseISO } from 'date-fns';

interface RiskAssessmentCardProps {
  assessment: RiskAssessment;
}

const statusConfig: Record<RiskAssessmentStatus, { icon: React.ElementType, colorClass: string, textColorClass: string, badgeVariant?: "default" | "secondary" | "destructive" | "outline" }> = {
  'Draft': { icon: Edit, colorClass: 'bg-gray-500 hover:bg-gray-600', textColorClass: 'text-gray-700', badgeVariant: 'secondary' },
  'Pending Vessel Certificates': { icon: Building, colorClass: 'bg-yellow-500 hover:bg-yellow-600', textColorClass: 'text-yellow-700', badgeVariant: 'secondary' },
  'Pending Senior Director': { icon: UserCheck, colorClass: 'bg-cyan-500 hover:bg-cyan-600', textColorClass: 'text-cyan-700', badgeVariant: 'secondary' },
  'Pending Director General': { icon: UserIcon, colorClass: 'bg-purple-500 hover:bg-purple-600', textColorClass: 'text-purple-700', badgeVariant: 'secondary' },
  'Needs Information': { icon: FileWarning, colorClass: 'bg-orange-500 hover:bg-orange-600', textColorClass: 'text-orange-700', badgeVariant: 'secondary' },
  'Approved': { icon: CheckCircle2, colorClass: 'bg-green-500 hover:bg-green-600', textColorClass: 'text-green-700', badgeVariant: 'default' },
  'Rejected': { icon: XCircle, colorClass: 'bg-red-500 hover:bg-red-600', textColorClass: 'text-red-700', badgeVariant: 'destructive' },
};


export default function RiskAssessmentCard({ assessment }: RiskAssessmentCardProps) {
  const config = statusConfig[assessment.status] || { icon: Info, colorClass: 'bg-gray-500 hover:bg-gray-600', textColorClass: 'text-gray-700', badgeVariant: 'outline' };
  const StatusIcon = config.icon;

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold text-primary flex items-center gap-2 truncate">
            <Ship className="h-5 w-5 shrink-0" />
            <span className="truncate" title={assessment.vesselName}>{assessment.vesselName}</span>
          </CardTitle>
          <Badge 
            variant={config.badgeVariant || 'default'}
            className={`text-xs px-2 py-1 whitespace-nowrap ${config.badgeVariant ? '' : config.colorClass + ' text-primary-foreground border-transparent'}`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {assessment.status}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground pt-1">{assessment.referenceNumber}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 text-sm py-3">
        <div className="space-y-1">
            <p className="font-medium">Reason:</p>
            <p className="line-clamp-2 text-muted-foreground" title={assessment.reasonForRequest}>
            {assessment.reasonForRequest}
            </p>
        </div>
         <div className="space-y-1">
            <p className="font-medium">Proposed Deviations:</p>
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
                View Details
              </Button>
            </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
