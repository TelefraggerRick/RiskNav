import { config } from 'dotenv';
config();

import '@/ai/flows/generate-risk-assessment-summary.ts';
import '@/ai/flows/suggest-mitigations.ts';
import '@/ai/flows/generate-risk-score-and-recommendations.ts';