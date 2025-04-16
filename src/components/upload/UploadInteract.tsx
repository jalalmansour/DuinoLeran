'use client';

import React, {useState, useCallback, useEffect, useRef} from 'react';
import dynamic from 'next/dynamic'; // Using dynamic import for UploadArea potentially
import {motion} from 'framer-motion'; // Keep if animations used here
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {ArrowLeft, File as DefaultFileIcon, HelpCircle} from 'lucide-react'; // Import default icon
// Import getFileIcon helper from UploadArea (ensure path is correct)
import {getFileIcon} from '@/components/upload/UploadArea';
// Import UploadArea component
import UploadArea from '@/components/upload/UploadArea';
// Import sections used within this component
import SummarySection from '@/components/summary/SummarySection';
import ChatSection from '@/components/chat/ChatSection';
// Import other necessary components if needed (e.g., toast)
import {useToast} from '@/hooks/use-toast'; // Import useToast
import * as pdfjsLib from 'pdfjs-dist';

// Define interfaces needed within this component or import them
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string; // Processed content or placeholder
  contentType: 'text' | 'code' | 'document' | 'presentation' | 'book' | 'archive' | 'list' | 'metadata' | 'image' | 'audio' | 'video' | 'error' | 'other'; // Added more specific types
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

// Configure PDF.js Worker (Client-side check)
if (typeof window !== 'undefined') {
  const workerSrc = `/pdf.worker.mjs`; // Ensure this file is in /public
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
    console.log(`Setting PDF worker source to local: ${workerSrc}`);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }
}

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
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false); // State for accordion

  // --- Moved triggerSummarization definition BEFORE useEffect ---
  // Function to trigger the summarization API call
  const triggerSummarization = useCallback(
    async file => {
      const canSummarize = ['text', 'code', 'document', 'book'].includes(
        file.contentType
      );
      if (
        !canSummarize ||
        !file.content ||
        file.content.startsWith('*Note:') ||
        file.content.startsWith('*Error')
      ) {
        setSummary(
          `*Note: Automatic summary is not available for this file type/content (${file.contentType}).*`
        );
        setIsSummarizing(false); // Ensure loading state is off
        return;
      }

      setIsSummarizing(true);
      setSummary(''); // Clear previous summary

      try {
        const response = await fetch('/api/summarize-document', {
          // Use your actual API endpoint
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({fileContent: file.content}), // Send the extracted content
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(errorData || `API Error: ${response.status}`);
        }
        const data = await response.json();
        if (data.summary) {
          setSummary(data.summary);
          setXp(prevXp => prevXp + 10); // Award XP
        } else {
          throw new Error('Summary not found in API response.');
        }
      } catch (error: any) {
        console.error('Error during summarization fetch:', error);
        setSummary(`*Error generating summary: ${error.message}*`);
        toast({
          title: 'Summarization Error',
          description: error.message || 'Failed to generate summary.',
          variant: 'destructive',
        });
      } finally {
        setIsSummarizing(false);
      }
    },
    [toast, setXp]
  ); // Dependencies

  // Effect to handle changes in the uploadedFile prop
  useEffect(() => {
    if (uploadedFile) {
      console.log('UploadInteract useEffect: File detected', uploadedFile.name);
      setShowUploadArea(false);
      setChatHistory([]);
      setSummary('');
      setIsSummarizing(false);
      setIsChatLoading(false);
      setIsSummaryCollapsed(false);
      // Now triggerSummarization is defined before this useEffect runs
      triggerSummarization(uploadedFile);
    } else {
      console.log('UploadInteract useEffect: File cleared');
      setShowUploadArea(true);
      setChatHistory([]);
      setSummary('');
      setIsSummarizing(false);
      setIsChatLoading(false);
    }
  }, [uploadedFile, triggerSummarization]); // Add triggerSummarization to dependencies

  // handleFileSelected callback
  const handleFileSelected = useCallback(
    async (file: File) => {
      let fileContent = '';
      let contentType: UploadedFile['contentType'] = 'text';

      toast({title: 'Processing File...', description: file.name});
      setShowUploadArea(false);

      try {
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

        // Text-based files
        if (
          file.type.startsWith('text/') ||
          file.type === 'application/json' ||
          /\.(txt|md|py|js|jsx|ts|tsx|html|css|scss|json|xml|yaml|yml|java|c|cpp|h|cs|swift|php|rb|go|rs|sql|log|cfg|ini|sh|bat|ps1)$/i.test(
            file.name
          )
        ) {
          fileContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = event => resolve(event.target?.result as string);
            reader.onerror = error =>
              reject(new Error('Failed to read file as text'));
            reader.readAsText(file, 'UTF-8');
          });
          contentType = file.type === 'application/json' ? 'metadata' : 'text';
          if (
            /\.(py|js|jsx|ts|tsx|html|css|java|c|cpp|h|cs|swift|php|rb|go|rs|sql|sh|bat|ps1)$/i.test(
              file.name
            )
          ) {
            contentType = 'code';
          }
        }
        // PDF Processing
        else if (file.type === 'application/pdf' || fileExtension === 'pdf') {
          contentType = 'document';
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              text += await page.getTextContent().then(content => {
                return content.items.map(s => s.str).join(' ');
              });
            }
            fileContent = text.trim();
          } catch (error: any) {
            fileContent = `*Error: ${error.message}*`;
            contentType = 'error';
          }
        }
        // ... other file type placeholders (DOCX, EPUB, PPTX, Archive, Image, Media) ...
        else {
          fileContent = `*Note: Content extraction for file type "${
            file.type || 'unknown'
          }" (${fileExtension}) is not currently implemented.*`;
          contentType = 'other';
        }

        const newUploadedFile: UploadedFile = {
          id: generateId(),
          name: file.name,
          type: file.type || 'unknown',
          size: file.size,
          lastModified: file.lastModified,
          content: fileContent,
          contentType: contentType,
        };

        setUploadedFile(newUploadedFile);
        saveUploadHistory(newUploadedFile);
      } catch (error: any) {
        /* ... error handling ... */
      }
    },
    [setUploadedFile, saveUploadHistory, toast]
  );

  // handleSendMessage callback
  const handleSendMessage = useCallback(
    async message => {
      // ... (chat logic as before) ...
      if (
        !uploadedFile ||
        !uploadedFile.content ||
        uploadedFile.contentType === 'error'
      ) {
        /* ... guard ... */ return;
      }
      const userMessage: ChatMessage = {role: 'user', content: message};
      setChatHistory(prev => [...prev, userMessage]);
      setIsChatLoading(true);
      try {
        const response = await fetch('/api/chat-with-document', {
          /* ... */
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            documentContent: uploadedFile.content,
            userMessage: message,
          }),
        });
        if (!response.ok)
          throw new Error(`API Error: ${response.statusText || response.status}`);
        const data = await response.json();
        if (data.response) {
          setChatHistory(prev => [...prev, {role: 'assistant', content: data.response}]);
          setXp(prev => prev + 5);
        } else {
          throw new Error('No response from AI.');
        }
      } catch (error: any) {
        /* ... error handling ... */
      } finally {
        setIsChatLoading(false);
      }
    },
    [uploadedFile, toast, setXp]
  );

  // handleBackButtonClick callback
  const handleBackButtonClick = () => {
    setUploadedFile(null);
  };

  // Determine the file icon
  const FileIconComponent = uploadedFile
    ? getFileIcon(uploadedFile.name)
    : DefaultFileIcon;

  // --- Render ---
  return (
    <>
      {showUploadArea ? (
        <UploadArea onFileUploaded={handleFileSelected} />
      ) : (
        <div>
          {/* File Info Bar */}
          {uploadedFile && (
            <div className="flex items-center justify-between p-3 md:p-4 bg-muted/50 rounded-md mb-4 border border-border">
              <div className="flex items-center overflow-hidden mr-2 shrink min-w-0">
                {React.createElement(FileIconComponent, {
                  className: 'h-5 w-5 mr-2 shrink-0 text-[hsl(var(--foreground))]',
                })}
                <span className="text-sm font-medium truncate" title={uploadedFile.name}>
                  {uploadedFile.name}
                </span>
                <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                  ({uploadedFile.contentType})
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleBackButtonClick} className="shrink-0">
                <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" /> Upload New
              </Button>
            </div>
          )}

          {/* Accordion */}
          {uploadedFile && (
            <Accordion
              type="multiple"
              defaultValue={['summary', 'chat']}
              className="w-full space-y-4"
            >
              {/* Summary Item */}
              <AccordionItem value="summary" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] data-[state=open]:border-b data-[state=open]:border-[hsl(var(--border)/0.5)]">
                  AI Summary &amp; Analysis
                </AccordionTrigger>
                <AccordionContent className="px-4 pt-3 pb-4">
                  <SummarySection
                    summary={summary}
                    isSummarizing={isSummarizing}
                    uploadedFile={uploadedFile}
                    isSummaryCollapsed={isSummaryCollapsed}
                    setIsSummaryCollapsed={setIsSummaryCollapsed}
                  />
                </AccordionContent>
              </AccordionItem>
              {/* Chat Item */}
              <AccordionItem value="chat" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] data-[state=open]:border-b data-[state=open]:border-[hsl(var(--border)/0.5)]">
                  Chat with Document
                </AccordionTrigger>
                <AccordionContent className="p-0">
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
