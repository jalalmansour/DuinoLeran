// src/components/upload/UploadInteract.tsx
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, File as DefaultFileIcon, HelpCircle, Loader2 } from 'lucide-react';
import { getFileIcon } from '@/components/upload/UploadArea';
import UploadArea from '@/components/upload/UploadArea';
import SummarySection from '@/components/summary/SummarySection';
import ChatSection from '@/components/chat/ChatSection';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth'; // Import mammoth
import JSZip from 'jszip'; // Import jszip
import MediaTagReader from '@/components/MediaTagReader'; // Import the tag reader

// Define interfaces (or import from shared location)
interface UploadedFile {
    id: string; name: string; type: string; size: number; lastModified: number;
    content: any;
    contentType: 'text' | 'code' | 'document' | 'presentation' | 'book' | 'archive' | 'list' | 'metadata' | 'image' | 'audio' | 'video' | 'error' | 'other';
}
interface ImageContent { type: 'image'; data: string; mimeType: string; }
interface ChatMessage { role: 'user' | 'assistant'; content: string; }

interface UploadInteractProps {
  // isProcessing: boolean; // We manage processing state internally now
  setIsProcessing: (isProcessing: boolean) => void; // Keep to inform parent if needed
  onFileProcessed: (file: UploadedFile | null, error?: string) => void; // Callback to parent
  // Remove props managed internally now (like uploadedFile, setUploadedFile)
  // Keep props needed from parent like history management, XP
  saveUploadHistory: (file: UploadedFile) => void;
  xp: number;
  setXp: (updater: number | ((prevXp: number) => number)) => void;
  toast: ReturnType<typeof useToast>['toast'];
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_FILE_SIZE_MB = 50;

// PDF.js Worker Configuration (Client-side)
if (typeof window !== 'undefined') {
  const workerSrc = `/pdf.worker.mjs`;
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }
}

