'use server';

/**
 * @fileOverview An AI agent that provides a risk score and recommendations based on the risk assessment details and attached documents.
 *
 * - generateRiskScoreAndRecommendations - A function that handles the risk assessment process.
 * - GenerateRiskScoreAndRecommendationsInput - The input type for the generateRiskScoreAndRecommendations function.
 * - GenerateRiskScoreAndRecommendationsOutput - The return type for the generateRiskScoreAndRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRiskScoreAndRecommendationsInputSchema = z.object({
  vesselInformation: z.string().describe('Information about the vessel involved in the risk assessment.'),
  personnelShortages: z.string().describe('Details about personnel shortages on the vessel.'),
  operationalDeviations: z.string().describe('Description of proposed operational deviations.'),
  attachedDocuments: z.array(z.string()).describe('List of attached documents (URLs or data URIs).'),
});

export type GenerateRiskScoreAndRecommendationsInput = z.infer<typeof GenerateRiskScoreAndRecommendationsInputSchema>;

const GenerateRiskScoreAndRecommendationsOutputSchema = z.object({
  riskScore: z.number().describe('The calculated risk score (0-100).'),
  recommendations: z.string().describe('AI-generated recommendations for mitigating the identified risks.'),
  regulatoryConsiderations: z.string().describe('Relevant regulatory considerations for the approval authorities.'),
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
  prompt: `You are an AI assistant designed to evaluate risk assessments for the Canadian Coast Guard.

  Based on the provided information, you will generate a risk score, recommendations, and regulatory considerations.

  Vessel Information: {{{vesselInformation}}}
  Personnel Shortages: {{{personnelShortages}}}
  Operational Deviations: {{{operationalDeviations}}}
  Attached Documents: {{#each attachedDocuments}}{{{this}}} {{/each}}

  Provide a risk score between 0 and 100, where 0 is minimal risk and 100 is maximum risk.  Also suggest mitigations for the approval authorities to consider and regulatory considerations.
  Remember to always provide a regulatory consideration.
  Follow the output schema exactly. No addtional prose, just JSON.
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
