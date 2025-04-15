// src/components/explanatory.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button as ShadcnButton } from '@/components/ui/button'; // Aliased
import { Loader2, HelpCircle, Code, BookText, FileText, Sparkles } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Example dark theme
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { NeonButton } from '@/app/page'; // Assuming NeonButton is exported from page.tsx or its own file

// --- Interfaces ---

interface UploadedFile {
    id: string;
    name: string;
    type: string;
    size: number;
    lastModified: number;
    content: string;
}

interface KeywordDefinition {
    term: string;
    definition: string;
}

// Define the structure of the AI analysis result
type ContentBlockType = 'summary' | 'definition' | 'example' | 'code' | 'text' | 'question_prompt';

interface ContentBlock {
    type: ContentBlockType;
    content: string; // Markdown, code string, question text, etc.
    language?: string; // For 'code' type
    keywords?: KeywordDefinition[]; // Keywords within this block
}

interface AnalysisSection {
    id: string;
    title: string;
    icon?: React.ElementType; // Optional icon for the section
    blocks: ContentBlock[];
    keywords?: KeywordDefinition[]; // General keywords for the section
}

interface ExplanatoryModeProps {
    file: UploadedFile | null;
    onAskQuestion: (context: string, question: string) => void; // Callback to ask in main chat
    className?: string;
}

