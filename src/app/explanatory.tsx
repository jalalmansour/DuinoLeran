// src/app/explanatory.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GeminiService } from "@/lib/gemini"; // Assume this service handles Gemini API calls
import { DocumentParser } from "@/lib/document-parser"; // Assume this parses and segments documents
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "next-themes";
import { Loader2, Download, Lightbulb, ChatCircleDots } from "lucide-react";

interface ExplanationBlock {
  title: string;
  content: string;
  keyQuotes?: string[];
  characterAnalysis?: string;
  themesAndSymbols?: string;
  historicalContext?: string;
  vocabulary?: { term: string; definition: string }[];
  comprehensionQuestions?: string[];
  paragraphSummary?: string;
  realWorldConnections?: string;
  emotionAndTone?: string;
}

const ExplanatoryComponent: React.FC = () => {
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  const [explanationBlocks, setExplanationBlocks] = useState<
    ExplanationBlock[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (documentContent) {
      analyzeDocument(documentContent);
    }
  }, [documentContent]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    setError(null);
    const file = event.target.files?.[0];
    if (file) {
      try {
        const fileContent = await file.text(); // Assuming text-based documents for now
        setDocumentContent(fileContent);
      } catch (e: any) {
        setError("Error reading file: " + e.message);
      } finally {
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const analyzeDocument = async (content: string) => {
    setLoading(true);
    setError(null);
    try {
      // Use a mock parser for now; replace with actual parsing logic
      const segments = DocumentParser.parse(content);
      const blocks: ExplanationBlock[] = [];

      for (const segment of segments) {
        const block: ExplanationBlock = {
          title: segment.title || "Section",
          content: segment.content,
        };
        //  Call Gemini to get analysis for each section.  Adapt the prompt for your needs.
        const analysis = await GeminiService.analyzeText(
          `Analyze the following text from a literary document and provide key insights:\n\n${segment.content}\n\nFocus on: key quotes, character analysis, themes, historical context, vocabulary, comprehension questions, summaries, real-world connections, and emotion/tone. Return the data as a JSON object.`
        );

        // Process the response from Gemini to populate the explanation block
        if (analysis) {
          Object.assign(block, analysis); // Assuming Gemini returns a JSON object matching ExplanationBlock structure
        }
        blocks.push(block);
      }
      setExplanationBlocks(blocks);
    } catch (e: any) {
      setError("Error analyzing document: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const exportAnalysis = () => {
    // Implement export functionality (e.g., generate PDF or Markdown)
    console.log("Exporting analysis...");
    // You'd likely use a library like `jspdf` or a Markdown generator here
  };

  const handleAskAI = async (section: ExplanationBlock) => {
    const question = prompt("Ask AI about this section:");
    if (question) {
      setLoading(true);
      try {
        const aiResponse = await GeminiService.analyzeText(
          `Answer the following question about the text:\n\nText: ${section.content}\n\nQuestion: ${question}`
        );
        alert(`AI Response: ${aiResponse?.answer || "No answer from AI."}`);
      } catch (e: any) {
        setError("Error asking AI: " + e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      className={`min-h-screen py-12 px-6 ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      }`}
    >
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Explanatory Mode</h1>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            accept=".txt,.pdf,.md"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Upload Document"
            )}
          </Button>
          {explanationBlocks.length > 0 && (
            <Button onClick={exportAnalysis} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Analysis
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong> {error}
        </div>
      )}

      {explanationBlocks.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Lightbulb className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <p className="text-lg">Upload a document to begin exploring its insights with AI.</p>
        </div>
      )}

      <AnimatePresence>
        {explanationBlocks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Accordion type="single" collapsible className="w-full">
              {explanationBlocks.map((block, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-b last:border-none"
                >
                  <AccordionTrigger className="py-4 text-lg font-medium hover:underline flex justify-between items-center">
                    {block.title}
                    <AnimatePresence>
                      {activeBlock === `item-${index}` && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="text-sm text-gray-500 ml-4"
                        >
                          Expanded
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </AccordionTrigger>
                  <AccordionContent className="py-4">
                    <div className="space-y-4">
                      {/* Render content and analysis here with styled elements */}
                      <p className="text-base">{block.content}</p>

                      {block.paragraphSummary && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-gray-50 rounded-md p-4"
                        >
                          <h4 className="font-semibold mb-2">Summary:</h4>
                          <p>{block.paragraphSummary}</p>
                        </motion.div>
                      )}

                      {block.keyQuotes && block.keyQuotes.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <h4 className="font-semibold mb-2">Key Quotes:</h4>
                          <ul>
                            {block.keyQuotes.map((quote, i) => (
                              <li key={i} className="mb-2">
                                <blockquote className="border-l-4 border-primary pl-4 italic">
                                  {quote}
                                </blockquote>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}

                      {block.characterAnalysis && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="bg-gray-50 rounded-md p-4"
                        >
                          <h4 className="font-semibold mb-2">Character Analysis:</h4>
                          <p>{block.characterAnalysis}</p>
                        </motion.div>
                      )}

                      {block.themesAndSymbols && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-gray-50 rounded-md p-4"
                        >
                          <h4 className="font-semibold mb-2">Themes & Symbols:</h4>
                          <p>{block.themesAndSymbols}</p>
                        </motion.div>
                      )}

                      {block.historicalContext && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="bg-gray-50 rounded-md p-4"
                        >
                          <h4 className="font-semibold mb-2">Historical & Cultural Context:</h4>
                          <p>{block.historicalContext}</p>
                        </motion.div>
                      )}

                      {block.vocabulary && block.vocabulary.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          <h4 className="font-semibold mb-2">Vocabulary & Literary Devices:</h4>
                          <ul>
                            {block.vocabulary.map((item, i) => (
                              <li key={i} className="mb-2">
                                <span className="font-medium">{item.term}:</span> {item.definition}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}

                      {block.comprehensionQuestions && block.comprehensionQuestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                        >
                          <h4 className="font-semibold mb-2">Comprehension Questions:</h4>
                          <ol className="list-decimal list-inside">
                            {block.comprehensionQuestions.map((question, i) => (
                              <li key={i} className="mb-2">
                                {question}
                              </li>
                            ))}
                          </ol>
                        </motion.div>
                      )}
                      {block.realWorldConnections && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 }}
                          className="bg-gray-50 rounded-md p-4"
                        >
                          <h4 className="font-semibold mb-2">Real-World Connections & Analysis:</h4>
                          <p>{block.realWorldConnections}</p>
                        </motion.div>
                      )}

                      {block.emotionAndTone && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.9 }}
                          className="bg-gray-50 rounded-md p-4"
                        >
                          <h4 className="font-semibold mb-2">Emotion & Tone Analysis:</h4>
                          <p>{block.emotionAndTone}</p>
                        </motion.div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0 }}
                      >
                        <Button
                          onClick={() => handleAskAI(block)}
                          variant="secondary"
                        >
                          <ChatCircleDots className="mr-2 h-4 w-4" />
                          Ask AI about this section
                        </Button>
                      </motion.div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExplanatoryComponent;