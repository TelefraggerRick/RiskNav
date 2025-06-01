
'use server';

/**
 * @fileOverview An AI agent that provides a risk score, likelihood/consequence scores, and recommendations based on the risk assessment details.
 *
 * - generateRiskScoreAndRecommendations - A function that handles the risk assessment process.
 * - GenerateRiskScoreAndRecommendationsInput - The input type for the generateRiskScoreAndRecommendations function.
 * - GenerateRiskScoreAndRecommendationsOutput - The return type for the generateRiskScoreAndRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRiskScoreAndRecommendationsInputSchema = z.object({
  vesselInformation: z.string().describe('Information about the vessel involved in the risk assessment, including name, voyage, and region.'),
  imoNumber: z.string().optional().describe('The IMO number of the vessel, if available.'),
  personnelShortages: z.string().describe('Details about personnel shortages on the vessel.'),
  operationalDeviations: z.string().describe('Description of proposed operational deviations.'),
  attachedDocuments: z.array(z.string()).describe('List of attached documents (URLs or data URIs).'),
});

export type GenerateRiskScoreAndRecommendationsInput = z.infer<typeof GenerateRiskScoreAndRecommendationsInputSchema>;

const GenerateRiskScoreAndRecommendationsOutputSchema = z.object({
  riskScore: z.number().describe('The calculated overall risk score (0-100).'),
  likelihoodScore: z.number().min(1).max(5).describe('A numerical likelihood score from 1 (Rare) to 5 (Almost Certain). Example: 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain.'),
  consequenceScore: z.number().min(1).max(5).describe('A numerical consequence score from 1 (Insignificant) to 5 (Catastrophic) considering safety, environment, operations, and reputation. Example: 1=Insignificant, 2=Minor, 3=Moderate, 4=Major, 5=Catastrophic.'),
  recommendations: z.string().describe('AI-generated recommendations for mitigating the identified risks, considering SOLAS and Canadian Marine Personnel Regulations.'),
  regulatoryConsiderations: z.string().describe('Relevant regulatory considerations for the approval authorities, specifically referencing SOLAS and Canadian Marine Personnel Regulations.'),
});

export type GenerateRiskScoreAndRecommendationsOutput = z.infer<typeof GenerateRiskScoreAndRecommendationsOutputSchema>;

export async function generateRiskScoreAndRecommendations(
  input: GenerateRiskScoreAndRecommendationsInput
): Promise<GenerateRiskScoreAndRecommendationsOutput> {
  return generateRiskScoreAndRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRiskScoreAndRecommendationsPrompt',
  input: {schema: GenerateRiskScoreAndRecommendationsInputSchema},
  output: {schema: GenerateRiskScoreAndRecommendationsOutputSchema},
  prompt: `You are an AI assistant designed to evaluate risk assessments for the Canadian Coast Guard, adhering to ISO 31000 risk management principles.

  Based on the provided information, you will generate:
  1. An overall risk score (0-100, where 0 is minimal risk and 100 is maximum risk).
  2. A likelihood score (1-5 scale: 1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain).
  3. A consequence score (1-5 scale: 1=Insignificant, 2=Minor, 3=Moderate, 4=Major, 5=Catastrophic). Consider impacts on safety, environment, operations, and reputation.
  4. Recommendations for mitigating identified risks.
  5. Regulatory considerations.

  Your analysis, recommendations, and regulatory considerations MUST explicitly consider and reference (where appropriate) the vessel's IMO number (if provided), the SOLAS convention, and the Canadian Marine Personnel Regulations.

  Vessel Information: {{{vesselInformation}}}
  {{#if imoNumber}}IMO Number: {{{imoNumber}}}{{/if}}
  Personnel Shortages: {{{personnelShortages}}}
  Operational Deviations: {{{operationalDeviations}}}
  Attached Documents: {{#each attachedDocuments}}{{{this}}} {{/each}}

  Provide the overall risk score, likelihood score, consequence score, suggested mitigations, and regulatory considerations.
  Remember to always provide regulatory considerations.
  Follow the output schema exactly. No additional prose, just JSON.
  `,
});

const generateRiskScoreAndRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateRiskScoreAndRecommendationsFlow',
    inputSchema: GenerateRiskScoreAndRecommendationsInputSchema,
    outputSchema: GenerateRiskScoreAndRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

