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
// Remove SummarySection import if only rendered via viewer
// import SummarySection from '@/components/summary/SummarySection';
import ChatSection from '@/components/chat/ChatSection';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';
// import MediaTagReader from '@/components/MediaTagReader'; // Keep if needed

// --- Dynamic Viewers ---
const ViewerLoading = ({ message = "Loading..." }: { message?: string }) => (
    <div className="flex items-center justify-center h-40 text-[hsl(var(--muted-foreground))]">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-[hsl(var(--primary))]" />
        {message}
    </div>
);
const GenericFileViewer = dynamic(() => import('@/components/viewers/GenericFileViewer'), { loading: () => <ViewerLoading message="Loading Viewer..." /> });
const DocumentViewer = dynamic(() => import('@/components/viewers/DocumentViewer'), { loading: () => <ViewerLoading message="Loading Document..." /> });
const CodeViewer = dynamic(() => import('@/components/viewers/CodeViewer'), { loading: () => <ViewerLoading message="Loading Code..." /> });
const ArchiveViewer = dynamic(() => import('@/components/viewers/ArchiveViewer'), { loading: () => <ViewerLoading message="Loading Archive..." /> });
const ImageViewer = dynamic(() => import('@/components/viewers/ImageViewer'), { loading: () => <ViewerLoading message="Loading Image..." /> });
// Add other dynamic viewers as needed...

// --- Interfaces ---
interface UploadedFile {
    id: string; name: string; type: string; size: number; lastModified: number;
    content: any; // string (text), ImageContent, string[] (archive), object (metadata), null
    contentType: 'text' | 'code' | 'document' | 'presentation' | 'book' | 'archive' | 'list' | 'metadata' | 'image' | 'audio' | 'video' | 'error' | 'other';
}
interface FileUploadInfo { // Matches the one from UploadArea
  id: string; name: string; type: string; size: number; lastModified: number; file: File;
}
interface ImageContent { type: 'image'; data: string; mimeType: string; } // Define if not imported
interface ChatMessage { role: 'user' | 'assistant'; content: string; }

interface UploadInteractProps {
  setIsProcessing: (isProcessing: boolean) => void; // Inform parent
  onFileProcessed: (file: UploadedFile | null, error?: string) => void; // Callback to parent
  saveUploadHistory: (file: UploadedFile) => void;
  xp: number;
  setXp: (updater: number | ((prevXp: number) => number)) => void;
  toast: ReturnType<typeof useToast>['toast'];
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_FILE_SIZE_MB = 100; // Match UploadArea

// PDF.js Worker Config
if (typeof window !== 'undefined') {
  const workerSrc = `/pdf.worker.mjs`; // Make sure this file exists in public/
   try {
     if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
     }
   } catch (e) {
     console.warn("Could not set PDF.js worker source. Ensure pdf.worker.mjs is in public folder.", e);
   }
}

