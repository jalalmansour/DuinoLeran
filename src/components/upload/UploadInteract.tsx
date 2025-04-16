'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { File, ArrowLeft } from 'lucide-react';
import { getFileIcon } from '@/components/upload/UploadArea';
import { DocumentParser } from '@/lib/document-parser';
import { GeminiService } from '@/lib/gemini';
import { jsPDF } from 'jspdf'; // Import jsPDF library
// import 'jspdf-autotable'; // Removed direct import

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string;
  contentType: 'text' | 'list' | 'metadata' | 'image' | 'error' | 'other';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UploadInteractProps {
  uploadedFile: UploadedFile | null;
  setUploadedFile: (file: UploadedFile | null) => void;
  saveUploadHistory: (file: UploadedFile) => void;
  xp: number;
  setXp: (updater: number | ((prevXp: number) => number)) => void;
  toast: any;
}

interface BasicFileInfo {
    id: string; name: string; type: string; size: number; lastModified: number;
}

const UploadInteract: React.FC<UploadInteractProps> = ({
  uploadedFile,
  setUploadedFile,
  saveUploadHistory,
  xp,
  setXp,
  toast,
}) => {
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [showUploadArea, setShowUploadArea] = useState<boolean>(!uploadedFile);
  const [showSummary, setShowSummary] = useState<boolean>(!!summary);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (uploadedFile) {
        setShowUploadArea(false);
        setChatHistory([]);
        setSummary('');
        setShowSummary(false);
        triggerSummarization(uploadedFile);
    } else {
        setShowUploadArea(true);
        setChatHistory([]);
        setSummary('');
        setShowSummary(false);
    }
  }, [uploadedFile]);


  const handleFileSelected = useCallback(async (fileInfo: BasicFileInfo) => {
    let fileContent = '';
    let contentType: 'text' | 'list' | 'metadata' | 'image' | 'error' | 'other' = 'text';

    try {
      const file = await fetch(URL.createObjectURL(new File([], fileInfo.name, { type: fileInfo.type }))).then(r => r.blob());

      if (fileInfo.type.startsWith('text/')) {
        fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
        });
        contentType = 'text';
      } else if (fileInfo.type.startsWith('application/json')) {
        fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
        });
        contentType = 'metadata';
      } else {
        // For other file types, use a placeholder or an empty string
        fileContent = `*Note: Content extraction for file type "${fileInfo.type}" is not yet supported. AI may not work.*`;
        contentType = 'other';
      }

      const newUploadedFile: UploadedFile = {
        ...fileInfo,
        content: fileContent,
        contentType: contentType,
      };

      setUploadedFile(newUploadedFile);
      saveUploadHistory(newUploadedFile);

    } catch (error: any) {
      console.error('Error reading file content:', error);
      toast({ title: 'File Reading Error', description: error.message || 'Could not read file.', variant: 'destructive' });
    }
  }, [setUploadedFile, saveUploadHistory, toast]);


  const triggerSummarization = useCallback(async (file: UploadedFile) => {
    if (!file.content) {
      setSummary('*Note: Automatic summary not available due to missing content.*');
      setShowSummary(true);
      setIsSummarizing(false);
      return;
    }

    setIsSummarizing(true);
    setShowSummary(true);
    setSummary('');

    try {
      const response = await fetch('/api/summarize-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: file.content }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.summary) {
        setSummary(data.summary);
        setXp(prevXp => prevXp + 10);
      } else {
        throw new Error("Summary not found in API response.");
      }
    } catch (error: any) {
      console.error('Error during summarization fetch:', error);
      setSummary(`*Error generating summary: ${error.message}*`);
      toast({ title: 'Summarization Error', description: error.message || 'Failed to generate summary.', variant: 'destructive' });
    } finally {
      setIsSummarizing(false);
    }
  }, [toast, setXp]);


  const handleBackButtonClick = () => {
    setUploadedFile(null);
    setShowUploadArea(true);
    setChatHistory([]);
    setSummary('');
    setShowSummary(false);
  };


  const handleSendMessage = useCallback(async (message: string) => {
    if (!uploadedFile || !uploadedFile.content) {
      toast({ title: "No File Content", description: "Cannot chat without file content.", variant: "warning" });
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat-with-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentContent: uploadedFile.content, userMessage: message }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.response) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
        setXp(prevXp => prevXp + 5);
      } else {
        throw new Error("No response content from AI.");
      }
    } catch (error: any) {
      console.error('Chat API error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `*Error: ${error.message || 'Could not get response.'}*` }]);
      toast({ title: 'Chat Error', description: error.message || 'Failed to get response from AI.', variant: 'destructive' });
    } finally {
      setIsChatLoading(false);
    }
  }, [uploadedFile, toast, setXp]);


  const FileIconComponent = uploadedFile ? getFileIcon(uploadedFile.name) : File;


  return (
    <>
      {showUploadArea ? (
        <UploadArea onFileUploaded={handleFileSelected} />
      ) : (
        <div>
          <div className="flex items-center justify-between p-4 bg-muted rounded-md mb-4">
            <div className="flex items-center">
              {React.createElement(FileIconComponent, { className: 'h-5 w-5 mr-2' })}
              <span className="text-sm font-medium">{uploadedFile.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleBackButtonClick}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {uploadedFile && (
            <Accordion type="multiple" className="w-full space-y-4 mt-6">
              <AccordionItem value="summary" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))]">
                  AI Summary &amp; Analysis
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 border-t border-[hsl(var(--border)/0.5)]">
                  <SummarySection
                    summary={summary}
                    isSummarizing={isSummarizing}
                    uploadedFile={uploadedFile}
                    isSummaryCollapsed={isSummaryCollapsed}
                    setIsSummaryCollapsed={setIsSummaryCollapsed}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="chat" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))]">
                  Chat with Document
                </AccordionTrigger>
                <AccordionContent className="p-0 border-t border-[hsl(var(--border)/0.5)]">
                  <ChatSection
                    chatHistory={chatHistory}
                    isChatLoading={isChatLoading}
                    uploadedFile={uploadedFile}
                    onSendMessage={handleSendMessage}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}
    </>
  );
};

export default UploadInteract;
