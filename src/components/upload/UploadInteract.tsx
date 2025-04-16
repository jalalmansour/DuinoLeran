'use client';

import React, { useState, useCallback } from 'react';
import UploadArea from '@/components/upload/UploadArea';
import SummarySection from '@/components/summary/SummarySection';
import ChatSection from '@/components/chat/ChatSection';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react'; // Import FileText icon
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card'; // Import Card and CardContent
import { cn } from '@/lib/utils';

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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [showUploadArea, setShowUploadArea] = useState<boolean>(true);
  const [showSummary, setShowSummary] = useState<boolean>(false);

  // Callback to handle the file upload from UploadArea
  const handleFileUploaded = useCallback(async (file: UploadedFile) => {
    setUploadedFile(file);
    saveUploadHistory(file); // Save to history using the passed function
    setShowUploadArea(false); // Hide the upload area

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
        setShowSummary(true);
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
    
      {showUploadArea ? (
        <UploadArea onFileUploaded={handleFileUploaded} />
      ) : null}

      {uploadedFile && (
        
          {showSummary && (
            
              
                Summary
              
              
                
                  <SummarySection
                    summary={summary}
                    isSummarizing={isSummarizing}
                    uploadedFile={uploadedFile}
                  />
                
              
            
          )}
          
              
                Chat with Document
              
              
                <ChatSection
                  chatHistory={chatHistory}
                  isChatLoading={isChatLoading}
                  uploadedFile={uploadedFile}
                  onSendMessage={handleSendMessage}
                />
              
            
          
        
      )}
    
  );
};

export default UploadInteract;
