
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { RiskAssessment, Attachment, ApprovalStep, ApprovalDecision, ApprovalLevel, RiskAssessmentStatus } from '@/lib/types';
import { mockRiskAssessments } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Ship, FileText, CalendarDays, Edit, Download, AlertTriangle, CheckCircle2, XCircle, Info, Clock, Bot, ShieldCheck, FileUp, ThumbsUp, ThumbsDown, MessageSquare, BrainCircuit, UserCircle, Users, FileWarning, ArrowLeft, ChevronRight, Hourglass, Building, UserCheck, UserX
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { generateRiskAssessmentSummary } from '@/ai/flows/generate-risk-assessment-summary';
import { generateRiskScoreAndRecommendations } from '@/ai/flows/generate-risk-score-and-recommendations';

// import ApprovalDialog from '@/components/risk-assessments/ApprovalDialog'; // To be created

const handleDownloadAttachment = (attachment: Attachment) => {
  if (attachment.url && attachment.url !== '#') {
     window.open(attachment.url, '_blank');
  } else if (attachment.file) {
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

const approvalLevelsOrder: ApprovalLevel[] = ['Vessel Certificates', 'Senior Director', 'Director General'];

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState<Partial<Record<'summary' | 'riskScore', boolean>>>({});

  const fetchAssessment = useCallback(() => {
    if (params.id) {
      const foundAssessment = mockRiskAssessments.find(a => a.id === params.id);
      if (foundAssessment) {
        // Ensure approvalSteps always exists, even if empty or minimal
        const populatedAssessment = {
          ...foundAssessment,
          approvalSteps: foundAssessment.approvalSteps && foundAssessment.approvalSteps.length > 0 
            ? foundAssessment.approvalSteps 
            : approvalLevelsOrder.map(level => ({ level } as ApprovalStep)) // Basic structure if empty
        };
        setAssessment(populatedAssessment);
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

  const getCurrentApprovalStepInfo = () => {
    if (!assessment) return { currentLevelToAct: null, canAct: false };
    
    for (const level of approvalLevelsOrder) {
      const step = assessment.approvalSteps.find(s => s.level === level);
      if (!step || !step.decision) {
        // This is the current level awaiting action
        // In a real app, you'd check if the logged-in user has permission for this level
        return { currentLevelToAct: level, canAct: true }; 
      }
      if (step.decision === 'Rejected' || step.decision === 'Needs Information') {
        // Process stops or is paused
        return { currentLevelToAct: level, canAct: false, isHalted: true };
      }
    }
    // All steps approved or assessment in a final state
    return { currentLevelToAct: null, canAct: false };
  };
  
  const { currentLevelToAct, canAct: userCanActOnCurrentStep, isHalted } = getCurrentApprovalStepInfo();

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

  const statusConfig: Record<RiskAssessmentStatus, { icon: React.ElementType, badgeClass: string, progressClass?: string }> = {
    'Draft': { icon: Edit, badgeClass: 'bg-gray-100 text-gray-700 border-gray-300' },
    'Pending Vessel Certificates': { icon: Building, badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-300', progressClass: '[&>div]:bg-yellow-500' },
    'Pending Senior Director': { icon: UserCheck, badgeClass: 'bg-cyan-100 text-cyan-700 border-cyan-300', progressClass: '[&>div]:bg-cyan-500' },
    'Pending Director General': { icon: UserCircle, badgeClass: 'bg-purple-100 text-purple-700 border-purple-300', progressClass: '[&>div]:bg-purple-500' },
    'Needs Information': { icon: FileWarning, badgeClass: 'bg-orange-100 text-orange-700 border-orange-300', progressClass: '[&>div]:bg-orange-500' },
    'Approved': { icon: CheckCircle2, badgeClass: 'bg-green-100 text-green-700 border-green-300', progressClass: '[&>div]:bg-green-500' },
    'Rejected': { icon: XCircle, badgeClass: 'bg-red-100 text-red-700 border-red-300', progressClass: '[&>div]:bg-red-500' },
  };
  const currentStatusConfig = statusConfig[assessment.status] || { icon: Info, badgeClass: 'bg-gray-200 text-gray-800' };
  const StatusIcon = currentStatusConfig.icon;

  const aiRiskColorClass = assessment.aiRiskScore !== undefined 
    ? assessment.aiRiskScore > 70 ? '[&>div]:bg-red-500' : assessment.aiRiskScore > 40 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
    : '[&>div]:bg-gray-300';

  const getStepStatusIcon = (decision?: ApprovalDecision) => {
    if (!decision) return Hourglass;
    switch (decision) {
      case 'Approved': return ThumbsUp;
      case 'Rejected': return ThumbsDown;
      case 'Needs Information': return MessageSquare;
      default: return Hourglass;
    }
  };

  const getStepStatusColor = (decision?: ApprovalDecision) => {
    if (!decision) return 'text-muted-foreground'; // Pending
    switch (decision) {
      case 'Approved': return 'text-green-600';
      case 'Rejected': return 'text-red-600';
      case 'Needs Information': return 'text-orange-600';
      default: return 'text-muted-foreground';
    }
  };
  

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/')} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
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
            {(isAiLoading.summary && !assessment.aiGeneratedSummary) || (isAiLoading.riskScore && !assessment.aiRiskScore) && <Progress value={50} className={`w-full my-2 h-1.5 ${currentStatusConfig.progressClass || ''} animate-pulse`} />}

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
            <h3 className="text-lg font-semibold mb-3 text-foreground flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Approval Workflow</h3>
            <div className="space-y-4">
              {assessment.approvalSteps.map((step, index) => {
                const StepIcon = getStepStatusIcon(step.decision);
                const stepColor = getStepStatusColor(step.decision);
                const isLastStep = index === assessment.approvalSteps.length - 1;
                const isPending = !step.decision;
                
                return (
                  <div key={step.level}>
                    <Card className={`p-4 ${isPending && step.level === currentLevelToAct ? 'border-primary shadow-md' : 'bg-muted/30'}`}>
                      <CardHeader className="p-0 pb-2">
                        <CardTitle className={`text-md font-semibold flex items-center justify-between ${stepColor}`}>
                          <span className="flex items-center gap-2">
                            <StepIcon className="h-5 w-5" />
                            {step.level}
                          </span>
                          {step.decision ? (
                            <Badge variant={step.decision === 'Approved' ? 'default' : step.decision === 'Rejected' ? 'destructive' : 'secondary'} className="text-xs">
                              {step.decision}
                            </Badge>
                          ) : ( step.level === currentLevelToAct ? 
                            <Badge variant="outline" className="border-yellow-400 text-yellow-600">Pending Action</Badge> 
                            : <Badge variant="outline">Queued</Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      {step.decision && (
                        <CardContent className="text-sm space-y-1 pt-2 p-0">
                          {step.userName && <p><strong>By:</strong> {step.userName}</p>}
                          {step.date && <p><strong>Date:</strong> {format(parseISO(step.date), "PPP p")}</p>}
                          {step.notes && <p className="mt-1"><strong>Notes:</strong> <span className="whitespace-pre-wrap">{step.notes}</span></p>}
                        </CardContent>
                      )}
                    </Card>
                    {!isLastStep && (
                      <div className="flex justify-center my-1">
                        <ChevronRight className="h-5 w-5 text-muted-foreground rotate-90 md:rotate-0" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {currentLevelToAct && userCanActOnCurrentStep && !isHalted && (
                <div className="mt-6 pt-4 border-t">
                    <h4 className="text-md font-semibold mb-3">Actions for {currentLevelToAct}:</h4>
                    <div className="flex flex-wrap gap-3">
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => toast({title: "Action Required", description: `Approve action for ${currentLevelToAct} to be implemented.`})}>
                            <ThumbsUp className="mr-2 h-4 w-4"/> Approve
                        </Button>
                        <Button variant="destructive" onClick={() => toast({title: "Action Required", description: `Reject action for ${currentLevelToAct} to be implemented.`})}>
                            <ThumbsDown className="mr-2 h-4 w-4"/> Reject
                        </Button>
                         <Button variant="outline" onClick={() => toast({title: "Action Required", description: `Request Information action for ${currentLevelToAct} to be implemented.`})}>
                            <MessageSquare className="mr-2 h-4 w-4"/> Request Information
                        </Button>
                    </div>
                </div>
            )}
            {assessment.status === 'Approved' && (
                <Alert variant="default" className="mt-6 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <AlertTitle className="text-green-700 font-semibold">Assessment Fully Approved</AlertTitle>
                  <AlertDescription className="text-green-600">This risk assessment has been approved by all required levels.</AlertDescription>
                </Alert>
            )}
            {assessment.status === 'Rejected' && !currentLevelToAct && ( // Or check last step decision
                 <Alert variant="destructive" className="mt-6">
                  <XCircle className="h-5 w-5" />
                  <AlertTitle className="font-semibold">Assessment Rejected</AlertTitle>
                  <AlertDescription>This risk assessment has been rejected. See details in the workflow steps above.</AlertDescription>
                </Alert>
            )}
             {assessment.status === 'Needs Information' && (
                 <Alert variant="default" className="mt-6 bg-orange-50 border-orange-200">
                  <FileWarning className="h-5 w-5 text-orange-600" />
                  <AlertTitle className="text-orange-700 font-semibold">Information Requested</AlertTitle>
                  <AlertDescription className="text-orange-600">Further information has been requested for this assessment. See notes in the relevant step.</AlertDescription>
                </Alert>
            )}
             {!currentLevelToAct && !['Approved', 'Rejected', 'Needs Information'].includes(assessment.status) && assessment.approvalSteps.every(s => !s.decision) && (
                 <Alert variant="default" className="mt-6 border-dashed">
                    <Users className="h-4 w-4" />
                    <AlertDescription>This assessment is awaiting initial review.</AlertDescription>
                </Alert>
            )}

          </section>
        </CardContent>
      </Card>
    </div>
  );
}
