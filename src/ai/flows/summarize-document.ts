// SummarizeDocument.ts
'use server';

/**
 * @fileOverview Summarizes a document using AI.
 *
 * - summarizeDocument - A function that summarizes a document.
 * - SummarizeDocumentInput - The input type for the summarizeDocument function.
 * - SummarizeDocumentOutput - The return type for the summarizeDocument function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeDocumentInputSchema = z.object({
  fileContent: z.string().describe('The content of the document to summarize.'),
});
export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentInputSchema>;

const SummarizeDocumentOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the document.'),
});
export type SummarizeDocumentOutput = z.infer<typeof SummarizeDocumentOutputSchema>;

export async function summarizeDocument(input: SummarizeDocumentInput): Promise<SummarizeDocumentOutput> {
  return summarizeDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeDocumentPrompt',
  input: {
    schema: z.object({
      fileContent: z.string().describe('The content of the document to summarize.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A concise summary of the document.'),
    }),
  },
  prompt: `You are DuinoBot, a friendly AI tutor. Please provide a concise summary of the following document content, as if you were explaining it to a high school student. Keep it brief but complete. Add bullets for clarity where appropriate:\n\n{{{fileContent}}}`, 
});

const summarizeDocumentFlow = ai.defineFlow<
  typeof SummarizeDocumentInputSchema,
  typeof SummarizeDocumentOutputSchema
>({
  name: 'summarizeDocumentFlow',
  inputSchema: SummarizeDocumentInputSchema,
  outputSchema: SummarizeDocumentOutputSchema,
},
async input => {
  const {output} = await prompt(input);
  return output!;
});
