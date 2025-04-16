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
  { title: "Analyze Any Document", description: "PDFs, DOCX, TXT - get summaries, explanations, and key insights.", icon: FileText },
  { title: "Decode Presentations", description: "Extract key points, notes, and generate quizzes from PPTX slides.", icon: Presentation },
  { title: "Understand Code Faster", description: "Explain code blocks, visualize logic flow, and get debugging hints (JS, Python, C++, etc.).", icon: FileCode2 },
  { title: "Interactive Transcripts", description: "Transcribe audio/video and interact with clickable, timestamped text.", icon: MicVocal },
  { title: "Unlock Book Knowledge", description: "Explore themes, characters, and literary devices in EPUBs and PDFs.", icon: BookOpen },
  { title: "Explore Archives", description: "Preview contents and understand the purpose of ZIP, RAR files.", icon: FileArchive },
  { title: "Explain Images & Diagrams", description: "Get descriptions, annotations, and text extraction from images.", icon: ImageIcon },
  { title: "AI-Powered Summaries", description: "Instantly grasp the core concepts with concise AI-generated summaries.", icon: BrainCircuit },
  { title: "Contextual Chat", description: "Ask specific questions about your uploaded content and get relevant answers.", icon: MessageSquare },
  { title: "Adaptive Learning Tools", description: "Generate glossaries, quizzes, and key takeaways tailored to your file.", icon: Puzzle },
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