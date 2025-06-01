
// src/ai/flows/generate-risk-assessment-summary.ts
'use server';

/**
 * @fileOverview Generates a concise summary of a risk assessment.
 *
 * - generateRiskAssessmentSummary - A function that generates the risk assessment summary.
 * - GenerateRiskAssessmentSummaryInput - The input type for the generateRiskAssessmentSummary function.
 * - GenerateRiskAssessmentSummaryOutput - The return type for the generateRiskAssessmentSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRiskAssessmentSummaryInputSchema = z.object({
  vesselInformation: z.string().describe('Information about the vessel, including name, and region.'),
  imoNumber: z.string().optional().describe('The IMO number of the vessel, if available.'),
  personnelShortages: z.string().describe('Details about personnel shortages.'),
  proposedOperationalDeviations: z
    .string()
    .describe('Description of proposed operational deviations.'),
  additionalDetails: z.string().optional().describe('Any additional details, such as voyage specifics or reason for request.'),
});
export type GenerateRiskAssessmentSummaryInput = z.infer<
  typeof GenerateRiskAssessmentSummaryInputSchema
>;

const GenerateRiskAssessmentSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the risk assessment, referencing relevant SOLAS and Canadian Marine Personnel Regulations where applicable.'),
});
export type GenerateRiskAssessmentSummaryOutput = z.infer<
  typeof GenerateRiskAssessmentSummaryOutputSchema
>;

export async function generateRiskAssessmentSummary(
  input: GenerateRiskAssessmentSummaryInput
): Promise<GenerateRiskAssessmentSummaryOutput> {
  return generateRiskAssessmentSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRiskAssessmentSummaryPrompt',
  input: {schema: GenerateRiskAssessmentSummaryInputSchema},
  output: {schema: GenerateRiskAssessmentSummaryOutputSchema},
  prompt: `You are an expert risk assessment summarizer for the Canadian Coast Guard.

  Please provide a concise summary of the risk assessment based on the following information.
  When generating the summary, consider any implications related to SOLAS (Safety of Life at Sea) convention and the Canadian Marine Personnel Regulations. Make references to these regulations if relevant to the risks or deviations described.

  Vessel Information: {{{vesselInformation}}}
  {{#if imoNumber}}IMO Number: {{{imoNumber}}}{{/if}}
  Personnel Shortages: {{{personnelShortages}}}
  Proposed Operational Deviations: {{{proposedOperationalDeviations}}}
  Additional Details: {{{additionalDetails}}}

  Summary:`, // Ensure the prompt ends with "Summary:"
});

const generateRiskAssessmentSummaryFlow = ai.defineFlow(
  {
    name: 'generateRiskAssessmentSummaryFlow',
    inputSchema: GenerateRiskAssessmentSummaryInputSchema,
    outputSchema: GenerateRiskAssessmentSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