// --- Simulation Function --- (Replace with actual AI call)
async function simulateAIAnalysis(content: string, fileType: string, fileName: string): Promise<AnalysisSection[]> {
    console.log(`Simulating AI analysis for ${fileName} (${fileType})...`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

    // Basic type detection
    const isCode = /\.(py|js|jsx|ts|tsx|java|c|cpp|html|css|json)$/i.test(fileName) || fileType.includes('javascript') || fileType.includes('python') || fileType.includes('json');
    const isTextDoc = /\.(txt|md)$/i.test(fileName) || fileType.startsWith('text/');

    const sections: AnalysisSection[] = [];

    if (isCode) {
        // Simulate code analysis (e.g., Python)
        sections.push({
            id: 'code-overview',
            title: 'Code Overview & Purpose',
            icon: Code,
            blocks: [
                { type: 'summary', content: `This code snippet appears to be a **${fileName.split('.').pop()?.toUpperCase()}** script defining basic functions or classes. Its primary purpose seems to be [Simulated Purpose - e.g., data processing, utility functions]. Key modules imported include [Simulated Modules].` },
                { type: 'definition', content: 'Definitions related to the overall script structure.', keywords: [{ term: 'module', definition: 'A file containing Python definitions and statements.' }] },
                { type: 'question_prompt', content: 'What is the main goal of this script?' }
            ],
        });

        // Simulate function/class breakdown
        const simulatedFunctions = content.match(/def\s+\w+\(.*\):|class\s+\w+:/g) || [];
        simulatedFunctions.slice(0, 3).forEach((func, index) => { // Limit simulation
            const name = func.match(/(?:def|class)\s+(\w+)/)?.[1] || `element_${index}`;
            sections.push({
                id: `code-${name}`,
                title: `Analysis: ${func.startsWith('def') ? 'Function' : 'Class'} \`${name}\``,
                icon: func.startsWith('def') ? Sparkles : FileText,
                blocks: [
                    { type: 'summary', content: `Analyzes the \`${name}\` ${func.startsWith('def') ? 'function' : 'class'}. It likely takes [Simulated Params] and performs [Simulated Action].` },
                    { type: 'code', content: `// Simulated relevant code snippet for ${name}\n${content.substring(content.indexOf(func), content.indexOf(func) + 150)}...`, language: fileName.split('.').pop() || 'plaintext' },
                    { type: 'example', content: `*Usage Example (Simulated):*\n\`\`\`python\nresult = ${name}(arg1, arg2)\nprint(result)\n\`\`\`` },
                    { type: 'definition', content: 'Key terms within this code block.', keywords: [{ term: 'parameter', definition: 'A variable listed inside the parentheses in the function definition.' }, { term: 'return value', definition: 'The value a function sends back after execution.' }] },
                    { type: 'question_prompt', content: `Explain the purpose of the \`${name}\` ${func.startsWith('def') ? 'function' : 'class'} in simpler terms.` }
                ],
            });
        });

    } else if (isTextDoc || fileType === 'application/pdf') {
        // Simulate text document analysis (chapters/sections)
        sections.push({
            id: 'doc-introduction',
            title: 'Introduction / Overview',
            icon: BookText,
            blocks: [
                { type: 'summary', content: `This document, **${fileName}**, provides an overview of [Simulated Topic]. It covers key concepts such as [Simulated Concept 1] and [Simulated Concept 2]. The target audience appears to be [Simulated Audience].` },
                { type: 'definition', content: 'Key terms introduced early in the document.', keywords: [{ term: 'abstract', definition: 'A brief summary of a research article, thesis, review, conference proceeding, or any in-depth analysis of a particular subject.' }, { term: 'keyword', definition: 'An informative word used in an information retrieval system to indicate the content of a document.' }] },
                 { type: 'question_prompt', content: 'What is the main argument or thesis of this document?' }
            ],
        });

        // Simulate section breakdown
        for (let i = 1; i <= 3; i++) {
            sections.push({
                id: `doc-section-${i}`,
                title: `Simulated Section ${i}: [Concept ${i}]`,
                icon: FileText,
                blocks: [
                    { type: 'summary', content: `This section delves into **[Simulated Concept ${i}]**. It explains [Simulated Detail A] and provides examples related to [Simulated Detail B].` },
                    { type: 'text', content: `*Key takeaway:* Understanding [Simulated Concept ${i}] is crucial for [Simulated Context].\n\n*[Simulated Paragraph discussing the concept...]*` },
                    { type: 'example', content: `*Analogy:* Think of [Simulated Concept ${i}] like [Simulated Analogy].` },
                    { type: 'definition', content: 'Relevant terms for this section.', keywords: [{ term: `Term ${i}A`, definition: `Definition for Term ${i}A.` }, { term: `Term ${i}B`, definition: `Definition for Term ${i}B.` }] },
                    { type: 'question_prompt', content: `Can you provide another example of [Simulated Concept ${i}]?` }
                ],
            });
        }
    } else {
         // Fallback for unknown types
        sections.push({
            id: 'generic-analysis',
            title: 'General Analysis',
            icon: FileText,
             blocks: [
                { type: 'summary', content: `The file **${fileName}** (${fileType || 'unknown type'}) contains general content. AI analysis suggests it pertains to [Simulated General Topic].` },
                { type: 'text', content: `Unable to perform deep structural analysis due to the file type. You can still ask specific questions about the content using the main chat.`},
                 { type: 'question_prompt', content: `Summarize the first few paragraphs.` }
             ]
        });
    }

    // Simulate error randomly
    // if (Math.random() > 0.8) {
    //     throw new Error("Simulated AI analysis failed due to unexpected data format.");
    // }

    return sections;
}


// --- Helper Components ---

// Keyword Highlight Component
const KeywordHighlight: React.FC<{ keyword: KeywordDefinition }> = ({ keyword }) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="font-semibold text-cyan-300 underline decoration-dotted decoration-cyan-500/50 cursor-help transition-colors hover:text-pink-400 hover:decoration-pink-500/50 filter hover:drop-shadow-[0_0_3px_theme(colors.pink.500)]">
                    {keyword.term}
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="tooltip-content max-w-xs">
                <p className="font-bold text-pink-300">{keyword.term}</p>
                <p className="text-xs text-cyan-200">{keyword.definition}</p>
            </TooltipContent>
        </Tooltip>
    );
};