const UploadInteract: React.FC<UploadInteractProps> = ({
  setIsProcessing: setParentProcessing,
  onFileProcessed,
  saveUploadHistory,
  xp,
  setXp,
  toast,
}) => {
  const [internalUploadedFile, setInternalUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [showUploadArea, setShowUploadArea] = useState<boolean>(true);
  // Summary collapse state removed, handled by Accordion now
  // const [audioVideoTags, setAudioVideoTags] = useState<any>(null); // Keep if MediaTagReader is used

  // --- Content Type Determination (moved inside for direct access) ---
  const determineContentType = (fileType: string, fileName: string): UploadedFile['contentType'] => {
     const extension = fileName.split('.').pop()?.toLowerCase() || '';
     const mimeType = fileType?.toLowerCase() || ''; // Handle potential undefined type

     // Prioritize specific known types
     if (mimeType.startsWith('image/')) return 'image';
     if (mimeType.startsWith('audio/')) return 'audio';
     if (mimeType.startsWith('video/')) return 'video';
     if (mimeType === 'application/pdf' || extension === 'pdf') return 'document';
     if (mimeType.includes('officedocument.wordprocessingml') || extension === 'docx') return 'document';
     if (mimeType.includes('officedocument.presentationml') || extension === 'pptx') return 'presentation';
     if (mimeType === 'application/epub+zip' || extension === 'epub') return 'book';
     if (mimeType === 'application/zip' || /\.(zip|rar|7z|tar|gz)$/i.test(fileName)) return 'archive';

     // Code files
     if (/\.(py|js|jsx|ts|tsx|html|css|scss|json|xml|yaml|yml|java|c|cpp|h|cs|swift|php|rb|go|rs|sql|sh|bat|ps1)$/i.test(fileName) || mimeType.includes('javascript') || mimeType.includes('python') || mimeType.includes('json')) return 'code';

     // Text-based files
     if (mimeType.startsWith('text/') || /\.(txt|md|rtf|log|csv|ini|cfg)$/i.test(fileName)) return 'text';

     // Less common Office/document types (attempt text extraction later)
     if (mimeType.includes('msword') || extension === 'doc') return 'document';
     if (mimeType.includes('powerpoint') || extension === 'ppt') return 'presentation';
     if (mimeType.includes('spreadsheetml') || /\.(xls|xlsx|ods)$/i.test(fileName)) return 'document'; // Treat spreadsheets as docs for text

     console.warn(`Unknown file type: MIME=${mimeType}, extension=${extension}`);
     return 'other'; // Default fallback
  };

  // --- File Processing Logic ---
  const processFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    if (!file) {
      toast({ title: "Error", description: "No file provided.", variant: "destructive" });
      return null;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: 'File Too Large', description: `Max ${MAX_FILE_SIZE_MB}MB allowed.`, variant: 'destructive' });
      return null;
    }

    console.log(`Starting processing for: ${file.name}, Type: ${file.type}`);
    setIsProcessingFile(true);
    setParentProcessing(true);
    // setAudioVideoTags(null); // Reset if using MediaTagReader

    let fileContent: any = `*Processing error or unsupported format for ${file.name}*`; // Default error content
    let contentType = determineContentType(file.type, file.name);
    let processingError: string | null = null;

    try {
        // Simplified content extraction logic - prioritize based on type
        switch (contentType) {
            case 'text':
            case 'code':
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
                       // Basic join, consider smarter line breaking if needed
                       text += content.items.map((s: any) => s.str).join(' ') + '\n\n';
                    }
                    fileContent = text.trim();
                 } else if (file.type.includes('wordprocessingml') || file.name.endsWith('.docx')) {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    fileContent = result.value;
                 } else {
                    // Fallback text attempt for .doc etc. might fail
                    try { fileContent = await file.text(); contentType = 'text'; } // Reclassify as text if successful
                    catch { /* Keep default error content */ }
                 }
                 break;
            case 'image':
                 fileContent = await new Promise<ImageContent>((resolve, reject) => {
                   const reader = new FileReader();
                   reader.onload = (event) => {
                     const dataUrl = event.target?.result as string;
                     const base64Data = dataUrl.split(',')[1];
                     resolve({ type: 'image', data: base64Data, mimeType: file.type });
                   };
                   reader.onerror = (error) => reject(new Error('Failed to read image file.'));
                   reader.readAsDataURL(file);
                 });
                 break;
            case 'archive':
                 const zip = await JSZip.loadAsync(file);
                 const fileList = Object.keys(zip.files).filter(name => !zip.files[name].dir);
                 fileContent = fileList.slice(0, 50); // Preview limit
                 if (fileList.length > 50) fileContent.push('... (and more)');
                 contentType = 'archive'; // Ensure type for viewer
                 break;
             case 'audio':
             case 'video':
                  // For now, store file name as content for display/chat context
                  // MediaTagReader (if used) will provide actual tags separately
                  fileContent = { metadata: `Basic info for ${file.name}`, fileRef: file }; // Keep file ref if needed by player
                  break;
            // Add cases for presentation, book, etc. using relevant libraries if needed
            default: // 'other' or specific unhandled types
                 try {
                    // Last attempt: try reading as text
                    fileContent = await file.text();
                    if (fileContent.trim()) {
                        contentType = 'text'; // Reclassify if text read works
                    } else {
                        fileContent = `*Note: Content preview not available for this file type (${file.type || 'unknown'}).*`;
                    }
                 } catch {
                    fileContent = `*Note: Cannot display content for this file type (${file.type || 'unknown'}).*`;
                 }
                 break;
        }
        // Validate content length after processing (especially for text)
        if (typeof fileContent === 'string' && fileContent.length > 500000) { // Example limit
             console.warn(`Truncating large content for ${file.name}`);
             fileContent = fileContent.substring(0, 500000) + "\n\n... (Content Truncated)";
        }

    } catch (error: any) {
      console.error(`Error processing ${file.name}:`, error);
      processingError = `Failed to process file: ${error.message}`;
      fileContent = `*Error: ${processingError}*`; // Set error content
      contentType = 'error';
    }

    const processedFile: UploadedFile = {
      id: generateId(),
      name: file.name,
      type: file.type || 'unknown',
      size: file.size,
      lastModified: file.lastModified,
      content: fileContent,
      contentType: contentType,
    };

    console.log(`Finished processing ${processedFile.name}. Content type: ${processedFile.contentType}`);
    setIsProcessingFile(false);
    setParentProcessing(false); // Inform parent

    // Call the parent callback *after* processing is complete
    onFileProcessed(processedFile, processingError ?? undefined);

    return processedFile; // Return the result for internal use

  }, [toast, setParentProcessing, onFileProcessed]); // Dependencies


   // Callback for UploadArea - receives FileUploadInfo (includes File object)
   const handleFileSelectedFromArea = useCallback(
     async (fileInfo: FileUploadInfo) => {
        if (!fileInfo?.file) {
             toast({title: "Upload Error", description: "Could not get file details.", variant: "destructive"});
             setIsProcessingFile(false); // Reset processing state if file object is missing
             setParentProcessing(false);
             return;
        }
       // Start processing
       await processFile(fileInfo.file);
       // onFileProcessed is called inside processFile now
       // setInternalUploadedFile will trigger the useEffect below
     },
     [processFile, toast] // processFile includes onFileProcessed and setParentProcessing
   );


  // Effect to trigger UI changes and actions when file is processed
  useEffect(() => {
    if (internalUploadedFile) {
      console.log('Setting internal state, hiding upload area for:', internalUploadedFile.name);
      setShowUploadArea(false); // <-- THIS SHOULD HIDE THE UPLOAD AREA
      setChatHistory([]); // Reset chat
      setSummary('');    // Reset summary
      setIsSummarizing(false);
      setIsChatLoading(false);
      // Conditionally trigger summary
      if (['text', 'code', 'document', 'book'].includes(internalUploadedFile.contentType)) {
        triggerSummarization(internalUploadedFile);
      } else {
         // Set a placeholder summary for non-summarizable types
          setSummary(`*Summary not applicable for ${internalUploadedFile.contentType} files.*`);
      }
       saveUploadHistory(internalUploadedFile); // Save to history *after* processing
    } else {
        // Reset when file is cleared
        setShowUploadArea(true);
        setChatHistory([]);
        setSummary('');
    }
  }, [internalUploadedFile, triggerSummarization, saveUploadHistory]); // Added saveUploadHistory


  // --- Chat Handling ---
  const handleSendMessage = useCallback(async (message: string) => {
      if (!internalUploadedFile || isChatLoading) { return; }
      if (internalUploadedFile.contentType === 'error') { toast({ title: "Cannot Chat", description: "File processing failed.", variant: "warning" }); return; }

      const userMessage: ChatMessage = { role: 'user', content: message };
      setChatHistory(prev => [...prev, userMessage]);
      setIsChatLoading(true);

      try {
          // Prepare content correctly, including images
          let documentContextForAI: any;
          if (internalUploadedFile.contentType === 'image') {
              documentContextForAI = internalUploadedFile.content; // Pass the ImageContent object
          } else if (typeof internalUploadedFile.content !== 'string') {
               // Stringify lists (archives) or metadata objects
               documentContextForAI = JSON.stringify(internalUploadedFile.content);
          } else {
              documentContextForAI = internalUploadedFile.content; // Pass text/code/doc content as string
          }

          const response = await fetch('/api/chat-with-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  documentContent: documentContextForAI, // Send the prepared content
                  userMessage: message
              }),
          });

          if (!response.ok) {
             const errorData = await response.json().catch(() => ({})); // Try to get error details
             throw new Error(`API Error ${response.status}: ${errorData.error || response.statusText}`);
          }

          const data = await response.json();
          if (data.response) {
              setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
              setXp(prev => prev + 5);
          } else { throw new Error('No response content from AI.'); }
      } catch (error: any) {
          console.error('Chat API error:', error);
          const errorMessage = `*Error: ${error.message || 'Could not get response.'}*`;
          setChatHistory(prev => [...prev, { role: 'assistant', content: errorMessage }]);
          toast({ title: 'Chat Error', description: error.message || 'Failed to get AI response.', variant: 'destructive' });
      } finally {
          setIsChatLoading(false);
      }
  }, [internalUploadedFile, isChatLoading, toast, setXp]); // Dependencies

  const handleBackButtonClick = () => {
    setInternalUploadedFile(null); // Clear internal state
    onFileProcessed(null);      // Inform parent (clears main state)
    setShowUploadArea(true);    // Explicitly show upload area again
  };

  const FileIconComponent = internalUploadedFile ? getFileIcon(internalUploadedFile.name) : DefaultFileIcon;

  // --- Viewer Rendering Logic ---
   const renderFileViewer = () => {
       if (!internalUploadedFile) return null; // No file, no viewer

       // Add specific checks for structured content if needed
       // e.g., if (internalUploadedFile.contentType === 'document' && !internalUploadedFile.content) return <ViewerLoading message="Extracting text..." />;

       switch (internalUploadedFile.contentType) {
           case 'document': return <DocumentViewer file={internalUploadedFile} />;
           case 'code': case 'text': return <CodeViewer file={internalUploadedFile} />; // Group simple text/code
           case 'archive': case 'list': return <ArchiveViewer file={internalUploadedFile} />;
           case 'image': return <ImageViewer file={internalUploadedFile} />;
           // Add cases for Presentation, Book, Audio, Video when ready
           case 'presentation':
           case 'book':
           case 'audio':
           case 'video':
           case 'other':
           case 'error':
           default: return <GenericFileViewer file={internalUploadedFile} />;
       }
   };


  // --- Render ---
  return (
    <>
      <AnimatePresence mode="wait">
        {showUploadArea ? (
          <motion.div
            key="upload-area"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
             {/* Pass the correctly typed callback */}
            <UploadArea onFileSelected={handleFileSelectedFromArea} className="mt-4" />
          </motion.div>
        ) : (
          <motion.div
            key="interaction-area"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-5xl mx-auto flex flex-col" // Added max-width and centering
          >
            {/* File Info Bar */}
            {internalUploadedFile && (
              <div className="flex items-center justify-between p-3 md:p-4 bg-[hsl(var(--muted)/0.3)] rounded-lg mb-4 border border-[hsl(var(--border)/0.4)] backdrop-blur-sm sticky top-16 z-30"> {/* Sticky header */}
                <div className="flex items-center overflow-hidden mr-2 shrink min-w-0">
                  <Button variant="ghost" size="sm" onClick={handleBackButtonClick} className="mr-2 px-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                     <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {React.createElement(FileIconComponent, { className: 'h-5 w-5 mr-2 shrink-0 text-[hsl(var(--foreground))]' })}
                  <span className="text-sm font-medium truncate" title={internalUploadedFile.name}>{internalUploadedFile.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">({(internalUploadedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                {/* Removed Upload New button, use Back button instead */}
              </div>
            )}

            {/* Main Interaction Area (Accordion) */}
            {internalUploadedFile && (
              <div className="flex-grow"> {/* Allow accordion to take space */}
                  {/* File Viewer - Render it first */}
                  <div className="mb-4">
                      {isProcessingFile
                        ? <ViewerLoading message="Processing File..." />
                        : renderFileViewer() // Render the appropriate viewer
                      }
                  </div>

                  {/* Accordion for Summary & Chat */}
                 <Accordion type="multiple" defaultValue={['summary', 'chat']} className="w-full space-y-4">
                    {/* Summary Item */}
                    {internalUploadedFile.contentType !== 'image' && internalUploadedFile.contentType !== 'audio' && internalUploadedFile.contentType !== 'video' && internalUploadedFile.contentType !== 'archive' && ( // Only show summary if applicable
                     <AccordionItem value="summary" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden">
                       <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] data-[state=open]:border-b data-[state=open]:border-[hsl(var(--border)/0.5)]">
                         AI Summary
                       </AccordionTrigger>
                       <AccordionContent className="p-4">
                         {isSummarizing ? (
                           <div className="flex items-center space-x-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2"/> Summarizing...</div>
                         ) : summary ? (
                           <div className="prose prose-sm dark:prose-invert max-w-none text-[hsl(var(--card-foreground))]">
                              {/* Use MemoizedMarkdown from ChatMessageItem or similar */}
                              <p>{summary}</p>
                           </div>
                         ) : (
                           <p className="text-sm text-muted-foreground italic">No summary available.</p>
                         )}
                       </AccordionContent>
                     </AccordionItem>
                    )}

                    {/* Chat Item */}
                    <AccordionItem value="chat" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden flex flex-col max-h-[70vh]"> {/* Limit chat height */}
                      <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] border-b border-[hsl(var(--border)/0.5)] flex-shrink-0">
                        Chat with Document
                      </AccordionTrigger>
                      <AccordionContent className="p-0 flex-grow overflow-hidden"> {/* Allow content to take space */}
                        <ChatSection
                          chatHistory={chatHistory}
                          isChatLoading={isChatLoading}
                          uploadedFile={internalUploadedFile}
                          onSendMessage={handleSendMessage}
                        />
                      </AccordionContent>
                    </AccordionItem>
                 </Accordion>
              </div>
            )}

            {/* Fallback if file processing resulted in null */}
             {!internalUploadedFile && !isProcessingFile && !showUploadArea && (
                 <div className="text-center p-6 text-muted-foreground italic">
                     Could not load file. Please try uploading again.
                     <Button variant="link" onClick={handleBackButtonClick} className="ml-2">Go back</Button>
                 </div>
            )}

          </motion.div> // Closes interaction-area motion.div
        )}
      </AnimatePresence>
    </>
  );
};

export default UploadInteract;
