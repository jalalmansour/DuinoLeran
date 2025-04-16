'use client';

import React, { useState, useCallback, useEffect } from 'react';
import UploadArea from '@/components/upload/UploadArea';
// Import SummarySection and ChatSection if they are defined elsewhere
// For this example, we assume they exist.
import SummarySection from '@/components/summary/SummarySection';
import ChatSection from '@/components/chat/ChatSection';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils'; // Assuming cn is used for styling
import { Button } from '@/components/ui/button';
import { File, ArrowLeft } from 'lucide-react'; // Added icons
import { getFileIcon } from '@/app/page'; // Ensure this function exists and is correctly imported

// Define interfaces needed within this component or import them
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number; // Added lastModified based on UploadArea usage
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
  toast: any; // Use a more specific type if possible
}

// --- Placeholder/Simplified BasicFileInfo based on UploadArea's usage ---
interface BasicFileInfo {
    id: string; name: string; type: string; size: number; lastModified: number;
}
// --- End Placeholder ---


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
  // State to control visibility based on upload status
  const [showUploadArea, setShowUploadArea] = useState<boolean>(!uploadedFile); // Show if no file initially
  const [showSummary, setShowSummary] = useState<boolean>(!!summary); // Show if summary exists
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false); // Summary collapse state

  // This effect runs when `uploadedFile` prop changes (e.g., from history load)
  useEffect(() => {
    if (uploadedFile) {
        setShowUploadArea(false); // Hide upload area if a file is loaded
        setChatHistory([]); // Clear previous chat
        setSummary('');     // Clear previous summary
        setShowSummary(false); // Hide summary until new one is fetched
        triggerSummarization(uploadedFile); // Fetch new summary
    } else {
        setShowUploadArea(true); // Show upload area if file is cleared
        setChatHistory([]);
        setSummary('');
        setShowSummary(false);
    }
  }, [uploadedFile]); // Dependency: uploadedFile prop

  // Function to call the summarization API
  const triggerSummarization = useCallback(async (file: UploadedFile) => {
    // Basic check: only summarize text content
    if (file.contentType !== 'text' || !file.content) {
        setSummary(`*Note: Automatic summary not available for this file type (${file.contentType}).*`);
        setShowSummary(true);
        setIsSummarizing(false);
        return;
    }

    setIsSummarizing(true);
    setShowSummary(true); // Show the section, it will display loading state
    setSummary(''); // Clear previous summary before fetching

    try {
      // Replace with your actual API endpoint
      const response = await fetch('/api/summarize-document', { // Example endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: file.content }),
      });

      if (!response.ok) {
        const errorData = await response.text(); // Get error text
        throw new Error(errorData || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.summary) {
          setSummary(data.summary);
          setXp(prevXp => prevXp + 10); // Award XP for summary
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
  }, [toast, setXp]); // Dependencies

  // Callback passed to UploadArea
  const handleFileSelected = useCallback((file: UploadedFile) => {
      setUploadedFile(file); // Update parent state
      saveUploadHistory(file); // Save history
      // Summarization is triggered by the useEffect watching `uploadedFile`
  }, [setUploadedFile, saveUploadHistory]); // Simplified dependencies

    const handleBackButtonClick = () => {
        setUploadedFile(null); // Clear the uploaded file
        setShowUploadArea(true); // Show the UploadArea
        setChatHistory([]); // Clear chat history
        setSummary(''); // Clear summary
        setShowSummary(false); // Hide the summary
    };


  // Function to handle sending chat message
  const handleSendMessage = useCallback(async (message: string) => {
    if (!uploadedFile || !uploadedFile.content) {
      toast({ title: "No File Content", description: "Cannot chat without file content.", variant: "warning" });
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
       // Replace with your actual API endpoint
      const response = await fetch('/api/chat-with-document', { // Example endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send processed content and message
        body: JSON.stringify({ documentContent: uploadedFile.content, userMessage: message }),
      });

      if (!response.ok) {
         const errorData = await response.text();
         throw new Error(errorData || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.response) {
          setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
          setXp(prevXp => prevXp + 5); // Award XP for chat
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
  }, [uploadedFile, toast, setXp]); // Dependencies

    const FileIconComponent = uploadedFile ? getFileIcon(uploadedFile.name) : File;

  return (
    <>
      {/* Conditionally render UploadArea */}
      {showUploadArea ? (
        <UploadArea onFileUploaded={handleFileSelected} />
      ) : (
        <div>
          {/* Display file info and back button */}
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

          {/* Conditionally render Summary and Chat sections only if a file is uploaded */}
          {uploadedFile && (
            <Accordion type="multiple" className="w-full space-y-4 mt-6">
              {/* Summary Section (Collapsible) */}
              <AccordionItem value="summary" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))]">
                  AI Summary &amp; Analysis
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 border-t border-[hsl(var(--border)/0.5)]">
                  {/* Render SummarySection (which should handle its own loading state) */}
                  <SummarySection
                    summary={summary}
                    isSummarizing={isSummarizing}
                    uploadedFile={uploadedFile} // Pass file info if SummarySection needs it
                    isSummaryCollapsed={isSummaryCollapsed}
                    setIsSummaryCollapsed={setIsSummaryCollapsed}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Chat Section (Collapsible) */}
              <AccordionItem value="chat" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))]">
                  Chat with Document
                </AccordionTrigger>
                <AccordionContent className="p-0 border-t border-[hsl(var(--border)/0.5)]">
                  {/* Render ChatSection */}
                  <ChatSection
                    chatHistory={chatHistory}
                    isChatLoading={isChatLoading}
                    uploadedFile={uploadedFile} // Pass file info for context
                    onSendMessage={handleSendMessage} // Pass the send message handler
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