const UploadInteract: React.FC<UploadInteractProps> = ({
  // uploadedFile prop removed, managed internally
  setIsProcessing: setParentProcessing, // Renamed for clarity
  onFileProcessed,
  saveUploadHistory,
  xp,
  setXp,
  toast,
}) => {
  const [internalUploadedFile, setInternalUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false); // Internal processing state
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [showUploadArea, setShowUploadArea] = useState<boolean>(true);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  const [audioVideoTags, setAudioVideoTags] = useState<any>(null); // State for media tags

  // Function to determine content type based on extension/MIME
  const determineContentType = (fileType: string, fileName: string): UploadedFile['contentType'] => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = fileType.toLowerCase();

    if (mimeType.startsWith('text/') || /\.(txt|md|rtf|log|csv|ini|cfg)$/i.test(fileName)) return 'text';
    if (/\.(py|js|jsx|ts|tsx|html|css|scss|json|xml|yaml|yml|java|c|cpp|h|cs|swift|php|rb|go|rs|sql|sh|bat|ps1)$/i.test(fileName) || mimeType.includes('javascript') || mimeType.includes('python') || mimeType.includes('json')) return 'code';
    if (mimeType === 'application/pdf' || extension === 'pdf') return 'document';
    if (mimeType.includes('officedocument.wordprocessingml') || /\.(docx)$/i.test(fileName)) return 'document';
    if (mimeType.includes('officedocument.presentationml') || /\.(pptx)$/i.test(fileName)) return 'presentation';
    if (mimeType === 'application/epub+zip' || extension === 'epub') return 'book';
    if (mimeType === 'application/zip' || /\.(zip|rar|7z|tar|gz)$/i.test(fileName)) return 'archive';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';

    // Fallbacks for less common Office types etc. can be added
    if (mimeType.includes('msword') || extension === 'doc') return 'document'; // Older Word
    if (mimeType.includes('powerpoint') || extension === 'ppt') return 'presentation'; // Older PPT

    return 'other';
  };

  const triggerSummarization = useCallback(async (file: UploadedFile | null) => {
    if (!file) return;

    const canSummarize = ['text', 'code', 'document', 'book'].includes(file.contentType);
    if (!canSummarize || !file.content || typeof file.content !== 'string' || file.content.startsWith('*Error') || file.content.startsWith('*Note:')) {
        const note = file.contentType === 'error' ? '' : `*Note: Automatic summary is not available for this file type/content (${file.contentType}).*`;
      setSummary(note);
      setIsSummarizing(false);
      return;
    }

    setIsSummarizing(true);
    setSummary('');

    try {
      const response = await fetch('/api/summarize-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: file.content }),
      });

      if (!response.ok) { /* ... error handling ... */ throw new Error(`API Error: ${response.statusText || response.status}`) }
      const data = await response.json();
      if (data.summary) {
        setSummary(data.summary);
        setXp(prevXp => prevXp + 10);
      } else { throw new Error('Summary not found in API response.'); }
    } catch (error: any) {
        console.error('Error during summarization fetch:', error);
        setSummary(`*Error generating summary: ${error.message}*`);
        toast({ title: 'Summarization Error', description: error.message || 'Failed to generate summary.', variant: 'destructive' });
    } finally {
        setIsSummarizing(false);
    }
  }, [toast, setXp]);

  // Process the selected file
  const processFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: 'File Too Large', description: `File size exceeds ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
      return null; // Indicate failure
    }

    toast({ title: 'Processing File...', description: file.name });
    setIsProcessingFile(true);
    setParentProcessing(true); // Inform parent
    setAudioVideoTags(null); // Reset media tags

    let fileContent: any = null; // Use 'any' carefully
    let contentType = determineContentType(file.type, file.name);
    let processingError: string | null = null;

    try {
      switch (contentType) {
        case 'text':
        case 'code':
        case 'metadata': // Treat metadata sources like JSON as text initially
          fileContent = await file.text();
          break;

        case 'document':
          if (file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map((s: any) => s.str).join(' ') + '\n'; // Add newline between pages
            }
            fileContent = text.trim();
          } else if (file.type.includes('officedocument.wordprocessingml') || file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            fileContent = result.value;
          } else {
              // Attempt basic text read for other potential document types (doc, rtf)
               try { fileContent = await file.text(); }
               catch { fileContent = '*Note: Could not extract text from this document format.*'; contentType = 'other'; }
          }
          break;

        case 'image':
          fileContent = await new Promise<ImageContent>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              const base64Data = dataUrl.split(',')[1]; // Remove the prefix
              resolve({ type: 'image', data: base64Data, mimeType: file.type });
            };
            reader.onerror = (error) => reject(new Error('Failed to read image file.'));
            reader.readAsDataURL(file);
          });
          break;

        case 'archive':
          const zip = await JSZip.loadAsync(file);
          const fileList = Object.keys(zip.files).filter(name => !zip.files[name].dir); // Get only files
          fileContent = fileList.slice(0, 50); // Limit displayed files
          if (fileList.length > 50) fileContent.push('... (and more)');
          contentType = 'archive'; // Explicitly set type for viewer
          break;

        case 'audio':
        case 'video':
          // We will get tags via the MediaTagReader component effect
          // Set placeholder content for now
          fileContent = { metadata: `Basic metadata for ${file.name} will be extracted.`, transcript: null };
          // The actual tags will be set via setAudioVideoTags later
          break;

        case 'presentation':
        case 'book':
        case 'other':
        default:
          // Attempt text extraction as a fallback for some types, otherwise placeholder
          try {
            fileContent = await file.text();
            if (!fileContent.trim()) throw new Error("Empty content");
            // Keep contentType as presentation/book if text was extracted, else 'other'
            contentType = (contentType === 'presentation' || contentType === 'book') ? contentType : 'text';
          } catch {
             fileContent = `*Note: Direct content view/analysis for file type "${file.type || 'unknown'}" (${file.name.split('.').pop()}) is limited.*`;
             contentType = 'other';
          }
          break;
      }
    } catch (error: any) {
      console.error(`Error processing ${file.name}:`, error);
      processingError = `Error processing file: ${error.message}`;
      fileContent = `*Error: ${error.message}*`;
      contentType = 'error';
    }

    const processedFile: UploadedFile = {
      id: generateId(),
      name: file.name,
      type: file.type || 'unknown',
      size: file.size,
      lastModified: file.lastModified,
      content: fileContent, // This now holds varied types
      contentType: contentType,
    };

    setIsProcessingFile(false);
    setParentProcessing(false); // Inform parent
    return processedFile; // Return the result

  }, [toast, setParentProcessing]);

   // Callback for UploadArea
   const handleFileSelectedFromArea = useCallback(
    async (basicFileInfo: { id: string; name: string; type: string; size: number; lastModified: number; /* File object needed */ file: File }) => {
        if (!basicFileInfo.file) {
             toast({title: "Internal Error", description: "File object missing.", variant: "destructive"});
             return;
        }
       const processed = await processFile(basicFileInfo.file);
       if (processed) {
         setInternalUploadedFile(processed); // Update internal state
         onFileProcessed(processed); // Inform parent
       } else {
          onFileProcessed(null, "File processing failed."); // Inform parent of failure
          setShowUploadArea(true); // Stay on upload area if processing fails early
       }
     },
     [processFile, onFileProcessed, toast] // Dependencies
   );


  // Effect to handle changes in the processed file
  useEffect(() => {
    if (internalUploadedFile) {
      console.log('UploadInteract: Processed file set', internalUploadedFile.name, internalUploadedFile.contentType);
      setShowUploadArea(false);
      setChatHistory([]);
      setSummary('');
      setIsSummarizing(false);
      setIsChatLoading(false);
      setIsSummaryCollapsed(false);
      if (internalUploadedFile.contentType !== 'audio' && internalUploadedFile.contentType !== 'video') {
        // Summarize text/code/doc/book immediately
        triggerSummarization(internalUploadedFile);
      }
       // Note: MediaTagReader will trigger setAudioVideoTags if applicable
    } else {
      console.log('UploadInteract: File cleared');
      setShowUploadArea(true);
      setChatHistory([]);
      setSummary('');
      setIsSummarizing(false);
      setIsChatLoading(false);
      setAudioVideoTags(null);
    }
  }, [internalUploadedFile, triggerSummarization]);

  // Effect to update file content with media tags when available
   useEffect(() => {
        if (internalUploadedFile && (internalUploadedFile.contentType === 'audio' || internalUploadedFile.contentType === 'video') && audioVideoTags) {
             console.log("Updating file content with media tags:", audioVideoTags);
            setInternalUploadedFile(prevFile => prevFile ? ({
                ...prevFile,
                content: { // Structure content for media
                    metadata: JSON.stringify(audioVideoTags, null, 2), // Store tags as JSON string
                    transcript: null // Placeholder for potential future transcription
                }
            }) : null);
            // Optionally trigger summary based on tags?
            // setSummary(`*Media Tags:* ${JSON.stringify(audioVideoTags, null, 2).substring(0, 200)}...`);
        }
    }, [audioVideoTags, internalUploadedFile?.contentType]); // Depend on tags and file type

  const handleSendMessage = useCallback(async (message: string) => {
    if (!internalUploadedFile) { /* ... guard ... */ return; }
    // Allow chat even if content is placeholder/metadata/image
    if (internalUploadedFile.contentType === 'error') { toast({ title: "Cannot Chat", description: "File processing failed.", variant: "warning" }); return; }

    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      // Prepare body - potentially multimodal
      const requestBody: { documentContent: any; userMessage: string } = {
        documentContent: internalUploadedFile.content, // This could be string, object (image), array (archive list)
        userMessage: message,
      };

      // If content is an image object, structure it for the backend/AI
       if (typeof internalUploadedFile.content === 'object' && internalUploadedFile.content?.type === 'image') {
           requestBody.documentContent = {
               type: 'image',
               data: internalUploadedFile.content.data,
               mimeType: internalUploadedFile.content.mimeType
           };
       } else if (typeof internalUploadedFile.content !== 'string') {
            // For other non-string types (like archive list or metadata), stringify them
            requestBody.documentContent = JSON.stringify(internalUploadedFile.content);
       }
       // Otherwise, it's already a string (text, code, doc)

      const response = await fetch('/api/chat-with-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) throw new Error(`API Error: ${response.statusText || response.status}`);
      const data = await response.json();
      if (data.response) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
        setXp(prev => prev + 5);
      } else { throw new Error('No response from AI.'); }
    } catch (error: any) {
        console.error('Chat API error:', error);
        setChatHistory(prev => [...prev, { role: 'assistant', content: `*Error: ${error.message || 'Could not get response.'}*` }]);
        toast({ title: 'Chat Error', description: error.message || 'Failed to get AI response.', variant: 'destructive' });
    } finally {
      setIsChatLoading(false);
    }
  }, [internalUploadedFile, toast, setXp]);

  const handleBackButtonClick = () => {
    setInternalUploadedFile(null); // Clear internal state
    onFileProcessed(null);      // Inform parent
  };

  const FileIconComponent = internalUploadedFile
    ? getFileIcon(internalUploadedFile.name)
    : DefaultFileIcon;

  // --- Render ---
  return (
    <>
      {showUploadArea ? (
         // Pass the modified handleFileSelectedFromArea
        <UploadArea onFileUploaded={handleFileSelectedFromArea} />
      ) : (
        <div className="w-full max-w-4xl mx-auto">
          {/* File Info Bar */}
          {internalUploadedFile && (
            <div className="flex items-center justify-between p-3 md:p-4 bg-muted/50 rounded-md mb-4 border border-border">
                <div className="flex items-center overflow-hidden mr-2 shrink min-w-0">
                   {React.createElement(FileIconComponent, { className: 'h-5 w-5 mr-2 shrink-0 text-[hsl(var(--foreground))]' })}
                    <span className="text-sm font-medium truncate" title={internalUploadedFile.name}>{internalUploadedFile.name}</span>
                   <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">({internalUploadedFile.contentType})</span>
                </div>
                 <Button variant="ghost" size="sm" onClick={handleBackButtonClick} className="shrink-0">
                    <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" /> Upload New
                </Button>
            </div>
          )}

          {/* Viewer Section (Conditional - show viewer if needed) */}
          {/* Example: If you want a dedicated viewer area ABOVE the accordion */}
          {/* {internalUploadedFile && <ViewerComponent file={internalUploadedFile} /> } */}

           {/* Media Tag Reader (runs silently) */}
           {internalUploadedFile && (internalUploadedFile.contentType === 'audio' || internalUploadedFile.contentType === 'video') && (
                <MediaTagReader
                    file={internalUploadedFile as any} // Need to pass the original File object if still available, or handle reading from content if it's a path/URL
                    onSuccess={setAudioVideoTags}
                    onError={(err) => console.warn("Media tag reading error:", err)}
                />
           )}

          {/* Accordion */}
          {internalUploadedFile && (
            <Accordion type="multiple" defaultValue={['summary', 'chat']} className="w-full space-y-4">
              {/* Summary Item */}
              <AccordionItem value="summary" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] data-[state=open]:border-b data-[state=open]:border-[hsl(var(--border)/0.5)]">
                  AI Summary & Analysis
                </AccordionTrigger>
                <AccordionContent className="px-4 pt-3 pb-4">
                  <SummarySection
                    summary={summary}
                    isSummarizing={isSummarizing}
                    uploadedFile={internalUploadedFile}
                    isSummaryCollapsed={isSummaryCollapsed}
                    setIsSummaryCollapsed={setIsSummaryCollapsed}
                  />
                </AccordionContent>
              </AccordionItem>
              {/* Chat Item */}
              <AccordionItem value="chat" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] data-[state=open]:border-b data-[state=open]:border-[hsl(var(--border)/0.5)]">
                  Chat with {internalUploadedFile.contentType}
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  {/* ChatSection might need adjustments if it expects only text content */}
                  <ChatSection
                    chatHistory={chatHistory}
                    isChatLoading={isChatLoading}
                    uploadedFile={internalUploadedFile} // Pass the file with potentially varied content
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