// Markdown Renderer that handles keywords
const MarkdownWithKeywords: React.FC<{ text: string; keywords?: KeywordDefinition[] }> = ({ text, keywords = [] }) => {
    const processText = (inputText: string): React.ReactNode[] => {
        if (!keywords || keywords.length === 0) {
            return [<ReactMarkdown key="md" remarkPlugins={[remarkGfm]} children={inputText} />];
        }

        // Create a regex that matches any of the keywords, case-insensitive
        // Escape special regex characters in terms
        const escapedTerms = keywords.map(kw => kw.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');

        const parts = inputText.split(regex);
        const nodes: React.ReactNode[] = [];
        let keyCounter = 0;

        parts.forEach((part, index) => {
            const lowerPart = part?.toLowerCase();
            const matchingKeyword = keywords.find(kw => kw.term.toLowerCase() === lowerPart);

            if (matchingKeyword && index % 2 !== 0) { // Matched keyword (odd indices due to split)
                nodes.push(<KeywordHighlight key={`kw-${keyCounter++}`} keyword={matchingKeyword} />);
            } else if (part) { // Regular text part
                // Render the text part using ReactMarkdown
                nodes.push(
                     <ReactMarkdown
                        key={`md-${keyCounter++}`}
                        remarkPlugins={[remarkGfm]}
                        children={part}
                        // Reuse components from main page's MemoizedMarkdown if needed for consistency
                        components={{
                            p: ({node, ...props}) => <span className="inline" {...props} />, // Render paragraphs inline within the flow
                             // Add other component overrides if needed (links, etc.)
                            a: ({ node, ...props }) => <a className="text-pink-400 underline hover:text-pink-300" target="_blank" rel="noopener noreferrer" {...props} />,
                        }}
                    />
                );
            }
        });

        return nodes;
    };

     // Use useMemo to avoid reprocessing on every render unless text/keywords change
    const renderedNodes = useMemo(() => processText(text), [text, keywords]);

    // Wrap in a div to provide a container for the React nodes
    return <div className="prose prose-sm dark:prose-invert max-w-none break-words text-glow-sm text-cyan-200 leading-relaxed">{renderedNodes}</div>;
};


// --- Main Explanatory Mode Component ---

const ExplanatoryMode: React.FC<ExplanatoryModeProps> = ({ file, onAskQuestion, className }) => {
    const [analysisResult, setAnalysisResult] = useState<AnalysisSection[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setAnalysisResult(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        const analyze = async () => {
            setIsLoading(true);
            setError(null);
            setAnalysisResult(null); // Clear previous results
            try {
                const result = await simulateAIAnalysis(file.content, file.type, file.name);
                setAnalysisResult(result);
            } catch (err: any) {
                console.error("Analysis simulation failed:", err);
                setError(err.message || "Failed to analyze the document.");
            } finally {
                setIsLoading(false);
            }
        };

        analyze();
    }, [file]); // Re-run analysis when the file changes

    // Motion variants for accordion content
    const accordionContentVariants = {
        collapsed: { opacity: 0, height: 0, y: -10, transition: { duration: 0.2, ease: "easeOut" } },
        open: { opacity: 1, height: "auto", y: 0, transition: { duration: 0.3, ease: "easeIn" } }
    };

    return (
        <TooltipProvider>
            <Card className={cn("glassmorphic-card h-full flex flex-col", className)}>
                <CardHeader className="border-b border-white/10">
                    <CardTitle className="text-cyan-300 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-pink-400 filter drop-shadow-[0_0_3px_theme(colors.pink.500)]" />
                        AI Explanatory Mode
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Interactive breakdown of {file ? `"${file.name}"` : 'the document'}.
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex-grow p-0 overflow-hidden">
                    <ScrollArea className="h-full p-4 scrollbar-thin scrollbar-thumb-cyan-700/50 scrollbar-track-transparent">
                        {isLoading && (
                            <div className="flex items-center justify-center h-40 space-x-2 text-cyan-300 animate-pulse">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span>Analyzing structure...</span>
                            </div>
                        )}
                        {error && (
                            <div className="flex items-center justify-center h-40 text-red-400">
                                <p>Error: {error}</p>
                            </div>
                        )}
                        {!isLoading && !error && !analysisResult && file && (
                             <div className="flex items-center justify-center h-40 text-gray-500">
                                <p>Ready for analysis.</p>
                            </div>
                        )}
                         {!isLoading && !error && !file && (
                             <div className="flex items-center justify-center h-40 text-gray-500 italic">
                                <p>Upload a file to activate Explanatory Mode.</p>
                            </div>
                        )}

                        {analysisResult && analysisResult.length === 0 && !isLoading && (
                             <div className="flex items-center justify-center h-40 text-gray-500">
                                <p>No specific sections identified for breakdown.</p>
                            </div>
                        )}

                        {analysisResult && analysisResult.length > 0 && (
                            <Accordion type="multiple" className="w-full space-y-3">
                                {analysisResult.map((section, index) => (
                                    <AccordionItem value={section.id} key={section.id} className="glassmorphic-card !rounded-lg border border-cyan-700/30 overflow-hidden bg-black/30">
                                        <AccordionTrigger className="px-4 py-3 text-left hover:bg-cyan-900/30 transition-colors group">
                                            <div className="flex items-center space-x-3">
                                                {section.icon && <section.icon className="w-4 h-4 text-cyan-400 group-hover:text-pink-400 transition-colors flex-shrink-0" />}
                                                <span className="font-medium text-sm text-cyan-200 group-hover:text-cyan-100 transition-colors">{section.title}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pt-0 pb-4 border-t border-cyan-800/50 bg-black/20">
                                             {/* Animate content entry */}
                                            <motion.div
                                                 initial="collapsed"
                                                 animate="open"
                                                 exit="collapsed" // Will likely not exit smoothly without external AnimatePresence control
                                                 variants={accordionContentVariants}
                                                 className="mt-4 space-y-4"
                                            >
                                                {section.blocks.map((block, blockIndex) => (
                                                    <div key={blockIndex} className="border-l-2 border-pink-500/50 pl-3 py-1">
                                                        {block.type === 'summary' && (
                                                            <div>
                                                                <p className="text-xs uppercase font-semibold text-pink-400 mb-1">Summary</p>
                                                                <MarkdownWithKeywords text={block.content} keywords={block.keywords || section.keywords} />
                                                            </div>
                                                        )}
                                                        {block.type === 'text' && (
                                                             <div>
                                                                <p className="text-xs uppercase font-semibold text-teal-400 mb-1">Explanation</p>
                                                                <MarkdownWithKeywords text={block.content} keywords={block.keywords || section.keywords} />
                                                            </div>
                                                        )}
                                                        {block.type === 'definition' && block.keywords && block.keywords.length > 0 && (
                                                            <div>
                                                                <p className="text-xs uppercase font-semibold text-purple-400 mb-1">Key Terms</p>
                                                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                                    {block.keywords.map(kw => <KeywordHighlight key={kw.term} keyword={kw} />)}
                                                                </div>
                                                            </div>
                                                        )}
                                                         {block.type === 'code' && (
                                                            <div>
                                                                <p className="text-xs uppercase font-semibold text-yellow-400 mb-1">Code Snippet</p>
                                                                 <SyntaxHighlighter
                                                                    language={block.language || 'plaintext'}
                                                                    style={vscDarkPlus} // Use imported theme
                                                                    customStyle={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 255, 255, 0.2)', borderRadius: '4px', padding: '0.75rem', margin: '0' }}
                                                                    wrapLines={true}
                                                                    wrapLongLines={true}
                                                                    showLineNumbers={false} // Keep it clean
                                                                    lineNumberStyle={{ opacity: 0.5 }}
                                                                >
                                                                    {block.content}
                                                                </SyntaxHighlighter>
                                                             </div>
                                                         )}
                                                        {block.type === 'example' && (
                                                            <div>
                                                                <p className="text-xs uppercase font-semibold text-green-400 mb-1">Example / Analogy</p>
                                                                <div className="bg-black/30 border border-green-700/30 rounded p-2 italic">
                                                                     <MarkdownWithKeywords text={block.content} keywords={block.keywords || section.keywords} />
                                                                </div>
                                                            </div>
                                                        )}
                                                        {block.type === 'question_prompt' && (
                                                             <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-cyan-800/30">
                                                                <p className="text-sm text-cyan-300/80 italic flex items-center">
                                                                    <HelpCircle className="w-4 h-4 mr-1.5 text-cyan-400/70 inline-block"/>
                                                                    {block.content}
                                                                </p>
                                                                <NeonButton
                                                                    size="xs" // Use a smaller button
                                                                    variant="outline"
                                                                    glowColor='cyan'
                                                                    onClick={() => onAskQuestion(section.title, block.content)}
                                                                    className="px-2 py-1 h-auto text-xs"
                                                                >
                                                                    Ask AI
                                                                </NeonButton>
                                                             </div>
                                                         )}
                                                    </div>
                                                ))}
                                            </motion.div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
};

export default ExplanatoryMode;