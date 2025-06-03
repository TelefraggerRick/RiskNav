
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import type { RiskAssessmentFormData } from "@/lib/schemas";
import { riskAssessmentFormSchema, attachmentSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { UploadCloud, FileText, Trash2, Info, UserCheck, Sailboat, AlertCircle, Anchor, Globe, Fingerprint, CalendarClock, User as UserIcon, Award, FileCheck2, ChevronsUpDown, Check, FileBadge } from "lucide-react";
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner'; // Changed to sonner
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { VesselDepartment, VesselRegion } from "@/lib/types";
import { useLanguage } from '@/contexts/LanguageContext';
import { ccgVesselList } from '@/lib/ccgVessels';
import { cn } from "@/lib/utils";


interface RiskAssessmentFormProps {
  onSubmit: (data: RiskAssessmentFormData) => Promise<void>;
  initialData?: Partial<RiskAssessmentFormData>;
  isLoading?: boolean;
}

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'text/plain'];
const departmentOptions: VesselDepartment[] = ['Navigation', 'Deck', 'Engine Room', 'Logistics', 'Other'];
const regionOptions: VesselRegion[] = ['Atlantic', 'Central', 'Western', 'Arctic'];

const T_FORM = {
    vesselAndOverview: { en: "Vessel & Assessment Overview", fr: "Aperçu du navire et de l'évaluation" },
    vesselAndOverviewDesc: { en: "Provide core details about the vessel and the reason for this assessment.", fr: "Fournissez les détails essentiels concernant le navire et la raison de cette évaluation." },
    vesselNameLabel: { en: "Vessel Name *", fr: "Nom du navire *" },
    vesselNamePlaceholder: { en: "Select or search vessel...", fr: "Sélectionnez ou recherchez un navire..." },
    vesselNameNoResults: { en: "No vessel found.", fr: "Aucun navire trouvé." },
    imoLabel: { en: "Vessel IMO Number (Optional)", fr: "Numéro IMO du navire (Facultatif)" },
    imoPlaceholder: { en: "e.g., 1234567", fr: "ex : 1234567" },
    imoDescription: { en: "Enter the 7-digit IMO number if available.", fr: "Entrez le numéro IMO à 7 chiffres s'il est disponible." },
    maritimeExemptionNumberLabel: { en: "Maritime Exemption # (Optional)", fr: "N° d'exemption maritime (Facultatif)"},
    maritimeExemptionNumberPlaceholder: { en: "e.g., ME-2025-001, SD-001/25", fr: "ex : ME-2025-001, SD-001/25"},
    maritimeExemptionNumberDescription: { en: "Enter the official maritime exemption number if applicable.", fr: "Entrez le numéro d'exemption maritime officiel, le cas échéant."},
    departmentLabel: { en: "Department *", fr: "Département *" },
    departmentPlaceholder: { en: "Select department...", fr: "Sélectionnez le département..." },
    departments: { en: "Departments", fr: "Départements" },
    regionLabel: { en: "Region *", fr: "Région *" },
    regionPlaceholder: { en: "Select region...", fr: "Sélectionnez la région..." },
    regions: { en: "Regions", fr: "Régions" },
    patrolStartDateLabel: { en: "Patrol Start Date (Optional)", fr: "Date de début de patrouille (Facultatif)" },
    patrolEndDateLabel: { en: "Patrol End Date (Optional)", fr: "Date de fin de patrouille (Facultatif)" },
    voyageDetailsLabel: { en: "Voyage Details *", fr: "Détails du voyage *" },
    voyageDetailsPlaceholder: { en: "e.g., Route, dates, purpose of voyage", fr: "ex : Route, dates, but du voyage" },
    reasonForRequestLabel: { en: "Reason for Risk Assessment *", fr: "Raison de l'évaluation des risques *" },
    reasonForRequestPlaceholder: { en: "e.g., Sailing short-handed due to X, Officer Y without proper certification for Z", fr: "ex : Navigation à effectif réduit en raison de X, Officier Y sans certification appropriée pour Z" },
    personnelShortagesLabel: { en: "Personnel Shortages & Impact *", fr: "Pénuries de personnel et impact *" },
    personnelShortagesPlaceholder: { en: "Describe specific shortages, roles affected, and potential impact on operations.", fr: "Décrivez les pénuries spécifiques, les rôles affectés et l'impact potentiel sur les opérations." },
    proposedDeviationsLabel: { en: "Proposed Operational Deviations / Mitigations *", fr: "Dérogations opérationnelles / Mesures d'atténuation proposées *" },
    proposedDeviationsPlaceholder: { en: "Describe changes to standard procedures or mitigating actions proposed to manage the risk.", fr: "Décrivez les modifications aux procédures standard ou les mesures d'atténuation proposées pour gérer le risque." },
    exemptionAndIndividualAssessment: { en: "Exemption & Individual Assessment", fr: "Exemption et évaluation individuelle" },
    exemptionAndIndividualAssessmentDesc: { en: "Details regarding the specific exemption and the individual(s) involved.", fr: "Détails concernant l'exemption spécifique et la ou les personnes impliquées." },
    employeeNameLabel: { en: "Employee Name (if applicable)", fr: "Nom de l'employé (le cas échéant)" },
    employeeNamePlaceholder: { en: "e.g., Jane Doe", fr: "ex : Jeanne Dupont" },
    certificateHeldLabel: { en: "Certificate Held (if applicable)", fr: "Certificat détenu (le cas échéant)" },
    certificateHeldPlaceholder: { en: "e.g., Watchkeeping Mate", fr: "ex : Officier de quart à la passerelle" },
    requiredCertificateLabel: { en: "Required Certificate for Position (if applicable)", fr: "Certificat requis pour le poste (le cas échéant)" },
    requiredCertificatePlaceholder: { en: "e.g., Chief Mate", fr: "ex : Premier officier du pont" },
    coSupportExemptionLabel: { en: "Does the Commanding Officer AND Department Head support this exemption? *", fr: "Le commandant ET le chef de département appuient-ils cette exemption? *" },
    deptHeadConfidentLabel: { en: "Is the Department Head confident that the individual can fulfill the required duties? *", fr: "Le chef de département est-il confiant que la personne peut remplir les fonctions requises? *" },
    deptHeadConfidenceReasonLabel: { en: "If yes, why is the Department Head confident? *", fr: "Si oui, pourquoi le chef de département est-il confiant? *" },
    deptHeadConfidenceReasonPlaceholder: { en: "Explain the reasons for confidence...", fr: "Expliquez les raisons de cette confiance..." },
    familiarizationProvidedLabel: { en: "Will the employee be given familiarization as per FSM and crewing profile? *", fr: "L'employé recevra-t-il une familiarisation conformément au MSF et au profil d'équipage? *" },
    workedInDeptLast12MonthsLabel: { en: "Has the individual worked in the required department during the past 12 months? *", fr: "La personne a-t-elle travaillé dans le département requis au cours des 12 derniers mois? *" },
    workedInDeptDetailsLabel: { en: "If Yes, please indicate position and duration. *", fr: "Si oui, veuillez indiquer le poste et la durée. *" },
    workedInDeptDetailsPlaceholder: { en: "e.g., Able Seaman, Jan 2023 - Dec 2023", fr: "ex : Matelot de 1re classe, janv. 2023 - déc. 2023" },
    similarExperienceLabel: { en: "Has the individual worked in positions of similar responsibility before? *", fr: "La personne a-t-elle déjà occupé des postes à responsabilité similaire? *" },
    similarExperienceDetailsLabel: { en: "If Yes, please provide details of similar responsibility. *", fr: "Si oui, veuillez fournir des détails sur la responsabilité similaire. *" },
    similarExperienceDetailsPlaceholder: { en: "Describe previous similar roles and responsibilities...", fr: "Décrivez les rôles et responsabilités similaires antérieurs..." },
    requiredSeaServiceLabel: { en: "Does the individual have the required sea service to apply for the required certificate or rating? *", fr: "La personne possède-t-elle le service en mer requis pour demander le brevet ou le visa requis? *" },
    workingTowardsCertLabel: { en: "Is the individual currently working towards the required certification? *", fr: "La personne travaille-t-elle actuellement à l'obtention de la certification requise? *" },
    certificationProgressSummaryLabel: { en: "If Yes, provide a summary of progress. *", fr: "Si oui, fournissez un résumé des progrès. *" },
    certificationProgressSummaryDesc: { en: "Include exams, courses completed, and progress since last exemption (if applicable).", fr: "Incluez les examens, les cours suivis et les progrès depuis la dernière exemption (le cas échéant)." },
    certificationProgressSummaryPlaceholder: { en: "Summary of certification progress...", fr: "Résumé des progrès de la certification..." },
    operationalConsiderations: { en: "Operational Considerations (Crew & Voyage)", fr: "Considérations opérationnelles (Équipage et voyage)" },
    operationalConsiderationsDesc: { en: "Address crew composition, competency, and specific voyage-related factors.", fr: "Abordez la composition de l'équipage, la compétence et les facteurs spécifiques liés au voyage." },
    crewTeamConsiderations: { en: "Crew/Team Considerations", fr: "Considérations relatives à l'équipage/l'équipe" },
    requestCausesVacancyLabel: { en: "Does this request cause a vacancy elsewhere within the department? *", fr: "Cette demande crée-t-elle un poste vacant ailleurs dans le département? *" },
    crewCompositionSufficientLabel: { en: "Is the crew composition sufficient to effectively support safe and secure operations and protect the environment? *", fr: "La composition de l'équipage est-elle suffisante pour soutenir efficacement des opérations sûres et sécurisées et protéger l'environnement? *" },
    crewCompetencyAssessmentLabel: { en: "Are all other minimum certification requirements met, or are there other exemptions? Do any members help fill competency gaps with higher-than-required certifications? *", fr: "Toutes les autres exigences minimales de certification sont-elles respectées, ou existe-t-il d'autres exemptions? Certains membres aident-ils à combler les lacunes en matière de compétences avec des certifications supérieures à celles requises? *" },
    crewCompetencyAssessmentPlaceholder: { en: "Provide a detailed assessment...", fr: "Fournissez une évaluation détaillée..." },
    crewContinuityProfileLabel: { en: "Will the continuity of crew requirements be met as indicated in the vessel's Crewing Profile? *", fr: "Les exigences relatives à la continuité de l'équipage seront-elles respectées comme indiqué dans le profil d'équipage du navire? *" },
    crewContinuityDetailsLabel: { en: "If not, please provide details on crew continuity. *", fr: "Sinon, veuillez fournir des détails sur la continuité de l'équipage. *" },
    crewContinuityDetailsPlaceholder: { en: "Explain how crew continuity will be managed or the discrepancies...", fr: "Expliquez comment la continuité de l'équipage sera gérée ou les écarts..." },
    voyageConsiderations: { en: "Voyage Considerations", fr: "Considérations relatives au voyage" },
    specialVoyageConsiderationsLabel: { en: "Are there special voyage considerations that impact this exemption? *", fr: "Y a-t-il des considérations particulières relatives au voyage qui ont un impact sur cette exemption? *" },
    specialVoyageConsiderationsDesc: { en: "(E.g., duration and time of transit, type of waters, weather conditions, etc.)", fr: "(Par ex., durée et heure du transit, type d'eaux, conditions météorologiques, etc.)" },
    specialVoyageConsiderationsPlaceholder: { en: "Detail any special voyage considerations...", fr: "Détaillez toutes les considérations particulières relatives au voyage..." },
    programReductionLabel: { en: "Is there any reduction in vessel program requirements that may help reduce the risk? *", fr: "Y a-t-il une réduction des exigences du programme du navire qui pourrait aider à réduire le risque? *" },
    programReductionDesc: { en: "(E.g., No ATON requirements, transit only to refit, etc.)", fr: "(Par ex., aucune exigence SNA, transit uniquement pour remise en état, etc.)" },
    rocNotificationLabel: { en: "If program reduction is planned, has the Regional Operations Center (ROC)/JRCC/MRSC been made aware? *", fr: "Si une réduction du programme est prévue, le Centre régional des opérations (CRO)/JRCC/SCRM en a-t-il été informé? *" },
    yes: { en: "Yes", fr: "Oui" },
    no: { en: "No", fr: "Non" },
    supportingDocuments: { en: "Supporting Documents", fr: "Documents à l'appui" },
    supportingDocumentsDesc: { en: `Attach relevant files (max 5, up to ${MAX_FILE_SIZE_MB}MB each). Allowed: PDF, DOC, DOCX, JPG, PNG, TXT.`, fr: `Joignez les fichiers pertinents (max. 5, jusqu'à ${MAX_FILE_SIZE_MB} Mo chacun). Permis : PDF, DOC, DOCX, JPG, PNG, TXT.` },
    selectFiles: { en: "Select Files", fr: "Sélectionner des fichiers" },
    filesSelected: { en: "{count} / 5 files selected", fr: "{count} / 5 fichiers sélectionnés" },
    selectedFiles: { en: "Selected Files:", fr: "Fichiers sélectionnés :" },
    removeFile: { en: "Remove {fileName}", fr: "Supprimer {fileName}" },
    noFilesAttached: { en: "No files attached yet. Upload supporting documents as needed.", fr: "Aucun fichier joint pour le moment. Téléchargez les documents à l'appui au besoin." },
    resetForm: { en: "Reset Form", fr: "Réinitialiser le formulaire" },
    submitAssessment: { en: "Submit Assessment", fr: "Soumettre l'évaluation" },
    updateAssessment: { en: "Update Assessment", fr: "Mettre à jour l'évaluation" },
    processing: { en: "Processing...", fr: "Traitement en cours..." },
    fileLimitReached: { en: "File Limit Reached", fr: "Limite de fichiers atteinte" },
    fileLimitReachedDesc: { en: "You can upload a maximum of 5 files.", fr: "Vous pouvez téléverser un maximum de 5 fichiers." },
    fileUploadIssues: { en: "File Upload Issues", fr: "Problèmes de téléversement de fichiers" },
};

