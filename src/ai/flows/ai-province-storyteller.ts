'use server';
/**
 * @fileOverview An AI agent that generates a rich, narrative summary about an Indonesian province.
 *
 * - aiProvinceStoryteller - A function that handles the generation of a province summary.
 * - AIProvinceStorytellerInput - The input type for the aiProvinceStoryteller function.
 * - AIProvinceStorytellerOutput - The return type for the aiProvinceStoryteller function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIProvinceStorytellerInputSchema = z.object({
  provinceName: z
    .string()
    .describe('The name of the Indonesian province for which to generate a story.'),
});
export type AIProvinceStorytellerInput = z.infer<
  typeof AIProvinceStorytellerInputSchema
>;

const AIProvinceStorytellerOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A rich, narrative summary about the province, covering its history, culture, and hidden gems.'
    ),
});
export type AIProvinceStorytellerOutput = z.infer<
  typeof AIProvinceStorytellerOutputSchema
>;

export async function aiProvinceStoryteller(
  input: AIProvinceStorytellerInput
): Promise<AIProvinceStorytellerOutput> {
  return aiProvinceStorytellerFlow(input);
}

const aiProvinceStorytellerPrompt = ai.definePrompt({
  name: 'aiProvinceStorytellerPrompt',
  input: {schema: AIProvinceStorytellerInputSchema},
  output: {schema: AIProvinceStorytellerOutputSchema},
  prompt: `You are an expert Indonesian historian and cultural guide. Your task is to provide a rich, narrative summary about the Indonesian province of {{{provinceName}}}. Focus on its unique history, vibrant culture, and any notable hidden gems or attractions. The summary should be engaging and informative, as if telling a story to a curious explorer. Format the output as a JSON object with a 'summary' field.`,
});

const aiProvinceStorytellerFlow = ai.defineFlow(
  {
    name: 'aiProvinceStorytellerFlow',
    inputSchema: AIProvinceStorytellerInputSchema,
    outputSchema: AIProvinceStorytellerOutputSchema,
  },
  async (input) => {
    const {output} = await aiProvinceStorytellerPrompt(input);
    return output!;
  }
);
