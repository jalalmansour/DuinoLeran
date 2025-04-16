// src/components/upload/UploadInteract.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic'; // Using dynamic import for UploadArea potentially
import { motion } from 'framer-motion'; // Keep if animations used here
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, File as DefaultFileIcon } from 'lucide-react'; // Import default icon
// Import getFileIcon helper from UploadArea (ensure path is correct)
import { getFileIcon } from '@/components/upload/UploadArea';
// Import UploadArea component
import UploadArea from '@/components/upload/UploadArea';
// Import sections used within this component
import SummarySection from '@/components/summary/SummarySection';
import ChatSection from '@/components/chat/ChatSection';
// Import other necessary components if needed (e.g., toast)
import { useToast } from '@/hooks/use-toast'; // Import useToast

// Define interfaces needed within this component or import them
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string; // Processed content or placeholder
  contentType: 'text' | 'code' | 'document' | 'presentation' | 'book' | 'archive' | 'list' | 'metadata' | 'image' | 'error' | 'other'; // Added more specific types
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UploadInteractProps {
  uploadedFile: UploadedFile | null; // The processed file object from parent
  setUploadedFile: (file: UploadedFile | null) => void; // Function to update parent state
  saveUploadHistory: (file: UploadedFile) => void; // Function to save history
  xp: number;
  setXp: (updater: number | ((prevXp: number) => number)) => void; // Function to update XP
  toast: ReturnType<typeof useToast>['toast']; // Correct type for toast function
}

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_FILE_SIZE_MB = 50;

