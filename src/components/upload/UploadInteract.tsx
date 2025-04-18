// src/components/upload/UploadInteract.tsx
'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
// --- CORRECT IMPORT ---
import { ArrowLeft, File as DefaultFileIcon, HelpCircle, Loader2 } from 'lucide-react';
// --- END CORRECT IMPORT ---
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

// --- Interfaces (Keep as before) ---
interface UploadedFile {
    id: string; name: string; type: string; size: number; lastModified: number;
    content: any; // string (text), ImageContent, string[] (archive), object (metadata), null
    contentType: 'text' | 'code' | 'document' | 'presentation' | 'book' | 'archive' | 'list' | 'metadata' | 'image' | 'audio' | 'video' | 'error' | 'other';
    originalFile?: File;
}
interface FileUploadInfo { // Matches the one from UploadArea
  id: string; name: string; type: string; size: number; lastModified: number; file: File;
}
interface ImageContent { type: 'image'; data: string; mimeType: string; }
interface ChatMessage { role: 'user' | 'assistant'; content: string; }

interface UploadInteractProps {
  setIsProcessing: (isProcessing: boolean) => void; // Inform parent
  onFileProcessed: (file: UploadedFile | null, error?: string) => void; // Callback to parent
  saveUploadHistory: (file: UploadedFile) => void;
  xp: number;
  setXp: (updater: number | ((prevXp: number) => number)) => void;
  toast: ReturnType<typeof useToast>['toast'];
}

// --- Constants & Setup (Keep as before) ---
const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_FILE_SIZE_MB = 100;

// PDF.js Worker Configuration (Keep as before)
if (typeof window !== 'undefined') {
    const workerSrc = `/pdf.worker.mjs`;
   try {
     if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        // console.log("PDF.js worker source set to:", workerSrc); // Keep console log for debugging if needed
     }
   } catch (e) {
     console.warn("Could not set PDF.js worker source. Ensure pdf.worker.mjs is in the public folder.", e);
   }
}


// --- Dynamic Viewers ---
// IMPORTANT: Make sure Loader2 is imported here where ViewerLoading is defined
const ViewerLoading = ({ message = "Loading..." }: { message?: string }) => (
    <div className="flex items-center justify-center h-40 text-[hsl(var(--muted-foreground))]">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-[hsl(var(--primary))]" /> {/* Loader2 usage */}
        {message}
    </div>
);
const GenericFileViewer = dynamic(() => import('@/components/viewers/GenericFileViewer').catch(err => { console.error("Viewer Load Error:", err); return () => <div className='p-4 text-destructive'>Error loading viewer.</div>; }), { loading: () => <ViewerLoading message="Loading Viewer..." /> });
const DocumentViewer = dynamic(() => import('@/components/viewers/DocumentViewer').catch(err => { console.error("Viewer Load Error:", err); return GenericFileViewer; }), { loading: () => <ViewerLoading message="Loading Document..." /> });
const CodeViewer = dynamic(() => import('@/components/viewers/CodeViewer').catch(err => { console.error("Viewer Load Error:", err); return GenericFileViewer; }), { loading: () => <ViewerLoading message="Loading Code..." /> });
const ArchiveViewer = dynamic(() => import('@/components/viewers/ArchiveViewer').catch(err => { console.error("Viewer Load Error:", err); return GenericFileViewer; }), { loading: () => <ViewerLoading message="Loading Archive..." /> });
const ImageViewer = dynamic(() => import('@/components/viewers/ImageViewer').catch(err => { console.error("Viewer Load Error:", err); return GenericFileViewer; }), { loading: () => <ViewerLoading message="Loading Image..." /> });
const AudioViewer = dynamic(() => import('@/components/viewers/AudioViewer').catch(err => { console.error("Viewer Load Error:", err); return GenericFileViewer; }), { loading: () => <ViewerLoading message="Loading Audio..." /> });
const VideoViewer = dynamic(() => import('@/components/viewers/VideoViewer').catch(err => { console.error("Viewer Load Error:", err); return GenericFileViewer; }), { loading: () => <ViewerLoading message="Loading Video..." /> });
const BookViewer = dynamic(() => import('@/components/viewers/BookViewer').catch(err => { console.error("Viewer Load Error:", err); return GenericFileViewer; }), { loading: () => <ViewerLoading message="Loading Book..." /> });
const PresentationViewer = dynamic(() => import('@/components/viewers/PresentationViewer').catch(err => { console.error("Viewer Load Error:", err); return GenericFileViewer; }), { loading: () => <ViewerLoading message="Loading Presentation..." /> });


