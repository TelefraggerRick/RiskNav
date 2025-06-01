
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import type { RiskAssessmentFormData } from "@/lib/schemas";
import { riskAssessmentFormSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, FileText, Trash2, Info, UserCheck, Sailboat, AlertCircle, Anchor, Globe, Fingerprint } from "lucide-react"; // Added Fingerprint for IMO
import React, { useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { VesselDepartment, VesselRegion } from "@/lib/types";


interface RiskAssessmentFormProps {
  onSubmit: (data: RiskAssessmentFormData) => Promise<void>;
  initialData?: Partial<RiskAssessmentFormData>; 
  isLoading?: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'text/plain'];
const departmentOptions: VesselDepartment[] = ['Navigation', 'Deck', 'Engine Room', 'Logistics', 'Other'];
const regionOptions: VesselRegion[] = ['Atlantic', 'Central', 'Western', 'Arctic'];

export default function RiskAssessmentForm({ onSubmit, initialData, isLoading = false }: RiskAssessmentFormProps) {
  const form = useForm<RiskAssessmentFormData>({
    resolver: zodResolver(riskAssessmentFormSchema),
    defaultValues: initialData || {
      vesselName: "",
      imoNumber: "",
      department: undefined,
      region: undefined, 
      voyageDetails: "",
      reasonForRequest: "",
      personnelShortages: "",
      proposedOperationalDeviations: "",
      attachments: [],
      coDeptHeadSupportExemption: undefined,
      deptHeadConfidentInIndividual: undefined,
      deptHeadConfidenceReason: "",
      employeeFamiliarizationProvided: undefined,
      workedInDepartmentLast12Months: undefined,
      workedInDepartmentDetails: "",
      similarResponsibilityExperience: undefined,
      similarResponsibilityDetails: "",
      individualHasRequiredSeaService: undefined,
      individualWorkingTowardsCertification: undefined,
      certificationProgressSummary: "",
      requestCausesVacancyElsewhere: undefined,
      crewCompositionSufficientForSafety: undefined,
      detailedCrewCompetencyAssessment: "",
      crewContinuityAsPerProfile: undefined,
      crewContinuityDetails: "",
      specialVoyageConsiderations: "",
      reductionInVesselProgramRequirements: undefined,
      rocNotificationOfLimitations: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attachments",
  });

  const { toast } = useToast();

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const currentFilesCount = form.getValues("attachments")?.length || 0;
    if (currentFilesCount >= 5) {
      toast({ title: "File Limit Reached", description: "You can upload a maximum of 5 files.", variant: "destructive" });
      if (event.target) event.target.value = ""; 
      return;
    }

    if (event.target.files) {
      const files = Array.from(event.target.files);
      let filesAddedThisTurn = 0;
      const errors: string[] = [];

      files.forEach(file => {
        if (currentFilesCount + filesAddedThisTurn >= 5) {
          if (!errors.includes("Maximum of 5 files reached.")) errors.push("Maximum of 5 files reached.");
          return;
        }
        
        const validationResult = riskAssessmentFormSchema.shape.attachments.element.shape.file.safeParse(file);
        if (!validationResult.success) {
            validationResult.error.errors.forEach(err => {
                 if (!errors.includes(`${file.name}: ${err.message}`)) errors.push(`${file.name}: ${err.message}`);
            });
        } else {
          append({ name: file.name, file: file, size: file.size, type: file.type });
          filesAddedThisTurn++;
        }
      });
      
      if (errors.length > 0) {
        toast({
          title: "File Upload Issues",
          description: ( <ul className="list-disc pl-5"> {errors.map((e, i) => <li key={i}>{e}</li>)} </ul> ),
          variant: "destructive",
        });
      }
    }
    if (event.target) event.target.value = ""; 
  }, [append, toast, form]);

  const watchDeptHeadConfident = form.watch("deptHeadConfidentInIndividual");
  const watchWorkedInDept = form.watch("workedInDepartmentLast12Months");
  const watchSimilarExperience = form.watch("similarResponsibilityExperience");
  const watchWorkingTowardsCert = form.watch("individualWorkingTowardsCertification");
  const watchCrewContinuity = form.watch("crewContinuityAsPerProfile");
  const watchProgramReduction = form.watch("reductionInVesselProgramRequirements");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-lg rounded-lg overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl flex items-center gap-2"><Sailboat className="h-6 w-6 text-primary"/>Vessel & Assessment Overview</CardTitle>
            <CardDescription>Provide core details about the vessel and the reason for this assessment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <FormField control={form.control} name="vesselName" render={({ field }) => ( <FormItem> <FormLabel>Vessel Name *</FormLabel> <FormControl><Input placeholder="e.g., CCGS Amundsen" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="imoNumber" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center gap-1"> <Fingerprint className="h-4 w-4 text-muted-foreground" /> Vessel IMO Number (Optional)</FormLabel> <FormControl><Input placeholder="e.g., 1234567" {...field} /></FormControl> <FormDescription>Enter the 7-digit IMO number if available.</FormDescription> <FormMessage /> </FormItem> )} />
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                         <SelectValue placeholder="Select department..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Departments</SelectLabel>
                        {departmentOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                         <SelectValue placeholder="Select region..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Regions</SelectLabel>
                        {regionOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="voyageDetails" render={({ field }) => ( <FormItem> <FormLabel>Voyage Details *</FormLabel> <FormControl><Textarea placeholder="e.g., Route, dates, purpose of voyage" {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="reasonForRequest" render={({ field }) => ( <FormItem> <FormLabel>Reason for Risk Assessment *</FormLabel> <FormControl><Textarea placeholder="e.g., Sailing short-handed due to X, Officer Y without proper certification for Z" {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="personnelShortages" render={({ field }) => ( <FormItem> <FormLabel>Personnel Shortages & Impact *</FormLabel> <FormControl><Textarea placeholder="Describe specific shortages, roles affected, and potential impact on operations." {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="proposedOperationalDeviations" render={({ field }) => ( <FormItem> <FormLabel>Proposed Operational Deviations / Mitigations *</FormLabel> <FormControl><Textarea placeholder="Describe changes to standard procedures or mitigating actions proposed to manage the risk." {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg overflow-hidden">
            <CardHeader className="bg-muted/30">
                <CardTitle className="text-xl flex items-center gap-2"><UserCheck className="h-6 w-6 text-primary" />Exemption & Individual Assessment</CardTitle>
                <CardDescription>Details regarding the specific exemption and the individual(s) involved.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <FormField control={form.control} name="coDeptHeadSupportExemption" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Does the Commanding Officer AND Department Head support this exemption? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="deptHeadConfidentInIndividual" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Is the Department Head confident that the individual can fulfill the required duties? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchDeptHeadConfident === 'Yes' && (
                    <FormField control={form.control} name="deptHeadConfidenceReason" render={({ field }) => ( <FormItem> <FormLabel>If yes, why is the Department Head confident? *</FormLabel> <FormControl><Textarea placeholder="Explain the reasons for confidence..." {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
                )}
                <FormField control={form.control} name="employeeFamiliarizationProvided" render={({ field }) => (
                     <FormItem className="space-y-3"> <FormLabel>Will the employee be given familiarization as per FSM and crewing profile? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="workedInDepartmentLast12Months" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Has the individual worked in the required department during the past 12 months? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchWorkedInDept === 'Yes' && (
                     <FormField control={form.control} name="workedInDepartmentDetails" render={({ field }) => ( <FormItem> <FormLabel>If Yes, please indicate position and duration. *</FormLabel> <FormControl><Textarea placeholder="e.g., Able Seaman, Jan 2023 - Dec 2023" {...field} rows={2} /></FormControl> <FormMessage /> </FormItem> )} />
                )}
                 <FormField control={form.control} name="similarResponsibilityExperience" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Has the individual worked in positions of similar responsibility before? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchSimilarExperience === 'Yes' && (
                     <FormField control={form.control} name="similarResponsibilityDetails" render={({ field }) => ( <FormItem> <FormLabel>If Yes, please provide details of similar responsibility. *</FormLabel> <FormControl><Textarea placeholder="Describe previous similar roles and responsibilities..." {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
                )}
                <FormField control={form.control} name="individualHasRequiredSeaService" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Does the individual have the required sea service to apply for the required certificate or rating? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="individualWorkingTowardsCertification" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Is the individual currently working towards the required certification? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchWorkingTowardsCert === 'Yes' && (
                     <FormField control={form.control} name="certificationProgressSummary" render={({ field }) => ( <FormItem> <FormLabel>If Yes, provide a summary of progress. *</FormLabel> <FormDescription>Include exams, courses completed, and progress since last exemption (if applicable).</FormDescription> <FormControl><Textarea placeholder="Summary of certification progress..." {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
                )}
            </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg overflow-hidden">
            <CardHeader className="bg-muted/30">
                <CardTitle className="text-xl flex items-center gap-2"><AlertCircle className="h-6 w-6 text-primary"/>Operational Considerations (Crew & Voyage)</CardTitle>
                <CardDescription>Address crew composition, competency, and specific voyage-related factors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Crew/Team Considerations</h3>
                <FormField control={form.control} name="requestCausesVacancyElsewhere" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Does this request cause a vacancy elsewhere within the department? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="crewCompositionSufficientForSafety" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Is the crew composition sufficient to effectively support safe and secure operations and protect the environment? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="detailedCrewCompetencyAssessment" render={({ field }) => ( <FormItem> <FormLabel>Are all other minimum certification requirements met, or are there other exemptions? Do any members help fill competency gaps with higher-than-required certifications? *</FormLabel> <FormControl><Textarea placeholder="Provide a detailed assessment..." {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="crewContinuityAsPerProfile" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Will the continuity of crew requirements be met as indicated in the vessel's Crewing Profile? *</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchCrewContinuity === 'No' && (
                    <FormField control={form.control} name="crewContinuityDetails" render={({ field }) => ( <FormItem> <FormLabel>If not, please provide details on crew continuity. *</FormLabel> <FormControl><Textarea placeholder="Explain how crew continuity will be managed or the discrepancies..." {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
                )}

                <h3 className="text-lg font-semibold text-foreground border-b pb-2 mt-8">Voyage Considerations</h3>
                <FormField control={form.control} name="specialVoyageConsiderations" render={({ field }) => ( <FormItem> <FormLabel>Are there special voyage considerations that impact this exemption? *</FormLabel><FormDescription>(E.g., duration and time of transit, type of waters, weather conditions, etc.)</FormDescription> <FormControl><Textarea placeholder="Detail any special voyage considerations..." {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="reductionInVesselProgramRequirements" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>Is there any reduction in vessel program requirements that may help reduce the risk? *</FormLabel><FormDescription>(E.g., No ATON requirements, transit only to refit, etc.)</FormDescription>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchProgramReduction === 'Yes' && (
                    <FormField control={form.control} name="rocNotificationOfLimitations" render={({ field }) => (
                        <FormItem className="space-y-3"> <FormLabel>If program reduction is planned, has the Regional Operations Center (ROC)/JRCC/MRSC been made aware? *</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                    <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel> </FormItem>
                                    <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel> </FormItem>
                                </RadioGroup>
                            </FormControl> <FormMessage />
                        </FormItem>
                    )} />
                )}
            </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl flex items-center gap-2"><UploadCloud className="h-6 w-6 text-primary"/>Supporting Documents</CardTitle>
            <CardDescription>Attach relevant files (max 5, up to {MAX_FILE_SIZE_MB}MB each). Allowed: PDF, DOC, DOCX, JPG, PNG, TXT.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="attachments"
              render={() => ( 
                <FormItem>
                  <FormControl>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                       <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                        <label htmlFor="file-upload" className="cursor-pointer flex items-center justify-center gap-2">
                          <UploadCloud className="h-4 w-4" /> Select Files
                        </label>
                      </Button>
                      <Input id="file-upload" type="file" multiple onChange={handleFileChange} className="hidden" accept={ALLOWED_FILE_TYPES.join(",")} />
                      <span className="text-sm text-muted-foreground">{fields.length} / 5 files selected</span>
                    </div>
                  </FormControl>
                  <FormMessage /> 
                </FormItem>
              )}
            />
            
            {fields.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-md font-medium">Selected Files:</h4>
                <ul className="divide-y divide-border rounded-md border bg-background/50">
                  {fields.map((item, index) => (
                    <li key={item.id} className="flex items-center justify-between p-3 hover:bg-muted/20">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium truncate" title={item.name}>{item.name}</span>
                          {item.size && <span className="text-xs text-muted-foreground">({(item.size / 1024).toFixed(1)} KB) - {item.type}</span>}
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={`Remove ${item.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
             {fields.length === 0 && (
                <Alert className="mt-6 border-dashed bg-background/50">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                    No files attached yet. Upload supporting documents as needed.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isLoading}>
                Reset Form
            </Button>
            <Button type="submit" disabled={isLoading || (!form.formState.isDirty && !initialData)}>
                {isLoading ? "Processing..." : (initialData ? "Update Assessment" : "Submit Assessment")}
            </Button>
        </div>
      </form>
    </Form>
  );
}