const UploadInteract: React.FC<UploadInteractProps> = ({
  uploadedFile,
  setUploadedFile,
  saveUploadHistory,
  xp,
  setXp,
  toast,
}) => {
  // State specific to interaction *after* upload
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [showUploadArea, setShowUploadArea] = useState<boolean>(!uploadedFile);
  // Removed showSummary, deriving from summary content instead
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false); // State for accordion

  // Effect to handle changes in the uploadedFile prop (e.g., loading from history)
  useEffect(() => {
    if (uploadedFile) {
      console.log("UploadInteract useEffect: File detected", uploadedFile.name);
      setShowUploadArea(false); // Hide upload area
      setChatHistory([]);      // Clear previous chat
      setSummary('');          // Clear previous summary
      setIsSummarizing(false); // Reset loading state
      setIsChatLoading(false);
      setIsSummaryCollapsed(false); // Default to open summary
      triggerSummarization(uploadedFile); // Fetch new summary
    } else {
      console.log("UploadInteract useEffect: File cleared");
      setShowUploadArea(true);  // Show upload area
      setChatHistory([]);
      setSummary('');
      setIsSummarizing(false);
      setIsChatLoading(false);
    }
    // Warning: Do not include triggerSummarization directly in deps array if it causes loops
  }, [uploadedFile]); // Only run when the uploadedFile prop changes

  // Callback passed to UploadArea component
  // This function is called when UploadArea has selected a file
  // It now reads the file content and sets the state for the parent (page.tsx)
  const handleFileSelected = useCallback(async (file: File) => { // Expects the raw File object
    let fileContent = '';
    let contentType: UploadedFile['contentType'] = 'text'; // Default guess

    toast({ title: "Processing File...", description: file.name });
    setShowUploadArea(false); // Hide upload immediately

    try {
      // --- File Content Reading/Processing ---
      const fileExtension = file.name.split('.').pop()?.toLowerCase() ?? '';

      // Use FileReader for text-based files
      if (file.type.startsWith('text/') || file.type === 'application/json' || /\.(txt|md|py|js|jsx|ts|tsx|html|css|scss|json|xml|yaml|yml|java|c|cpp|h|cs|swift|php|rb|go|rs|sql|log|cfg|ini|sh|bat|ps1)$/i.test(file.name)) {
        fileContent = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(new Error("Failed to read file as text"));
          reader.readAsText(file, 'UTF-8'); // Specify UTF-8 encoding
        });
        // Refine content type
        contentType = file.type === 'application/json' ? 'metadata' : 'text'; // JSON treated as metadata here
        if (/\.(py|js|jsx|ts|tsx|html|css|java|c|cpp|h|cs|swift|php|rb|go|rs|sql|sh|bat|ps1)$/i.test(file.name)) {
          contentType = 'code';
        }
      }
      // Placeholder logic for other types (implement actual library integrations here)
      else if (file.type === 'application/pdf') {
        fileContent = `*Note: PDF content extraction requires specific library integration (e.g., pdfjs-dist).*`;
        contentType = 'document';
      } else if (fileExtension === 'docx') {
        fileContent = `*Note: DOCX content extraction requires specific library integration (e.g., mammoth.js).*`;
        contentType = 'document';
      } else if (/\.(epub|mobi)$/i.test(file.name)) {
        fileContent = `*Note: EPUB/MOBI content extraction requires specific library integration.*`;
        contentType = 'book';
      } else if (/\.(pptx|ppt|odp)$/i.test(file.name)) {
        fileContent = `*Note: Presentation content extraction requires specific library integration.*`;
        contentType = 'presentation';
      } else if (/\.(zip|rar|tar|gz|7z|iso)$/i.test(file.name) || file.type.includes('zip') || file.type.includes('archive') || file.type.includes('compressed')) {
        fileContent = `*Note: Archive content extraction requires specific library integration (e.g., JSZip).*`;
        contentType = 'archive';
      } else if (file.type.startsWith('image/')) {
        fileContent = `Image File: ${file.name}`; // No content stored/processed here
        contentType = 'image';
      } else if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        fileContent = `Media File: ${file.name}`; // No content stored/processed here
        contentType = file.type.startsWith('audio/') ? 'audio' : 'video';
      } else { // Fallback
        fileContent = `*Note: Content extraction for file type "${file.type || 'unknown'}" (${fileExtension}) is not currently implemented.*`;
        contentType = 'other';
      }

      // Create the UploadedFile object with processed/placeholder content
      const newUploadedFile: UploadedFile = {
        id: generateId(),
        name: file.name,
        type: file.type || 'unknown',
        size: file.size,
        lastModified: file.lastModified,
        content: fileContent, // Store the extracted text or placeholder note
        contentType: contentType,
      };

      // Update the parent component's state
      setUploadedFile(newUploadedFile);
      // Save to history (managed by parent)
      saveUploadHistory(newUploadedFile);

    } catch (error: any) {
      console.error('Error reading/processing file content:', error);
      toast({ title: 'File Processing Error', description: error.message || 'Could not process file.', variant: 'destructive' });
      setUploadedFile(null); // Clear file state in parent on error
      setShowUploadArea(true); // Show upload area again
    }
  }, [setUploadedFile, saveUploadHistory, toast]); // Dependencies


  // Function to trigger the summarization API call
  const triggerSummarization = useCallback(async (file: UploadedFile) => {
    // Check if summarization is appropriate for the content type
    if (file.contentType !== 'text' && file.contentType !== 'code' && file.contentType !== 'document' && file.contentType !== 'book') { // Add contentTypes that are summarizable
      setSummary(`*Note: Automatic summary is not available for this file type (${file.contentType}).*`);
      setIsSummarizing(false);
      return;
    }
    if (!file.content || file.content.startsWith('*Note:')) { // Don't summarize placeholders
      setSummary(`*Note: Cannot summarize placeholder content.*`);
      setIsSummarizing(false);
      return;
    }

    setIsSummarizing(true);
    setSummary(''); // Clear previous summary

    try {
      const response = await fetch('/api/summarize-document', { // Use your actual API endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: file.content }), // Send the extracted content
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `API Error: ${response.status}`);
      }
      const data = await response.json();
      if (data.summary) {
        setSummary(data.summary);
        setXp(prevXp => prevXp + 10); // Award XP
      } else { throw new Error("Summary not found in API response."); }
    } catch (error: any) {
      console.error('Error during summarization fetch:', error);
      setSummary(`*Error generating summary: ${error.message}*`);
      toast({ title: 'Summarization Error', description: error.message || 'Failed to generate summary.', variant: 'destructive' });
    } finally {
      setIsSummarizing(false);
    }
  }, [toast, setXp]); // Dependencies


  // Function to handle sending a chat message
  const handleSendMessage = useCallback(async (message: string) => {
    // Check if chat is appropriate for content type
    if (!uploadedFile || !uploadedFile.content || uploadedFile.contentType === 'error') {
      toast({ title: "Cannot Chat", description: "No file content available or file type not suitable for chat.", variant: "warning" });
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat-with-document', { // Use your actual API endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the (potentially placeholder) content and the user's message
        body: JSON.stringify({ documentContent: uploadedFile.content, userMessage: message }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || `API Error: ${response.status}`);
      }
      const data = await response.json();
      if (data.response) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
        setXp(prevXp => prevXp + 5); // Award XP
      } else { throw new Error("No response content from AI."); }
    } catch (error: any) {
      console.error('Chat API error:', error);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `*Error: ${error.message || 'Could not get response.'}*` }]);
      toast({ title: 'Chat Error', description: error.message || 'Failed to get response from AI.', variant: 'destructive' });
    } finally {
      setIsChatLoading(false);
    }
  }, [uploadedFile, toast, setXp]); // Dependencies


  // Handler for the back button
  const handleBackButtonClick = () => {
    setUploadedFile(null); // Signal parent to clear the file state
    // The useEffect hook watching `uploadedFile` will handle resetting local state
  };

  // Determine the file icon dynamically
  const FileIconComponent = uploadedFile ? getFileIcon(uploadedFile.name) : DefaultFileIcon;

  return (
    <>
      {showUploadArea ? (
        <UploadArea onFileUploaded={handleFileSelected} />
      ) : (
        // Main view after file is selected/processed
        <div>
          {/* File Info Bar with Back Button */}
          {uploadedFile && (
            <div className="flex items-center justify-between p-3 md:p-4 bg-muted/50 rounded-md mb-4 border border-border">
              <div className="flex items-center overflow-hidden mr-2 shrink min-w-0"> {/* Allow shrinking */}
                {/* Render the dynamic icon component */}
                {React.createElement(FileIconComponent, { className: 'h-5 w-5 mr-2 shrink-0 text-[hsl(var(--foreground))]' })}
                <span className="text-sm font-medium truncate" title={uploadedFile.name}>
                  {uploadedFile.name}
                </span>
                <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">({uploadedFile.contentType})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleBackButtonClick} className="shrink-0"> {/* Prevent button shrinking */}
                <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
                Upload New
              </Button>
            </div>
          )}

          {/* Accordion for Summary and Chat */}
          {uploadedFile && (
            <Accordion type="multiple" defaultValue={["summary", "chat"]} className="w-full space-y-4">

              {/* Summary Accordion Item */}
              <AccordionItem value="summary" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] data-[state=open]:border-b data-[state=open]:border-[hsl(var(--border)/0.5)]">
                  AI Summary & Analysis
                </AccordionTrigger>
                <AccordionContent className="px-4 pt-3 pb-4">
                  {/* SummarySection handles its internal rendering including loading state */}
                  <SummarySection
                    summary={summary}
                    isSummarizing={isSummarizing}
                    uploadedFile={uploadedFile} // Pass file for context if needed
                    // Pass collapse state if SummarySection needs external control
                    isSummaryCollapsed={isSummaryCollapsed}
                    setIsSummaryCollapsed={setIsSummaryCollapsed}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Chat Accordion Item */}
              <AccordionItem value="chat" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] data-[state=open]:border-b data-[state=open]:border-[hsl(var(--border)/0.5)]">
                  Chat with Document
                </AccordionTrigger>
                <AccordionContent className="p-0"> {/* Remove padding, ChatSection handles it */}
                  {/* ChatSection handles its internal rendering */}
                  <ChatSection
                    chatHistory={chatHistory}
                    isChatLoading={isChatLoading}
                    uploadedFile={uploadedFile} // Pass file for context
                    onSendMessage={handleSendMessage} // Pass the send handler
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
