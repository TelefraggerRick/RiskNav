// This file is machine-generated - edit at your own risk.

'use server';

/**
 * @fileOverview An AI agent to suggest mitigations and regulatory considerations for a risk assessment.
 *
 * - suggestMitigations - A function that suggests mitigations and regulatory considerations for a risk assessment.
 * - SuggestMitigationsInput - The input type for the suggestMitigations function.
 * - SuggestMitigationsOutput - The return type for the suggestMitigations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMitigationsInputSchema = z.object({
  vesselInformation: z.string().describe('Information about the vessel involved in the risk assessment.'),
  personnelShortages: z.string().describe('Details about any personnel shortages.'),
  proposedOperationalDeviations: z.string().describe('Details about proposed deviations from standard operating procedures.'),
  relevantDocuments: z.string().describe('A list of relevant documents attached to the risk assessment.'),
});
export type SuggestMitigationsInput = z.infer<typeof SuggestMitigationsInputSchema>;

const SuggestMitigationsOutputSchema = z.object({
  riskScore: z.number().describe('A numerical score representing the overall risk level (e.g., 1-10, low to high).'),
  suggestedMitigations: z.string().describe('Specific actions to reduce the identified risks.'),
  regulatoryConsiderations: z.string().describe('Relevant regulations and standards that need to be considered.'),
});
export type SuggestMitigationsOutput = z.infer<typeof SuggestMitigationsOutputSchema>;

export async function suggestMitigations(input: SuggestMitigationsInput): Promise<SuggestMitigationsOutput> {
  return suggestMitigationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMitigationsPrompt',
  input: {schema: SuggestMitigationsInputSchema},
  output: {schema: SuggestMitigationsOutputSchema},
  prompt: `You are an expert risk assessment advisor for the Canadian Coast Guard.

  Based on the details provided in the risk assessment, provide a risk score, suggest mitigations, and outline regulatory considerations.

Vessel Information: {{{vesselInformation}}}
Personnel Shortages: {{{personnelShortages}}}
Proposed Operational Deviations: {{{proposedOperationalDeviations}}}
Relevant Documents: {{{relevantDocuments}}}
  `,
});

const suggestMitigationsFlow = ai.defineFlow(
  {
    name: 'suggestMitigationsFlow',
    inputSchema: SuggestMitigationsInputSchema,
    outputSchema: SuggestMitigationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
