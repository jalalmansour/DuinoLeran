'use server';
/**
 * @fileOverview An AI agent that allows users to chat with an AI assistant about the content of a document.
 *
 * - chatWithDocument - A function that handles the chat with document process.
 * - ChatWithDocumentInput - The input type for the chatWithDocument function.
 * - ChatWithDocumentOutput - The return type for the chatWithDocument function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ChatWithDocumentInputSchema = z.object({
  documentContent: z.string().describe('The content of the document.'),
  userMessage: z.string().describe('The user message to the AI assistant.'),
});
export type ChatWithDocumentInput = z.infer<typeof ChatWithDocumentInputSchema>;

const ChatWithDocumentOutputSchema = z.object({
  response: z.string().describe('The response from the AI assistant.'),
});
export type ChatWithDocumentOutput = z.infer<typeof ChatWithDocumentOutputSchema>;

export async function chatWithDocument(input: ChatWithDocumentInput): Promise<ChatWithDocumentOutput> {
  return chatWithDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatWithDocumentPrompt',
  input: {
    schema: z.object({
      documentContent: z.string().describe('The content of the document.'),
      userMessage: z.string().describe('The user message to the AI assistant.'),
    }),
  },
  output: {
    schema: z.object({
      response: z.string().describe('The response from the AI assistant.'),
    }),
  },
  prompt: `You are DuinoBot, a friendly AI tutor that knows everything inside the document provided. Never say you are an AI model or made by Google.

Document Content: {{{documentContent}}}

User Message: {{{userMessage}}}

Response: `,
});

const chatWithDocumentFlow = ai.defineFlow<
  typeof ChatWithDocumentInputSchema,
  typeof ChatWithDocumentOutputSchema
>(
  {
    name: 'chatWithDocumentFlow',
    inputSchema: ChatWithDocumentInputSchema,
    outputSchema: ChatWithDocumentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