// --- Component Implementation (Keep the rest as before) ---
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

   // --- Content Type Determination (Keep as before) ---
   const determineContentType = useCallback((fileType: string, fileName: string): UploadedFile['contentType'] => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = fileType?.toLowerCase() || ''; // Handle potential undefined type

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf' || extension === 'pdf') return 'document';
    if (mimeType.includes('officedocument.wordprocessingml') || extension === 'docx') return 'document';
    if (mimeType.includes('officedocument.presentationml') || extension === 'pptx') return 'presentation';
    if (mimeType === 'application/epub+zip' || extension === 'epub') return 'book';
    if (mimeType === 'application/zip' || /\.(zip|rar|7z|tar|gz)$/i.test(fileName)) return 'archive';
    if (/\.(py|js|jsx|ts|tsx|html|css|scss|json|xml|yaml|yml|java|c|cpp|h|cs|swift|php|rb|go|rs|sql|sh|bat|ps1)$/i.test(fileName) || mimeType.includes('javascript') || mimeType.includes('python') || mimeType.includes('json')) return 'code';
    if (mimeType.startsWith('text/') || /\.(txt|md|rtf|log|csv|ini|cfg)$/i.test(fileName)) return 'text';
    if (mimeType.includes('msword') || extension === 'doc') return 'document';
    if (mimeType.includes('powerpoint') || extension === 'ppt') return 'presentation';
    if (mimeType.includes('spreadsheetml') || /\.(xls|xlsx|ods)$/i.test(fileName)) return 'document';

    console.warn(`Unknown file type: MIME=${mimeType}, extension=${extension}, falling back to 'other'.`);
    return 'other';
  }, []);

  // --- File Processing Logic (Keep as before) ---
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

    let fileContent: any = `*Processing error or unsupported format for ${file.name}*`;
    let contentType = determineContentType(file.type, file.name);
    let processingError: string | null = null;

    try {
      console.log(`Determined content type: ${contentType}`);
      switch (contentType) {
        case 'text':
        case 'code':
          fileContent = await file.text();
          break;
        case 'document':
          if (file.type === 'application/pdf') {
            console.log('Processing PDF...');
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let text = '';
            console.log(`PDF has ${pdf.numPages} pages.`);
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              text += content.items.map((s: any) => s.str).join(' ') + '\n\n';
            }
            fileContent = text.trim();
            console.log('PDF text extracted (first 100 chars):', fileContent.substring(0, 100));
          } else if (file.type.includes('wordprocessingml') || file.name.endsWith('.docx')) {
            console.log('Processing DOCX...');
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            fileContent = result.value;
            console.log('DOCX text extracted (first 100 chars):', fileContent.substring(0, 100));
          } else {
            try {
              console.log('Attempting text fallback for other document type...');
              fileContent = await file.text();
              contentType = 'text'; // Reclassify
            } catch {
              console.warn('Text fallback failed for document type.');
            }
          }
          break;
        case 'image':
          console.log('Processing Image...');
          fileContent = await new Promise<ImageContent>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              if (!dataUrl || !dataUrl.includes(',')) return reject(new Error('Invalid Data URL'));
              const base64Data = dataUrl.split(',')[1];
              resolve({ type: 'image', data: base64Data, mimeType: file.type });
            };
            reader.onerror = (error) => reject(new Error('Failed to read image file.'));
            reader.readAsDataURL(file);
          });
          console.log('Image processed to data URL.');
          break;
        case 'archive':
          console.log('Processing Archive...');
          const zip = await JSZip.loadAsync(file);
          const fileList = Object.keys(zip.files).filter(name => !zip.files[name].dir);
          fileContent = fileList.slice(0, 50);
          if (fileList.length > 50) fileContent.push('... (and more)');
          console.log('Archive contents listed (preview):', fileContent);
          break;
        case 'audio':
        case 'video':
          console.log(`Processing ${contentType}... storing metadata placeholder.`);
          fileContent = { metadata: `Basic info for ${file.name}`, originalFile: file };
          break;
        case 'presentation':
        case 'book':
        default: // 'other'
          try {
            console.log(`Attempting text extraction for ${contentType}...`);
            fileContent = await file.text();
            if (fileContent.trim()) {
              console.log('Text extraction successful, reclassifying as text.');
              contentType = 'text';
            } else {
              fileContent = `*Note: Content preview not available for this file type (${file.type || 'unknown'}).*`;
              console.log('File seems empty or unreadable as text.');
            }
          } catch (e) {
            console.warn(`Failed to read ${contentType} as text.`, e);
            fileContent = `*Note: Cannot display content for this file type (${file.type || 'unknown'}).*`;
          }
          break;
      }

      if (typeof fileContent === 'string' && fileContent.length > 500000) {
        console.warn(`Truncating large content for ${file.name} (length: ${fileContent.length})`);
        fileContent = fileContent.substring(0, 500000) + "\n\n... (Content Truncated)";
      }

    } catch (error: any) {
      console.error(`Error processing ${file.name}:`, error);
      processingError = `Failed to process file: ${error.message}`;
      fileContent = `*Error: ${processingError}*`;
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
      originalFile: (contentType === 'audio' || contentType === 'video') ? file : undefined,
    };

    console.log(`Finished processing ${processedFile.name}. Final content type: ${processedFile.contentType}`);
    setIsProcessingFile(false);
    setParentProcessing(false);

    onFileProcessed(processedFile, processingError ?? undefined);

    return processedFile;

  }, [toast, setParentProcessing, onFileProcessed, determineContentType]);


  // --- Callback for UploadArea (Keep as before) ---
   const handleFileSelectedFromArea = useCallback(
     async (fileInfo: FileUploadInfo) => {
        if (!fileInfo?.file) {
             toast({title: "Upload Error", description: "Could not get file details.", variant: "destructive"});
             setIsProcessingFile(false);
             setParentProcessing(false);
             return;
        }
       const processed = await processFile(fileInfo.file);
       setInternalUploadedFile(processed); // Update internal state which triggers useEffect
     },
     [processFile, toast]
   );

  // --- Trigger Summarization (Keep as before) ---
  const triggerSummarization = useCallback(async (file: UploadedFile | null) => {
    if (!file) return;
    console.log(`Checking summarization for type: ${file.contentType}`);

    const canSummarize = ['text', 'code', 'document', 'book'].includes(file.contentType);
    if (!canSummarize || typeof file.content !== 'string' || file.content.startsWith('*Error') || file.content.startsWith('*Note')) {
        const note = file.contentType === 'error' ? '' : `*Note: Automatic summary is not available for ${file.contentType}.*`;
        console.log("Cannot summarize, setting note:", note);
        setSummary(note);
        setIsSummarizing(false);
        return;
    }

    console.log("Starting summarization API call...");
    setIsSummarizing(true);
    setSummary('');

    try {
        const response = await fetch('/api/summarize-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileContent: file.content }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error ${response.status}: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        if (data.summary) {
            console.log("Summarization successful.");
            setSummary(data.summary);
            setXp(prevXp => prevXp + 10);
        } else {
            throw new Error('Summary not found in API response.');
        }
    } catch (error: any) {
        console.error('Error during summarization fetch:', error);
        const errorMessage = `*Error generating summary: ${error.message}*`;
        setSummary(errorMessage);
        toast({ title: 'Summarization Error', description: error.message || 'Failed to generate summary.', variant: 'destructive' });
    } finally {
        setIsSummarizing(false);
    }
}, [toast, setXp]);

  // --- Effect to manage UI state (Keep as before) ---
  useEffect(() => {
    if (internalUploadedFile) {
      console.log('Internal file state updated:', internalUploadedFile.name, internalUploadedFile.contentType);
      setShowUploadArea(false);
      setChatHistory([]);
      setSummary('');
      setIsSummarizing(false);
      setIsChatLoading(false);
      if (internalUploadedFile.contentType !== 'error') {
          triggerSummarization(internalUploadedFile);
      } else {
          setSummary(internalUploadedFile.content);
      }
       saveUploadHistory(internalUploadedFile);
    } else {
       console.log('Internal file state cleared.');
      setShowUploadArea(true);
      setChatHistory([]);
      setSummary('');
    }
  }, [internalUploadedFile, triggerSummarization, saveUploadHistory]);

  // --- Chat Handling (Keep as before) ---
  const handleSendMessage = useCallback(async (message: string) => {
    if (!internalUploadedFile || isChatLoading) { return; }
    if (internalUploadedFile.contentType === 'error') { toast({ title: "Cannot Chat", description: "File processing failed.", variant: "warning" }); return; }

    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
        let documentContextForAI: any;
        if (internalUploadedFile.contentType === 'image') {
            documentContextForAI = internalUploadedFile.content;
        } else if (typeof internalUploadedFile.content !== 'string') {
             documentContextForAI = JSON.stringify(internalUploadedFile.content);
        } else {
            documentContextForAI = internalUploadedFile.content;
        }

        const response = await fetch('/api/chat-with-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentContent: documentContextForAI,
                userMessage: message
            }),
        });

        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
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
}, [internalUploadedFile, isChatLoading, toast, setXp]);

  // --- UI Actions (Keep as before) ---
  const handleBackButtonClick = () => {
    console.log("Back button clicked, clearing file state.");
    setInternalUploadedFile(null);
    onFileProcessed(null);
  };

  const FileIconComponent = internalUploadedFile ? getFileIcon(internalUploadedFile.name) : DefaultFileIcon;

  // --- Viewer Rendering Logic (Keep as before) ---
   const renderFileViewer = () => {
       if (!internalUploadedFile) return null;
       if (isProcessingFile) return <ViewerLoading message="Processing File..." />;

       switch (internalUploadedFile.contentType) {
           case 'document': return <DocumentViewer file={internalUploadedFile} />;
           case 'code': case 'text': return <CodeViewer file={internalUploadedFile} />;
           case 'archive': case 'list': return <ArchiveViewer file={internalUploadedFile} />;
           case 'image': return <ImageViewer file={internalUploadedFile} />;
           case 'audio': return <AudioViewer file={internalUploadedFile} />;
           case 'video': return <VideoViewer file={internalUploadedFile} />;
           case 'presentation': return <PresentationViewer file={internalUploadedFile} />;
           case 'book': return <BookViewer file={internalUploadedFile} />;
           case 'error':
           case 'other':
           default: return <GenericFileViewer file={internalUploadedFile} />;
       }
   };

  // --- Main Render (Keep as before) ---
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
            <UploadArea onFileSelected={handleFileSelectedFromArea} className="mt-4" />
          </motion.div>
        ) : (
          <motion.div
            key="interaction-area"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-5xl mx-auto flex flex-col"
          >
            {/* File Info Bar */}
            {internalUploadedFile && (
              <div className="flex items-center justify-between p-3 md:p-4 bg-[hsl(var(--muted)/0.3)] rounded-lg mb-4 border border-[hsl(var(--border)/0.4)] backdrop-blur-sm sticky top-16 z-30">
                <div className="flex items-center overflow-hidden mr-2 shrink min-w-0">
                  <Button variant="ghost" size="sm" onClick={handleBackButtonClick} className="mr-2 px-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                     <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {React.createElement(FileIconComponent, { className: 'h-5 w-5 mr-2 shrink-0 text-[hsl(var(--foreground))]' })}
                  <span className="text-sm font-medium truncate" title={internalUploadedFile.name}>{internalUploadedFile.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">({(internalUploadedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              </div>
            )}

            {/* Main Interaction Area */}
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
               {/* Left Column: Viewer */}
               <div className="col-span-1">
                  {renderFileViewer()}
               </div>

               {/* Right Column: Summary & Chat Accordion */}
               <div className="col-span-1 flex flex-col">
                 {internalUploadedFile && (
                     <Accordion type="multiple" defaultValue={['summary', 'chat']} className="w-full space-y-4 flex flex-col flex-grow">
                        {/* Summary Item */}
                        {['text', 'code', 'document', 'book'].includes(internalUploadedFile.contentType) && (
                         <AccordionItem value="summary" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden flex-shrink-0">
                           <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] data-[state=open]:border-b data-[state=open]:border-[hsl(var(--border)/0.5)]">
                             AI Summary
                           </AccordionTrigger>
                           <AccordionContent className="p-4 max-h-60 overflow-y-auto scrollbar-thin">
                             {isSummarizing ? (
                               <div className="flex items-center space-x-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2"/> Summarizing...</div>
                             ) : summary ? (
                               <div className="prose prose-sm dark:prose-invert max-w-none text-[hsl(var(--card-foreground))]">
                                   <p>{summary}</p> {/* Simplified display */}
                               </div>
                             ) : (
                               <p className="text-sm text-muted-foreground italic">No summary generated yet.</p>
                             )}
                           </AccordionContent>
                         </AccordionItem>
                        )}

                        {/* Chat Item */}
                        <AccordionItem value="chat" className="border rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] glassmorphism overflow-hidden flex flex-col flex-grow min-h-[300px]">
                          <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:no-underline text-[hsl(var(--foreground))] border-b border-[hsl(var(--border)/0.5)] flex-shrink-0">
                            Chat with Document
                          </AccordionTrigger>
                          <AccordionContent className="p-0 flex-grow overflow-hidden">
                            <ChatSection
                              chatHistory={chatHistory}
                              isChatLoading={isChatLoading}
                              uploadedFile={internalUploadedFile}
                              onSendMessage={handleSendMessage}
                            />
                          </AccordionContent>
                        </AccordionItem>
                     </Accordion>
                 )}
                 {!internalUploadedFile && !isProcessingFile && (
                     <div className="text-center p-6 text-muted-foreground italic col-span-full">
                         Could not load file. Please try uploading again.
                         <Button variant="link" onClick={handleBackButtonClick} className="ml-2">Go back</Button>
                     </div>
                 )}
               </div> {/* End Right Column */}
            </div> {/* End Grid */}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default UploadInteract;
