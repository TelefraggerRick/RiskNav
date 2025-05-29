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
  vesselIMO: z.string().regex(/^(\d{7})?$/, "IMO number must be 7 digits, if provided.").optional().or(z.literal('')),
  voyageDetails: z.string().min(10, "Voyage details must be at least 10 characters.").max(1000),
  reasonForRequest: z.string().min(10, "Reason for request must be at least 10 characters.").max(1000),
  personnelShortages: z.string().min(10, "Personnel shortages description must be at least 10 characters.").max(2000),
  proposedOperationalDeviations: z.string().min(10, "Proposed operational deviations must be at least 10 characters.").max(2000),
  attachments: z.array(attachmentSchema).max(5, "Maximum of 5 attachments allowed.").optional().default([]),
});

export type RiskAssessmentFormData = z.infer<typeof riskAssessmentFormSchema>;

export const approvalFormSchema = z.object({
  decision: z.enum(['Approved', 'Rejected'], { required_error: "Decision is required." }),
  notes: z.string().min(10, "Approval/rejection notes must be at least 10 characters.").max(1000),
});

export type ApprovalFormData = z.infer<typeof approvalFormSchema>;
