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
import { UploadCloud, FileText, Trash2, Info } from "lucide-react";
import React, { useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RiskAssessmentFormProps {
  onSubmit: (data: RiskAssessmentFormData) => Promise<void>;
  initialData?: Partial<RiskAssessmentFormData>; 
  isLoading?: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'text/plain'];

export default function RiskAssessmentForm({ onSubmit, initialData, isLoading = false }: RiskAssessmentFormProps) {
  const form = useForm<RiskAssessmentFormData>({
    resolver: zodResolver(riskAssessmentFormSchema),
    defaultValues: initialData || {
      vesselName: "",
      vesselIMO: "",
      voyageDetails: "",
      reasonForRequest: "",
      personnelShortages: "",
      proposedOperationalDeviations: "",
      attachments: [],
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
      if (event.target) event.target.value = ""; // Clear the input
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
          description: (
            <ul className="list-disc pl-5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          ),
          variant: "destructive",
        });
      }
    }
    if (event.target) event.target.value = ""; // Clear the input to allow re-selection
  }, [append, toast, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Vessel Information</CardTitle>
            <CardDescription>Provide details about the vessel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="vesselName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vessel Name *</FormLabel>
                  <FormControl><Input placeholder="e.g., CCGS Amundsen" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vesselIMO"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vessel IMO Number (Optional)</FormLabel>
                  <FormControl><Input placeholder="e.g., 9275052 (7 digits)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
            <CardDescription>Describe the situation requiring assessment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="voyageDetails" render={({ field }) => ( <FormItem> <FormLabel>Voyage Details *</FormLabel> <FormControl><Textarea placeholder="e.g., Route, dates, purpose of voyage" {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="reasonForRequest" render={({ field }) => ( <FormItem> <FormLabel>Reason for Risk Assessment *</FormLabel> <FormControl><Textarea placeholder="e.g., Sailing short-handed due to X, Officer Y without proper certification for Z" {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="personnelShortages" render={({ field }) => ( <FormItem> <FormLabel>Personnel Shortages & Impact *</FormLabel> <FormControl><Textarea placeholder="Describe specific shortages, roles affected, and potential impact on operations." {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="proposedOperationalDeviations" render={({ field }) => ( <FormItem> <FormLabel>Proposed Operational Deviations / Mitigations *</FormLabel> <FormControl><Textarea placeholder="Describe changes to standard procedures or mitigating actions proposed to manage the risk." {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Supporting Documents</CardTitle>
            <CardDescription>Attach relevant files (max 5, up to {MAX_FILE_SIZE_MB}MB each). Allowed: PDF, DOC, DOCX, JPG, PNG, TXT.</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="attachments"
              render={() => ( // We don't use field directly for input type="file"
                <FormItem>
                  <FormControl>
                    <div className="flex items-center gap-4">
                       <Button type="button" variant="outline" asChild className="w-auto">
                        <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2">
                          <UploadCloud className="h-4 w-4" /> Select Files
                        </label>
                      </Button>
                      <Input id="file-upload" type="file" multiple onChange={handleFileChange} className="hidden" accept={ALLOWED_FILE_TYPES.join(",")} />
                      <span className="text-sm text-muted-foreground">{fields.length} / 5 files selected</span>
                    </div>
                  </FormControl>
                  <FormMessage /> {/* For array-level errors if any */}
                </FormItem>
              )}
            />
            
            {fields.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium">Selected Files:</h4>
                <ul className="divide-y divide-border rounded-md border bg-background">
                  {fields.map((item, index) => (
                    <li key={item.id} className="flex items-center justify-between p-3">
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
                <Alert className="mt-4 border-dashed">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                    No files attached yet. Upload supporting documents as needed.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => form.reset(initialData || { attachments: [] })} disabled={isLoading}>
                Reset
            </Button>
            <Button type="submit" disabled={isLoading || !form.formState.isDirty && !initialData}>
                {isLoading ? "Processing..." : (initialData ? "Update Assessment" : "Submit Assessment")}
            </Button>
        </div>
      </form>
    </Form>
  );
}
