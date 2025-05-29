"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { RiskAssessment, Attachment } from '@/lib/types';
import { mockRiskAssessments } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Ship, FileText, CalendarDays, Edit, Download, AlertTriangle, CheckCircle2, XCircle, Info, Clock, Bot, ShieldCheck, FileUp, ThumbsUp, ThumbsDown, MessageSquare, BrainCircuit, UserCircle, Users, FileWarning, ArrowLeft
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { generateRiskAssessmentSummary } from '@/ai/flows/generate-risk-assessment-summary';
import { generateRiskScoreAndRecommendations } from '@/ai/flows/generate-risk-score-and-recommendations';
// import ApprovalDialog from '@/components/risk-assessments/ApprovalDialog'; // To be created

const handleDownloadAttachment = (attachment: Attachment) => {
  // In a real app, this would trigger a download from attachment.url
  // For File objects (newly uploaded, not yet saved with a URL), this might be disabled or show a preview.
  if (attachment.url && attachment.url !== '#') {
     window.open(attachment.url, '_blank');
  } else if (attachment.file) {
     // For local files, could use URL.createObjectURL(attachment.file) for temporary link
     const tempUrl = URL.createObjectURL(attachment.file);
     const a = document.createElement('a');
     a.href = tempUrl;
     a.download = attachment.name;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(tempUrl);
  } else {
    alert(`Download for ${attachment.name} is not available (No URL or local file).`);
  }
};

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState<Partial<Record<'summary' | 'riskScore', boolean>>>({});
  // const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  // const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);

  const fetchAssessment = useCallback(() => {
    if (params.id) {
      const foundAssessment = mockRiskAssessments.find(a => a.id === params.id); // Using mock
      // In real app: const foundAssessment = await getAssessmentById(params.id as string);
      if (foundAssessment) {
        setAssessment(foundAssessment);
      } else {
        toast({ title: "Error", description: "Assessment not found.", variant: "destructive" });
        router.push('/');
      }
      setIsLoading(false);
    }
  }, [params.id, router, toast]);

  useEffect(() => {
    fetchAssessment();
  }, [fetchAssessment]);

  const runAiSummary = async () => {
    if (!assessment) return;
    setIsAiLoading(prev => ({...prev, summary: true}));
    try {
      const summaryResult = await generateRiskAssessmentSummary({
        vesselInformation: `Name: ${assessment.vesselName}, IMO: ${assessment.vesselIMO || 'N/A'}`,
        personnelShortages: assessment.personnelShortages,
        proposedOperationalDeviations: assessment.proposedOperationalDeviations,
        additionalDetails: `Voyage: ${assessment.voyageDetails}. Reason: ${assessment.reasonForRequest}`
      });
      setAssessment(prev => prev ? { ...prev, aiGeneratedSummary: summaryResult.summary, lastModified: new Date().toISOString() } : null);
      toast({ title: "AI Summary Generated", description: "Summary has been added." });
    } catch (error) {
      console.error("AI Summary Error:", error);
      toast({ title: "AI Error", description: "Failed to generate summary.", variant: "destructive" });
    }
    setIsAiLoading(prev => ({...prev, summary: false}));
  };
  
  const runAiRiskScoreAndRecommendations = async () => {
    if (!assessment) return;
    setIsAiLoading(prev => ({...prev, riskScore: true}));
    try {
      const result = await generateRiskScoreAndRecommendations({
        vesselInformation: `Name: ${assessment.vesselName}, IMO: ${assessment.vesselIMO || 'N/A'}. Voyage: ${assessment.voyageDetails}`,
        personnelShortages: assessment.personnelShortages,
        operationalDeviations: assessment.proposedOperationalDeviations,
        attachedDocuments: assessment.attachments.map(a => a.name), 
      });
      setAssessment(prev => prev ? { 
        ...prev, 
        aiRiskScore: result.riskScore,
        aiSuggestedMitigations: result.recommendations,
        aiRegulatoryConsiderations: result.regulatoryConsiderations,
        lastModified: new Date().toISOString(),
      } : null);
      toast({ title: "AI Risk Score & Recommendations Generated" });
    } catch (error) {
      console.error("AI Risk Score Error:", error);
      toast({ title: "AI Error", description: "Failed to generate risk score and recommendations.", variant: "destructive" });
    }
    setIsAiLoading(prev => ({...prev, riskScore: false}));
  };

  if (isLoading) {
    return <div className="flex flex-col justify-center items-center h-[calc(100vh-200px)] gap-4">
        <BrainCircuit className="h-16 w-16 animate-pulse text-primary" /> 
        <p className="text-xl text-muted-foreground">Loading Assessment Details...</p>
    </div>;
  }

  if (!assessment) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto text-center">
        <AlertTriangle className="h-5 w-5 mx-auto mb-2" />
        <AlertTitle className="text-xl">Assessment Not Found</AlertTitle>
        <AlertDescription>The requested risk assessment could not be found. It may have been moved or deleted.</AlertDescription>
         <Button onClick={() => router.push('/')} variant="link" className="mt-4">Return to Dashboard</Button>
      </Alert>
    );
  }

  const statusConfig = {
    'Pending': { icon: AlertTriangle, badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300', progressClass: '[&>div]:bg-yellow-500' },
    'Under Review': { icon: Clock, badgeClass: 'bg-blue-100 text-blue-700 border-blue-300', progressClass: '[&>div]:bg-blue-500' },
    'Needs Information': { icon: FileWarning, badgeClass: 'bg-orange-100 text-orange-700 border-orange-300', progressClass: '[&>div]:bg-orange-500' },
    'Approved': { icon: CheckCircle2, badgeClass: 'bg-green-100 text-green-700 border-green-300', progressClass: '[&>div]:bg-green-500' },
    'Rejected': { icon: XCircle, badgeClass: 'bg-red-100 text-red-700 border-red-300', progressClass: '[&>div]:bg-red-500' },
  };
  const currentStatusConfig = statusConfig[assessment.status] || statusConfig['Pending'];
  const StatusIcon = currentStatusConfig.icon;

  const aiRiskColorClass = assessment.aiRiskScore !== undefined 
    ? assessment.aiRiskScore > 70 ? '[&>div]:bg-red-500' : assessment.aiRiskScore > 40 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
    : '[&>div]:bg-gray-300';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/')} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        {/* TODO: Edit button for authorized users, linking to an edit page or enabling inline editing */}
        {/* <Button variant="secondary" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit Assessment</Button> */}
      </div>

      <Card className="shadow-lg rounded-lg overflow-hidden">
        <CardHeader className="bg-muted/20 p-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
                <Ship className="h-8 w-8" /> {assessment.vesselName}
              </CardTitle>
              <CardDescription className="text-sm mt-1">{assessment.referenceNumber}</CardDescription>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
                 <Badge className={`text-base px-4 py-2 rounded-full font-medium ${currentStatusConfig.badgeClass}`}>
                    <StatusIcon className="h-5 w-5 mr-2" />
                    {assessment.status}
                </Badge>
                <p className="text-xs text-muted-foreground">
                    Last Modified: {format(parseISO(assessment.lastModified), "MMM d, yyyy 'at' h:mm a")}
                </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          
          <section>
            <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2"><Info className="h-5 w-5 text-primary"/>Key Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm leading-relaxed">
              <div><strong className="font-medium text-muted-foreground block">Submitted By:</strong> {assessment.submittedBy}</div>
              <div><strong className="font-medium text-muted-foreground block">Submission Date:</strong> {format(parseISO(assessment.submissionDate), "PPP p")}</div>
              <div className="md:col-span-2"><strong className="font-medium text-muted-foreground block">Voyage Details:</strong> <p className="whitespace-pre-wrap">{assessment.voyageDetails}</p></div>
              <div className="md:col-span-2"><strong className="font-medium text-muted-foreground block">Reason for Request:</strong> <p className="whitespace-pre-wrap">{assessment.reasonForRequest}</p></div>
              <div className="md:col-span-2"><strong className="font-medium text-muted-foreground block">Personnel Shortages:</strong> <p className="whitespace-pre-wrap">{assessment.personnelShortages}</p></div>
              <div className="md:col-span-2"><strong className="font-medium text-muted-foreground block">Proposed Deviations/Mitigations:</strong> <p className="whitespace-pre-wrap">{assessment.proposedOperationalDeviations}</p></div>
            </div>
          </section>
          <Separator />

          <section>
            <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/>Attachments</h3>
            {assessment.attachments.length > 0 ? (
              <ul className="space-y-3">
                {assessment.attachments.map(att => (
                  <li key={att.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-6 w-6 text-primary shrink-0" />
                      <div className="overflow-hidden">
                        <span className="font-medium text-sm truncate block" title={att.name}>{att.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {(att.size / 1024).toFixed(1)} KB - {att.type} - {format(parseISO(att.uploadedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadAttachment(att)}>
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <Alert variant="default" className="border-dashed">
                <Info className="h-4 w-4" />
                <AlertDescription>No attachments for this assessment.</AlertDescription>
              </Alert>
            )}
            {/* <Button variant="outline" className="mt-4"><FileUp className="mr-2 h-4 w-4" /> Add Attachment</Button> */}
          </section>
          <Separator />

          <section>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /> AI Insights</h3>
              <div className="flex flex-wrap gap-2">
                <Button onClick={runAiSummary} disabled={isAiLoading.summary || !!assessment.aiGeneratedSummary} variant="outline" size="sm">
                  {isAiLoading.summary ? "Generating..." : (assessment.aiGeneratedSummary ? "Summary Generated" : "Generate Summary")}
                </Button>
                <Button onClick={runAiRiskScoreAndRecommendations} disabled={isAiLoading.riskScore || !!assessment.aiRiskScore} variant="outline" size="sm">
                  {isAiLoading.riskScore ? "Analyzing..." : (assessment.aiRiskScore ? "Analysis Complete" : "Assess Risk & Mitigations")}
                </Button>
              </div>
            </div>
            {(isAiLoading.summary && !assessment.aiGeneratedSummary) || (isAiLoading.riskScore && !assessment.aiRiskScore) && <Progress value={50} className={`w-full my-2 h-1.5 ${currentStatusConfig.progressClass} animate-pulse`} />}

            {assessment.aiGeneratedSummary && (
              <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
                <AlertTitle className="font-semibold text-blue-700 dark:text-blue-300">AI Generated Summary</AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-400 whitespace-pre-wrap">{assessment.aiGeneratedSummary}</AlertDescription>
              </Alert>
            )}
            
            {assessment.aiRiskScore !== undefined && (
              <Card className="my-4 p-4 bg-muted/30">
                <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> AI Risk Score: {assessment.aiRiskScore}/100</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Progress value={assessment.aiRiskScore} className={`w-full h-2.5 mb-3 ${aiRiskColorClass}`} />
                    {assessment.aiSuggestedMitigations && (
                        <div className="mt-2">
                            <h4 className="font-semibold text-sm">Suggested Mitigations:</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assessment.aiSuggestedMitigations}</p>
                        </div>
                    )}
                    {assessment.aiRegulatoryConsiderations && (
                        <div className="mt-3 pt-3 border-t">
                            <h4 className="font-semibold text-sm">Regulatory Considerations:</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assessment.aiRegulatoryConsiderations}</p>
                        </div>
                    )}
                </CardContent>
              </Card>
            )}
            {!assessment.aiRiskScore && !assessment.aiGeneratedSummary && !isAiLoading.summary && !isAiLoading.riskScore &&
              <Alert variant="default" className="border-dashed">
                <Info className="h-4 w-4" />
                <AlertDescription>Run AI tools to generate summaries, risk scores, and suggested mitigations.</AlertDescription>
              </Alert>
            }
          </section>
          <Separator />

          <section>
            <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2"><UserCircle className="h-5 w-5 text-primary"/>Approval Status</h3>
            {assessment.approvalDetails ? (
              <Card className={`${assessment.approvalDetails.decision === 'Approved' ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700' : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700'}`}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 text-lg ${assessment.approvalDetails.decision === 'Approved' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {assessment.approvalDetails.decision === 'Approved' ? <ThumbsUp className="h-6 w-6" /> : <ThumbsDown className="h-6 w-6" />}
                    Decision: {assessment.approvalDetails.decision}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><strong>By:</strong> {assessment.approvalDetails.approvedBy}</p>
                  <p><strong>Date:</strong> {format(parseISO(assessment.approvalDetails.approvalDate), "PPP p")}</p>
                  <p className="mt-2"><strong>Notes:</strong> <span className="whitespace-pre-wrap">{assessment.approvalDetails.notes}</span></p>
                </CardContent>
              </Card>
            ) : (
              <div>
                <Alert variant="default" className="mb-4 border-dashed">
                    <Users className="h-4 w-4" />
                    <AlertDescription>This assessment is awaiting review and approval action.</AlertDescription>
                </Alert>
                {['Pending', 'Under Review', 'Needs Information'].includes(assessment.status) && (
                    <div className="flex flex-wrap gap-3">
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => toast({title: "Action Required", description: "Approval UI to be implemented."})}>
                            <ThumbsUp className="mr-2 h-4 w-4"/> Approve
                        </Button>
                        <Button variant="destructive" onClick={() => toast({title: "Action Required", description: "Rejection UI to be implemented."})}>
                            <ThumbsDown className="mr-2 h-4 w-4"/> Reject
                        </Button>
                         <Button variant="outline" onClick={() => toast({title: "Action Required", description: "'Request Information' UI to be implemented."})}>
                            <MessageSquare className="mr-2 h-4 w-4"/> Request Information
                        </Button>
                    </div>
                )}
              </div>
            )}
          </section>
        </CardContent>
      </Card>

      {/* Placeholder for ApprovalDialog
      {showApprovalDialog && approvalAction && (
        <ApprovalDialog
          assessmentId={assessment.id}
          action={approvalAction}
          onClose={() => setShowApprovalDialog(false)}
          onSubmitSuccess={(updatedAssessment) => {
            setAssessment(updatedAssessment); // Or re-fetch
            setShowApprovalDialog(false);
            toast({ title: `Assessment ${approvalAction === 'approve' ? 'Approved' : 'Rejected'}`, description: `Assessment ${assessment.referenceNumber} has been updated.`});
          }}
        />
      )} */}
    </div>
  );
}
