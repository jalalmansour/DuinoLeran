// src/components/upload/UploadInteract.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import UploadArea from '@/components/upload/UploadArea';
import SummarySection from '@/components/summary/SummarySection';
import ChatSection from '@/components/chat/ChatSection';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Define interfaces needed within this component or import them
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
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
  saveUploadHistory: (file: UploadedFile) => void; // Make sure this prop is passed from Home
  xp: number;
  setXp: (updater: number | ((prevXp: number) => number)) => void; // Allow updater function
  toast: any; // Replace 'any' with the correct type for your toast function
}

const UploadInteract: React.FC<UploadInteractProps> = ({
  uploadedFile,
  setUploadedFile,
  saveUploadHistory, // Receive the save function
  xp,
  setXp,
  toast,
}) => {
  // State related to summary/chat likely belongs here now
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Callback to handle the file upload from UploadArea
  const handleFileUploaded = useCallback(async (file: UploadedFile) => {
    setUploadedFile(file);
    saveUploadHistory(file); // Save to history using the passed function
    // Trigger analysis or other actions needed within this component
    // e.g., call a local summarize function or pass the file up if needed
    toast({ title: 'File Ready in Interact', description: file.name });

    // Summarize the document after upload
    setIsSummarizing(true);
    try {
      const response = await fetch('/api/flows/summarize-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: file.content }),
      });
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      } else {
        console.error('Failed to summarize document:', response.statusText);
        toast({ title: 'Error', description: 'Failed to summarize document.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error during summarization:', error);
      toast({ title: 'Error', description: 'Error during summarization.', variant: 'destructive' });
    } finally {
      setIsSummarizing(false);
    }
  }, [setUploadedFile, saveUploadHistory, toast]); // Add dependencies

  const handleSendMessage = async (message: string) => {
    setIsChatLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);
    try {
      const response = await fetch('/ai/flows/chat-with-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentContent: uploadedFile?.content, userMessage: message }),
      });
      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        console.error('Chat API error:', response.statusText);
        setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: Could not get response from AI.' }]);
      }
    } catch (error) {
      console.error('Chat API error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Error: Could not connect to the server.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <>
      <div className="mt-24">
        <UploadArea onFileUploaded={handleFileUploaded} />
      </div>

      {uploadedFile && (
        <div className="mt-6 space-y-4">
          <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="summary">
                  <AccordionTrigger>Summary</AccordionTrigger>
                  <AccordionContent>
                      <SummarySection
                          summary={summary}
                          isSummarizing={isSummarizing}
                          uploadedFile={uploadedFile}
                          isSummaryCollapsed={isSummaryCollapsed}
                          setIsSummaryCollapsed={setIsSummaryCollapsed}
                      />
                  </AccordionContent>
              </AccordionItem>
            <AccordionItem value="chat">
                <AccordionTrigger>Chat with Document</AccordionTrigger>
                <AccordionContent>
                <ChatSection
                    chatHistory={chatHistory}
                    isChatLoading={isChatLoading}
                    uploadedFile={uploadedFile}
                    onSendMessage={handleSendMessage}
                />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        </div>
      )}
    </>
  );
};

export default UploadInteract;
