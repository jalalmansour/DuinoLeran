// src/components/banner/FeatureBanner.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    FileText,      // For Documents
    Presentation,  // For Slides
    FileCode2,     // For Code
    MicVocal,      // For Audio Transcription
    Video,         // For Video Analysis
    BookOpen,      // For Books/EPUBs
    FileArchive,   // For Archives
    ImageIcon,     // For Images
    BrainCircuit,  // For AI Features (Summary, Explain)
    MessageSquare, // For Chat
    Sparkles,      // General AI / Wow factor
    Puzzle         // For Quizzes/Interaction
} from 'lucide-react';

// Define the structure for each feature slide
interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
}

// List of features to cycle through
const features: Feature[] = [
  {
    title: "Analyze Any Document",
    description: "Upload PDFs, DOCX, or TXT files and receive structured summaries, deep explanations, and extracted insights tailored for fast comprehension.",
    icon: FileText,
  },
  {
    title: "Decode Presentations",
    description: "Understand slides in depth with extracted bullet points, speaker notes, and even auto-generated quizzes from PPT and PPTX files.",
    icon: Presentation,
  },
  {
    title: "Understand Code Faster",
    description: "Drop code in any language—JavaScript, Python, C++, and more—to get logical breakdowns, visual flowcharts, and intelligent debugging assistance.",
    icon: FileCode2,
  },
  {
    title: "Interactive Transcripts",
    description: "Upload audio or video files to generate clean, timestamped transcripts with clickable sections for direct navigation and Q&A.",
    icon: MicVocal,
  },
  {
    title: "Unlock Book Knowledge",
    description: "Read EPUBs and book-like PDFs with AI-powered extraction of themes, character arcs, plot breakdowns, and literary device identification.",
    icon: BookOpen,
  },
  {
    title: "Explore Archives",
    description: "Upload ZIP or RAR files to preview contents, auto-expand relevant materials, and receive an overview of contained documents or code.",
    icon: FileArchive,
  },
  {
    title: "Explain Images & Diagrams",
    description: "Use images, flowcharts, or screenshots to extract embedded text, generate labels, and describe visual information intelligently.",
    icon: ImageIcon,
  },
  {
    title: "AI-Powered Summaries",
    description: "Every file uploaded is summarized using advanced Gemini AI, helping students quickly understand core concepts and main ideas.",
    icon: BrainCircuit,
  },
  {
    title: "Contextual Chat",
    description: "Chat with any uploaded document, code file, transcript, or image and get file-specific answers with citation-based memory.",
    icon: MessageSquare,
  },
  {
    title: "Adaptive Learning Tools",
    description: "Automatically generate glossaries, key takeaways, flashcards, and practice quizzes based on the uploaded content and its structure.",
    icon: Puzzle,
  },
  {
    title: "Mathematical Solver & Visualizer",
    description: "Drop in equations or math-rich images and get symbolic solutions, graph visualizations, and intuitive concept breakdowns.",
    icon: BrainCircuit,
  },
  {
    title: "Scientific Paper Explainer",
    description: "Upload scientific PDFs and get AI-translated layman summaries, defined jargon, and annotated figures for clearer understanding.",
    icon: FileText,
  },
  {
    title: "Multimedia Learning Mode",
    description: "Combine video, audio, and images into a synced interface with layered insights, dynamic highlights, and interactive timestamps.",
    icon: Video,
  },
  {
    title: "Language Learning Companion",
    description: "Use foreign-language content to get translations, grammar breakdowns, conversational examples, and cultural insights.",
    icon: MessageSquare,
  },
  {
    title: "Compressed Code Review",
    description: "Upload zipped code projects and receive a folder breakdown, dependency visualization, and auto-generated READMEs.",
    icon: FileArchive,
  },
  {
    title: "Custom Study Paths",
    description: "Based on uploaded content, DuinoQuest builds step-based learning paths with checkpoints, reviews, and progress tracking.",
    icon: Sparkles,
  },
  {
    title: "Diagram Detection & Concept Mapping",
    description: "Convert uploaded diagrams and flowcharts into interactive, clickable mind maps with concept-based AI breakdowns.",
    icon: ImageIcon,
  },
  {
    title: "File Type Auto-Detection",
    description: "Upload anything—DuinoQuest smartly detects the file type, content, and best interaction mode for AI-powered processing.",
    icon: Sparkles,
  },
  {
    title: "Cross-File Knowledge Linking",
    description: "Upload multiple documents to see how they relate—shared topics, questions, and a merged explanation layer.",
    icon: Puzzle,
  },
  {
    title: "Accessibility Enhanced Mode",
    description: "Screen-reader support, dyslexia-friendly fonts, captioning, color-blind safe palettes, and dark/light/cyberpunk themes.",
    icon: BookOpen,
  },
];


// Animation variants for the feature slides
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50, // Slide in from right or left
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50, // Slide out to right or left
    opacity: 0,
  }),
};

const FeatureBanner: React.FC = () => {
  const [[currentIndex, direction], setCurrentIndex] = useState([0, 0]); // State holds [index, direction]

  // Effect to cycle through features automatically
  useEffect(() => {
    const interval = setInterval(() => {
      // Set direction for animation (-1 for previous, 1 for next)
      setCurrentIndex(prev => [(prev[0] + 1) % features.length, 1]);
    }, 5000); // Change feature every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  const currentFeature = features[currentIndex];

  return (
    <div
      className={cn(
        "relative w-full p-4 sm:p-6 overflow-hidden", // Container styling
        "border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)]", // Themed background/border
        "glassmorphism" // Apply glassmorphism if available
      )}
      style={{ minHeight: '120px' }} // Ensure minimum height
    >
      {/* AnimatePresence handles enter/exit animations */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        {/* motion.div represents the animated slide */}
        <motion.div
          key={currentIndex} // Important: key changes trigger animation
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30, duration: 0.3 },
            opacity: { duration: 0.2 }
          }}
          className="absolute inset-0 p-4 sm:p-6 flex items-center space-x-4" // Position slide absolutely, center content
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            <currentFeature.icon
              className="w-8 h-8 sm:w-10 sm:h-10 text-[hsl(var(--primary))]"
              aria-hidden="true"
            />
          </div>
          {/* Text Content */}
          <div className='min-w-0 flex-1'> {/* Allow text to shrink/wrap */}
            <h3 className="text-base sm:text-lg font-semibold text-[hsl(var(--foreground))]">
              {currentFeature.title}
            </h3>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
              {currentFeature.description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default FeatureBanner;