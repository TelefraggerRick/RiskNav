
import { z } from 'zod';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'text/plain'];


export const attachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "File name is required."),
  url: z.string().optional(),
  type: z.string().optional(),
  size: z.number().optional(),
  file: z.instanceof(File).refine(
    (file) => file.size <= MAX_FILE_SIZE_BYTES,
    `Max file size is ${MAX_FILE_SIZE_MB}MB.`
  ).refine(
    (file) => ALLOWED_FILE_TYPES.includes(file.type),
    "Unsupported file type."
  ).optional(),
  uploadedAt: z.string().optional(),
});

export const riskAssessmentFormSchema = z.object({
  vesselName: z.string().min(3, "Vessel name must be at least 3 characters.").max(100),
  imoNumber: z.string().regex(/^[0-9]{7}$/, "IMO number must be 7 digits.").optional().or(z.literal('')),
  department: z.enum(['Navigation', 'Deck', 'Engine Room', 'Logistics', 'Other'], {
    required_error: "Department selection is required.",
  }),
  region: z.enum(['Atlantic', 'Central', 'Western', 'Arctic'], {
    required_error: "Region selection is required.",
  }),
  patrolStartDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format for start date"
  }).or(z.literal('')),
  patrolEndDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format for end date"
  }).or(z.literal('')),
  voyageDetails: z.string().min(10, "Voyage details must be at least 10 characters.").max(1000),
  reasonForRequest: z.string().min(10, "Reason for request must be at least 10 characters.").max(1000),
  personnelShortages: z.string().min(10, "Personnel shortages description must be at least 10 characters.").max(2000),
  proposedOperationalDeviations: z.string().min(10, "Proposed operational deviations must be at least 10 characters.").max(2000),
  attachments: z.array(attachmentSchema).max(5, "Maximum of 5 attachments allowed.").optional().default([]),

  // Exemption & Individual Assessment
  employeeName: z.string().max(100, "Employee name must be 100 characters or less.").optional().or(z.literal('')),
  certificateHeld: z.string().max(200, "Certificate held must be 200 characters or less.").optional().or(z.literal('')),
  requiredCertificate: z.string().max(200, "Required certificate must be 200 characters or less.").optional().or(z.literal('')),
  coDeptHeadSupportExemption: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  deptHeadConfidentInIndividual: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  deptHeadConfidenceReason: z.string().optional(),
  employeeFamiliarizationProvided: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  workedInDepartmentLast12Months: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  workedInDepartmentDetails: z.string().optional(), // Position and duration
  similarResponsibilityExperience: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  similarResponsibilityDetails: z.string().optional(),
  individualHasRequiredSeaService: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  individualWorkingTowardsCertification: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  certificationProgressSummary: z.string().optional(),

  // Crew & Voyage Considerations
  requestCausesVacancyElsewhere: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  crewCompositionSufficientForSafety: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  detailedCrewCompetencyAssessment: z.string().min(1, "This field is required.").optional(),
  crewContinuityAsPerProfile: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  crewContinuityDetails: z.string().optional(), // If not, provide details.
  
  specialVoyageConsiderations: z.string().min(1, "This field is required.").optional(),
  reductionInVesselProgramRequirements: z.enum(['Yes', 'No'], { required_error: "This field is required."}).optional(),
  rocNotificationOfLimitations: z.enum(['Yes', 'No']).optional(),
})
.refine(data => data.coDeptHeadSupportExemption !== undefined, { message: "CO/Dept Head support selection is required.", path: ["coDeptHeadSupportExemption"] })
.refine(data => data.deptHeadConfidentInIndividual !== undefined, { message: "Dept Head confidence selection is required.", path: ["deptHeadConfidentInIndividual"] })
.refine(data => !(data.deptHeadConfidentInIndividual === 'Yes' && !data.deptHeadConfidenceReason), {
  message: "Reason for confidence is required if Dept Head is confident.",
  path: ["deptHeadConfidenceReason"],
})
.refine(data => data.employeeFamiliarizationProvided !== undefined, { message: "Familiarization selection is required.", path: ["employeeFamiliarizationProvided"] })
.refine(data => data.workedInDepartmentLast12Months !== undefined, { message: "This field is required.", path: ["workedInDepartmentLast12Months"] })
.refine(data => !(data.workedInDepartmentLast12Months === 'Yes' && !data.workedInDepartmentDetails), {
  message: "Position and duration are required if worked in department in last 12 months.",
  path: ["workedInDepartmentDetails"],
})
.refine(data => data.similarResponsibilityExperience !== undefined, { message: "This field is required.", path: ["similarResponsibilityExperience"] })
.refine(data => !(data.similarResponsibilityExperience === 'Yes' && !data.similarResponsibilityDetails), {
  message: "Details are required if worked in similar positions.",
  path: ["similarResponsibilityDetails"],
})
.refine(data => data.individualHasRequiredSeaService !== undefined, { message: "Sea service selection is required.", path: ["individualHasRequiredSeaService"] })
.refine(data => data.individualWorkingTowardsCertification !== undefined, { message: "Certification progress selection is required.", path: ["individualWorkingTowardsCertification"] })
.refine(data => !(data.individualWorkingTowardsCertification === 'Yes' && !data.certificationProgressSummary), {
  message: "Summary of progress is required if working towards certification.",
  path: ["certificationProgressSummary"],
})
.refine(data => data.requestCausesVacancyElsewhere !== undefined, { message: "Vacancy selection is required.", path: ["requestCausesVacancyElsewhere"] })
.refine(data => data.crewCompositionSufficientForSafety !== undefined, { message: "Crew composition sufficiency selection is required.", path: ["crewCompositionSufficientForSafety"] })
.refine(data => data.detailedCrewCompetencyAssessment !== undefined && data.detailedCrewCompetencyAssessment.length > 0, { message: "Detailed crew competency assessment is required.", path: ["detailedCrewCompetencyAssessment"] })
.refine(data => data.crewContinuityAsPerProfile !== undefined, { message: "Crew continuity selection is required.", path: ["crewContinuityAsPerProfile"] })
.refine(data => !(data.crewContinuityAsPerProfile === 'No' && !data.crewContinuityDetails), {
  message: "Details are required if crew continuity is not met.",
  path: ["crewContinuityDetails"],
})
.refine(data => data.specialVoyageConsiderations !== undefined && data.specialVoyageConsiderations.length > 0, { message: "Special voyage considerations are required.", path: ["specialVoyageConsiderations"] })
.refine(data => data.reductionInVesselProgramRequirements !== undefined, { message: "Program requirements reduction selection is required.", path: ["reductionInVesselProgramRequirements"] })
.refine(data => !(data.reductionInVesselProgramRequirements === 'Yes' && data.rocNotificationOfLimitations === undefined), {
  message: "ROC/JRCC notification status is required if program requirements are reduced.",
  path: ["rocNotificationOfLimitations"],
})
.refine(data => {
  if (data.patrolStartDate && data.patrolEndDate) {
    try {
      return new Date(data.patrolEndDate) >= new Date(data.patrolStartDate);
    } catch (e) {
      return false; // Invalid date format will be caught by individual field refines
    }
  }
  return true;
}, {
  message: "End date must be on or after start date.",
  path: ["patrolEndDate"],
});


export type RiskAssessmentFormData = z.infer<typeof riskAssessmentFormSchema>;

export const approvalFormSchema = z.object({
  decision: z.enum(['Approved', 'Rejected', 'Needs Information'], { required_error: "Decision is required." }),
  notes: z.string().min(10, "Approval/rejection notes must be at least 10 characters.").max(1000),
});

export type ApprovalFormData = z.infer<typeof approvalFormSchema>;

