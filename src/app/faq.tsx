'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'; // Assuming you have Shadcn UI components
import { ScrollArea } from "@/components/ui/scroll-area";

const faqData = [
  {
    question: 'What is DuinoLearn AI?',
    answer: 'DuinoLearn AI is an AI-powered educational tool designed to make learning more interactive and engaging. It uses advanced AI models to explain complex topics, provide personalized feedback, and adapt to your learning style.',
  },
  {
    question: 'How does the AI tutor work?',
    answer: 'Our AI tutor analyzes the content you upload (documents, code, etc.) and generates summaries, explanations, and interactive quizzes. You can ask questions, request different explanations, and receive tailored feedback based on your progress.',
  },
  {
    question: 'What types of files are supported?',
    answer: 'DuinoLearn AI supports a wide range of file types, including text documents (PDF, DOCX), code files (.js, .py, .html), and more. We are continuously expanding our file support.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we take data privacy and security seriously. All uploaded files and interactions are encrypted and stored securely. We do not share your data with third parties.',
  },
  {
    question: 'How much does it cost?',
    answer: 'DuinoLearn AI is currently in beta and offered free of charge. We will announce our pricing plans as we approach the official release.',
  },
  {
    question: 'Can I use it on my mobile device?',
    answer: 'Yes, DuinoLearn AI is designed to be responsive and can be used on any device with a web browser, including smartphones and tablets.',
  },
  {
    question: 'How can I provide feedback?',
    answer: 'We welcome your feedback! You can reach out to us at support@duinolearn.ai with any suggestions, questions, or bug reports.',
  },
];

const FAQPage: React.FC = () => {
  return (
    <motion.div
      className="container mx-auto py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h1>
       <ScrollArea className="max-h-[60vh] w-full max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {faqData.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{item.question}</AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
      <p className="text-center mt-12 text-muted-foreground">
        Still have questions? Contact us at <a href="mailto:support@duinolearn.ai" className="text-blue-500">support@duinolearn.ai</a>
      </p>
    </motion.div>
  );
};

export default FAQPage;