const RiskAssessmentForm: React.FC<RiskAssessmentFormProps> = React.memo(({ onSubmit, initialData, isLoading = false }) => {
  const form = useForm<RiskAssessmentFormData>({
    resolver: zodResolver(riskAssessmentFormSchema),
    defaultValues: initialData || {
      vesselName: "",
      imoNumber: "",
      maritimeExemptionNumber: "",
      department: undefined,
      region: undefined,
      patrolStartDate: "",
      patrolEndDate: "",
      voyageDetails: "",
      reasonForRequest: "",
      personnelShortages: "",
      proposedOperationalDeviations: "",
      attachments: [],
      employeeName: "",
      certificateHeld: "",
      requiredCertificate: "",
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

  const { getTranslation } = useLanguage();
  const [vesselPopoverOpen, setVesselPopoverOpen] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const currentFilesCount = form.getValues("attachments")?.length || 0;
    if (currentFilesCount >= 5) {
      toast.error(getTranslation(T_FORM.fileLimitReached), { description: getTranslation(T_FORM.fileLimitReachedDesc) }); // Changed to sonner
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

        const validationResult = attachmentSchema.shape.file.safeParse(file);
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
        toast.error(getTranslation(T_FORM.fileUploadIssues), { // Changed to sonner
          description: ( <ul className="list-disc pl-5"> {errors.map((e, i) => <li key={i}>{e}</li>)} </ul> ),
        });
      }
    }
    if (event.target) event.target.value = "";
  }, [append, form, getTranslation]); // Removed toast from deps

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
            <CardTitle className="text-xl flex items-center gap-2"><Sailboat className="h-6 w-6 text-primary"/>{getTranslation(T_FORM.vesselAndOverview)}</CardTitle>
            <CardDescription>{getTranslation(T_FORM.vesselAndOverviewDesc)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <FormField
              control={form.control}
              name="vesselName"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{getTranslation(T_FORM.vesselNameLabel)}</FormLabel>
                  <Popover open={vesselPopoverOpen} onOpenChange={setVesselPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? ccgVesselList.find(
                                (vessel) => vessel.value === field.value
                              )?.label
                            : getTranslation(T_FORM.vesselNamePlaceholder)}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder={getTranslation(T_FORM.vesselNamePlaceholder)} />
                        <CommandList>
                          <CommandEmpty>{getTranslation(T_FORM.vesselNameNoResults)}</CommandEmpty>
                          <CommandGroup>
                            {ccgVesselList.map((vessel) => (
                              <CommandItem
                                value={vessel.label}
                                key={vessel.value}
                                onSelect={() => {
                                  form.setValue("vesselName", vessel.value);
                                  setVesselPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    vessel.value === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {vessel.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="imoNumber" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center gap-1"> <Fingerprint className="h-4 w-4 text-muted-foreground" /> {getTranslation(T_FORM.imoLabel)}</FormLabel> <FormControl><Input placeholder={getTranslation(T_FORM.imoPlaceholder)} {...field} /></FormControl> <FormDescription>{getTranslation(T_FORM.imoDescription)}</FormDescription> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="maritimeExemptionNumber" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center gap-1"> <FileBadge className="h-4 w-4 text-muted-foreground" /> {getTranslation(T_FORM.maritimeExemptionNumberLabel)}</FormLabel> <FormControl><Input placeholder={getTranslation(T_FORM.maritimeExemptionNumberPlaceholder)} {...field} /></FormControl> <FormDescription>{getTranslation(T_FORM.maritimeExemptionNumberDescription)}</FormDescription> <FormMessage /> </FormItem> )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getTranslation(T_FORM.departmentLabel)}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                           <SelectValue placeholder={getTranslation(T_FORM.departmentPlaceholder)} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>{getTranslation(T_FORM.departments)}</SelectLabel>
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
                    <FormLabel>{getTranslation(T_FORM.regionLabel)}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                           <SelectValue placeholder={getTranslation(T_FORM.regionPlaceholder)} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>{getTranslation(T_FORM.regions)}</SelectLabel>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="patrolStartDate" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center gap-1"><CalendarClock className="h-4 w-4 text-muted-foreground" />{getTranslation(T_FORM.patrolStartDateLabel)}</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField control={form.control} name="patrolEndDate" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center gap-1"><CalendarClock className="h-4 w-4 text-muted-foreground" />{getTranslation(T_FORM.patrolEndDateLabel)}</FormLabel> <FormControl><Input type="date" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
            </div>
            <FormField control={form.control} name="voyageDetails" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.voyageDetailsLabel)}</FormLabel> <FormControl><Textarea placeholder={getTranslation(T_FORM.voyageDetailsPlaceholder)} {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="reasonForRequest" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.reasonForRequestLabel)}</FormLabel> <FormControl><Textarea placeholder={getTranslation(T_FORM.reasonForRequestPlaceholder)} {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="personnelShortages" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.personnelShortagesLabel)}</FormLabel> <FormControl><Textarea placeholder={getTranslation(T_FORM.personnelShortagesPlaceholder)} {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
            <FormField control={form.control} name="proposedOperationalDeviations" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.proposedDeviationsLabel)}</FormLabel> <FormControl><Textarea placeholder={getTranslation(T_FORM.proposedDeviationsPlaceholder)} {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg overflow-hidden">
            <CardHeader className="bg-muted/30">
                <CardTitle className="text-xl flex items-center gap-2"><UserCheck className="h-6 w-6 text-primary" />{getTranslation(T_FORM.exemptionAndIndividualAssessment)}</CardTitle>
                <CardDescription>{getTranslation(T_FORM.exemptionAndIndividualAssessmentDesc)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <FormField control={form.control} name="employeeName" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center gap-1"><UserIcon className="h-4 w-4 text-muted-foreground" />{getTranslation(T_FORM.employeeNameLabel)}</FormLabel> <FormControl><Input placeholder={getTranslation(T_FORM.employeeNamePlaceholder)} {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="certificateHeld" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center gap-1"><Award className="h-4 w-4 text-muted-foreground" />{getTranslation(T_FORM.certificateHeldLabel)}</FormLabel> <FormControl><Input placeholder={getTranslation(T_FORM.certificateHeldPlaceholder)} {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="requiredCertificate" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center gap-1"><FileCheck2 className="h-4 w-4 text-muted-foreground" />{getTranslation(T_FORM.requiredCertificateLabel)}</FormLabel> <FormControl><Input placeholder={getTranslation(T_FORM.requiredCertificatePlaceholder)} {...field} /></FormControl> <FormMessage /> </FormItem> )} />

                <FormField control={form.control} name="coDeptHeadSupportExemption" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.coSupportExemptionLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="deptHeadConfidentInIndividual" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.deptHeadConfidentLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchDeptHeadConfident === 'Yes' && (
                    <FormField control={form.control} name="deptHeadConfidenceReason" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.deptHeadConfidenceReasonLabel)}</FormLabel> <FormControl><Textarea placeholder={getTranslation(T_FORM.deptHeadConfidenceReasonPlaceholder)} {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
                )}
                <FormField control={form.control} name="employeeFamiliarizationProvided" render={({ field }) => (
                     <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.familiarizationProvidedLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="workedInDepartmentLast12Months" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.workedInDeptLast12MonthsLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchWorkedInDept === 'Yes' && (
                     <FormField control={form.control} name="workedInDepartmentDetails" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.workedInDeptDetailsLabel)}</FormLabel> <FormControl><Textarea placeholder={getTranslation(T_FORM.workedInDeptDetailsPlaceholder)} {...field} rows={2} /></FormControl> <FormMessage /> </FormItem> )} />
                )}
                 <FormField control={form.control} name="similarResponsibilityExperience" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.similarExperienceLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchSimilarExperience === 'Yes' && (
                     <FormField control={form.control} name="similarResponsibilityDetails" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.similarExperienceDetailsLabel)}</FormLabel> <FormControl><Textarea placeholder={getTranslation(T_FORM.similarExperienceDetailsPlaceholder)} {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
                )}
                <FormField control={form.control} name="individualHasRequiredSeaService" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.requiredSeaServiceLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="individualWorkingTowardsCertification" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.workingTowardsCertLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchWorkingTowardsCert === 'Yes' && (
                     <FormField control={form.control} name="certificationProgressSummary" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.certificationProgressSummaryLabel)}</FormLabel> <FormDescription>{getTranslation(T_FORM.certificationProgressSummaryDesc)}</FormDescription> <FormControl><Textarea placeholder={getTranslation(T_FORM.certificationProgressSummaryPlaceholder)} {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
                )}
            </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg overflow-hidden">
            <CardHeader className="bg-muted/30">
                <CardTitle className="text-xl flex items-center gap-2"><AlertCircle className="h-6 w-6 text-primary"/>{getTranslation(T_FORM.operationalConsiderations)}</CardTitle>
                <CardDescription>{getTranslation(T_FORM.operationalConsiderationsDesc)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">{getTranslation(T_FORM.crewTeamConsiderations)}</h3>
                <FormField control={form.control} name="requestCausesVacancyElsewhere" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.requestCausesVacancyLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="crewCompositionSufficientForSafety" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.crewCompositionSufficientLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="detailedCrewCompetencyAssessment" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.crewCompetencyAssessmentLabel)}</FormLabel> <FormControl><Textarea placeholder={getTranslation(T_FORM.crewCompetencyAssessmentPlaceholder)} {...field} rows={4} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="crewContinuityAsPerProfile" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.crewContinuityProfileLabel)}</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchCrewContinuity === 'No' && (
                    <FormField control={form.control} name="crewContinuityDetails" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.crewContinuityDetailsLabel)}</FormLabel> <FormControl><Textarea placeholder={getTranslation(T_FORM.crewContinuityDetailsPlaceholder)} {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
                )}

                <h3 className="text-lg font-semibold text-foreground border-b pb-2 mt-8">{getTranslation(T_FORM.voyageConsiderations)}</h3>
                <FormField control={form.control} name="specialVoyageConsiderations" render={({ field }) => ( <FormItem> <FormLabel>{getTranslation(T_FORM.specialVoyageConsiderationsLabel)}</FormLabel><FormDescription>{getTranslation(T_FORM.specialVoyageConsiderationsDesc)}</FormDescription> <FormControl><Textarea placeholder={getTranslation(T_FORM.specialVoyageConsiderationsPlaceholder)} {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField control={form.control} name="reductionInVesselProgramRequirements" render={({ field }) => (
                    <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.programReductionLabel)}</FormLabel><FormDescription>{getTranslation(T_FORM.programReductionDesc)}</FormDescription>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                            </RadioGroup>
                        </FormControl> <FormMessage />
                    </FormItem>
                )} />
                {watchProgramReduction === 'Yes' && (
                    <FormField control={form.control} name="rocNotificationOfLimitations" render={({ field }) => (
                        <FormItem className="space-y-3"> <FormLabel>{getTranslation(T_FORM.rocNotificationLabel)}</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                    <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.yes)}</FormLabel> </FormItem>
                                    <FormItem className="flex items-center space-x-2"> <FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">{getTranslation(T_FORM.no)}</FormLabel> </FormItem>
                                </RadioGroup>
                            </FormControl> <FormMessage />
                        </FormItem>
                    )} />
                )}
            </CardContent>
        </Card>

        <Card className="shadow-lg rounded-lg overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl flex items-center gap-2"><UploadCloud className="h-6 w-6 text-primary"/>{getTranslation(T_FORM.supportingDocuments)}</CardTitle>
            <CardDescription>{getTranslation(T_FORM.supportingDocumentsDesc)}</CardDescription>
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
                          <UploadCloud className="h-4 w-4" /> {getTranslation(T_FORM.selectFiles)}
                        </label>
                      </Button>
                      <Input id="file-upload" type="file" multiple onChange={handleFileChange} className="hidden" accept={ALLOWED_FILE_TYPES.join(",")} />
                      <span className="text-sm text-muted-foreground">{getTranslation(T_FORM.filesSelected).replace('{count}', String(fields.length))}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fields.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-md font-medium">{getTranslation(T_FORM.selectedFiles)}</h4>
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={getTranslation(T_FORM.removeFile).replace('{fileName}', String(item.name))}>
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
                    {getTranslation(T_FORM.noFilesAttached)}
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isLoading}>
                {getTranslation(T_FORM.resetForm)}
            </Button>
            <Button type="submit" disabled={isLoading || (!form.formState.isDirty && !initialData)}>
                {isLoading ? getTranslation(T_FORM.processing) : (initialData ? getTranslation(T_FORM.updateAssessment) : getTranslation(T_FORM.submitAssessment))}
            </Button>
        </div>
      </form>
    </Form>
  );
});
RiskAssessmentForm.displayName = 'RiskAssessmentForm';
export default RiskAssessmentForm;
