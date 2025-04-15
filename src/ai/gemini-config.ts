// src/ai/gemini-config.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

// Replace with your actual Gemini API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp-01-21' });

/**
 * Sends a prompt to the Gemini API and returns the generated text.
 * @param prompt The prompt string to send to the API.
 * @returns The generated text from the API, or null if an error occurs.
 */
async function getGeminiResponse(prompt: string): Promise<string | null> {
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error('Error fetching from Gemini API:', error);
    return null;
  }
}

/**
 * Generates an explanation for a given text using the Gemini API, with prompt engineering.
 * @param text The text to be explained.
 * @param documentType The type of document (e.g., "novel", "poem", "lecture transcript").
 * @param concept The specific concept or section to focus on (optional).
 * @returns A humanized explanation of the text, or null if an error occurs.
 */
export async function explainText(
  text: string,
  documentType: string,
  concept?: string
): Promise<string | null> {
  const prompt = `
  You are a knowledgeable and engaging literary tutor assisting a student. 
  Explain the following ${documentType}${concept ? ` focusing on the concept of ${concept}` : ''}, in a clear, concise, and human-like manner, suitable for a student. Use examples, analogies, and real-world connections to enhance understanding. Ensure your explanation is original and avoid plagiarism by expressing ideas in your own words and properly attributing any sources if used.

  Text to explain:
  "${text}"
  `;

  const explanation = await getGeminiResponse(prompt);
  return explanation;
}

/**
 * Analyzes a literary text and extracts key information, such as quotes, characters, and themes.
 * @param text The literary text to analyze.
 * @param documentType The type of document (e.g., "novel", "poem").
 * @returns An object containing the analysis results, or null if an error occurs.
 */
export async function analyzeLiteraryText(
  text: string,
  documentType: string
): Promise<any | null> {
  const prompt = `
  You are a literary expert analyzing the following ${documentType}. Identify and extract key information, including:

  1.  Key Quotes: Extract powerful and meaningful quotations with context-aware insights.
  2.  Character Analysis: Provide profiles, traits, and motivations of characters, referencing dialogue and scenes.
  3.  Themes & Symbols: Identify recurring motifs and their significance, linking them to plot or authorial intent.
  4.  Vocabulary & Literary Devices: Highlight metaphors, similes, personification, irony, etc., with definitions and their narrative impact.

  Text to analyze:
  "${text}"

  Format your response as a JSON object with the following structure:
  {
    "keyQuotes": [{ "quote": "...", "explanation": "..." }],
    "characterAnalysis": [{ "character": "...", "traits": [...], "motivations": "..." }],
    "themesAndSymbols": [{ "theme": "...", "significance": "..." }],
    "literaryDevices": [{ "device": "...", "examples": [...], "impact": "..." }]
  }
  `;

  const analysis = await getGeminiResponse(prompt);
  if (analysis) {
    try {
      return JSON.parse(analysis);
    } catch (e) {
      console.error('Error parsing Gemini API response:', e);
      return null;
    }
  }
  return null;
}