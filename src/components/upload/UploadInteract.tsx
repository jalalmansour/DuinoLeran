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
import { getFileIcon } from '@/components/upload/UploadArea'; // Reuse the icon getter
import UploadArea from '@/components/upload/UploadArea';
import SummarySection from '@/components/summary/SummarySection';
import ChatSection from '@/components/chat/ChatSection';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import MediaTagReader from '@/components/MediaTagReader'; // Assuming this exists

// --- Interfaces (Ensure consistency) ---
interface UploadedFile {
    id: string; name: string; type: string; size: number; lastModified: number;
    content: any;
    contentType: 'text' | 'code' | 'document' | 'presentation' | 'book' | 'archive' | 'list' | 'metadata' | 'image' | 'audio' | 'video' | 'error' | 'other';
}
interface ImageContent { type: 'image'; data: string; mimeType: string; }
interface ChatMessage { role: 'user' | 'assistant'; content: string; }

// --- Viewer Imports (Keep as before) ---
const ViewerLoading = ({ message = "Loading..." }: { message?: string }) => ( <div className="flex items-center justify-center h-40 text-[hsl(var(--muted-foreground))]"><Loader2 className="h-6 w-6 animate-spin mr-2 text-[hsl(var(--primary))]" />{message}</div> );
const GenericFileViewer = dynamic(() => import('@/components/viewers/GenericFileViewer').catch(err => { console.error("Failed to load GenericFileViewer", err); return () => <div className='p-4 border rounded bg-destructive/20 text-destructive-foreground'>Error loading file viewer.</div>; }), { loading: () => <ViewerLoading /> });
const DocumentViewer = dynamic(() => import('@/components/viewers/DocumentViewer').catch(err => { console.error("Failed to load DocumentViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const PresentationViewer = dynamic(() => import('@/components/viewers/PresentationViewer').catch(err => { console.error("Failed to load PresentationViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const CodeViewer = dynamic(() => import('@/components/viewers/CodeViewer').catch(err => { console.error("Failed to load CodeViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const AudioViewer = dynamic(() => import('@/components/viewers/AudioViewer').catch(err => { console.error("Failed to load AudioViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const VideoViewer = dynamic(() => import('@/components/viewers/VideoViewer').catch(err => { console.error("Failed to load VideoViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const BookViewer = dynamic(() => import('@/components/viewers/BookViewer').catch(err => { console.error("Failed to load BookViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const ArchiveViewer = dynamic(() => import('@/components/viewers/ArchiveViewer').catch(err => { console.error("Failed to load ArchiveViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const ImageViewer = dynamic(() => import('@/components/viewers/ImageViewer').catch(err => { console.error("Failed to load ImageViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
// --- End Viewer Imports ---

interface UploadInteractProps {
  setIsProcessing: (isProcessing: boolean) => void;
  onFileProcessed: (file: UploadedFile | null, error?: string) => void;
  saveUploadHistory: (file: UploadedFile) => void;
  xp: number;
  setXp: (updater: number | ((prevXp: number) => number)) => void;
  toast: ReturnType<typeof useToast>['toast'];
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_FILE_SIZE_MB = 50; // Consistent max size

// PDF.js Worker Config (Client-side)
if (typeof window !== 'undefined') {
  const workerSrc = `/pdf.worker.mjs`; // Make sure this worker file exists in public/
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }
}

const UploadInteract: React.FC<UploadInteractProps> = ({
  setIsProcessing: setParentProcessing,
  onFileProcessed,
  saveUploadHistory, // Keep this prop
  xp,               // Keep this prop
  setXp,            // Keep this prop
  toast,            // Keep this prop
}) => {
  const [internalUploadedFile, setInternalUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [showUploadArea, setShowUploadArea] = useState<boolean>(true); // Controls which view is shown
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  const [audioVideoTags, setAudioVideoTags] = useState<any>(null);
  // Store the original File object when selected, needed for MediaTagReader
  const [originalFileObject, setOriginalFileObject] = useState<File | null>(null);


  // Function to determine content type (Keep as before)
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
        if (mimeType.includes('msword') || extension === 'doc') return 'document'; // Older Word
        if (mimeType.includes('powerpoint') || extension === 'ppt') return 'presentation'; // Older PPT
        return 'other';
  };

  // Trigger Summarization (Keep as before)
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

       if (!response.ok) { throw new Error(`API Error: ${response.statusText || response.status}`) }
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

  // Main file processing logic
  const processFile = useCallback(async (file: File) => {
    // --- MOVED SIZE CHECK HERE ---
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: 'File Too Large', description: `File size exceeds ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
      return null; // Indicate failure
    }
    // --- END SIZE CHECK ---

    toast({ title: 'Processing File...', description: file.name });
    setIsProcessingFile(true);
    setParentProcessing(true);
    setAudioVideoTags(null); // Reset media tags

    let fileContent: any = null;
    let contentType = determineContentType(file.type, file.name);
    let processingError: string | null = null;

    // --- Keep the switch statement for content extraction ---
     try {
       switch (contentType) {
         case 'text':
         case 'code':
         case 'metadata':
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
               text += content.items.map((s: any) => s.str).join(' ') + '\n';
             }
             fileContent = text.trim();
           } else if (file.type.includes('officedocument.wordprocessingml') || file.name.endsWith('.docx')) {
             const arrayBuffer = await file.arrayBuffer();
             const result = await mammoth.extractRawText({ arrayBuffer });
             fileContent = result.value;
           } else {
                try { fileContent = await file.text(); }
                catch { fileContent = '*Note: Could not extract text from this document format.*'; contentType = 'other'; }
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
           fileContent = fileList.slice(0, 50);
           if (fileList.length > 50) fileContent.push('... (and more)');
           contentType = 'archive';
           break;

         case 'audio':
         case 'video':
            // Store the file object itself temporarily for MediaTagReader
            setOriginalFileObject(file);
            // Set placeholder; MediaTagReader will update later via effect
            fileContent = { metadata: `Extracting tags for ${file.name}...`, transcript: null };
           break;

         case 'presentation':
         case 'book':
         case 'other':
         default:
           try {
             fileContent = await file.text();
             if (!fileContent.trim()) throw new Error("Empty content");
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
      content: fileContent,
      contentType: contentType,
    };

    setIsProcessingFile(false);
    setParentProcessing(false);
    return { processedFile, processingError }; // Return result and potential error

  }, [toast, setParentProcessing]);

  // --- MODIFIED: Callback for UploadArea ---
  const handleFileSelectedFromArea = useCallback(
    async (selectedFile: File) => { // Expects the File object directly
      if (!selectedFile) {
        toast({title: "No File Selected", variant: "warning"});
        return;
      }

      const result = await processFile(selectedFile); // Process the file

      if (result?.processedFile) {
        setInternalUploadedFile(result.processedFile); // Update internal state
        onFileProcessed(result.processedFile, result.processingError); // Inform parent
      } else {
        // Handle case where processFile itself returned null (e.g., size error)
         onFileProcessed(null, result?.processingError || "File selection failed."); // Inform parent of failure
         setShowUploadArea(true); // Stay on upload area
      }
    },
    [processFile, onFileProcessed, toast] // Dependencies
  );

  // Effect to handle changes in the processed file (Keep as before)
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
         triggerSummarization(internalUploadedFile);
       }
     } else {
       console.log('UploadInteract: File cleared');
       setShowUploadArea(true);
       setChatHistory([]);
       setSummary('');
       setIsSummarizing(false);
       setIsChatLoading(false);
       setAudioVideoTags(null);
       setOriginalFileObject(null); // Clear original file object too
     }
   }, [internalUploadedFile, triggerSummarization]);


   // Effect to update file content with media tags (Keep as before)
   useEffect(() => {
       if (internalUploadedFile && (internalUploadedFile.contentType === 'audio' || internalUploadedFile.contentType === 'video') && audioVideoTags) {
           console.log("Updating file content with media tags:", audioVideoTags);
           setInternalUploadedFile(prevFile => prevFile ? ({
               ...prevFile,
               content: { metadata: JSON.stringify(audioVideoTags, null, 2), transcript: null }
           }) : null);
       }
   }, [audioVideoTags, internalUploadedFile?.contentType]); // Keep dependencies


  // Handle Send Message (Keep as before)
   const handleSendMessage = useCallback(async (message: string) => {
     if (!internalUploadedFile) { return; }
     if (internalUploadedFile.contentType === 'error') { toast({ title: "Cannot Chat", description: "File processing failed.", variant: "warning" }); return; }

     const userMessage: ChatMessage = { role: 'user', content: message };
     setChatHistory(prev => [...prev, userMessage]);
     setIsChatLoading(true);

     try {
       const requestBody: { documentContent: any; userMessage: string } = {
         documentContent: internalUploadedFile.content,
         userMessage: message,
       };
        if (typeof internalUploadedFile.content === 'object' && internalUploadedFile.content?.type === 'image') {
            requestBody.documentContent = { type: 'image', data: internalUploadedFile.content.data, mimeType: internalUploadedFile.content.mimeType };
        } else if (typeof internalUploadedFile.content !== 'string') {
            requestBody.documentContent = JSON.stringify(internalUploadedFile.content);
        }

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

  // Handle Back Button (Keep as before)
  const handleBackButtonClick = () => {
    setInternalUploadedFile(null);
    onFileProcessed(null);
    setOriginalFileObject(null); // Clear original file object
  };

  const FileIconComponent = internalUploadedFile ? getFileIcon(internalUploadedFile.name) : DefaultFileIcon;

  // --- Render ---
  return (
    <>
      {showUploadArea ? (
        // MODIFIED: Pass the correct callback
        <UploadArea onFileSelected={handleFileSelectedFromArea} />
      ) : (
        <div className="w-full max-w-4xl mx-auto">
          {/* File Info Bar (Keep as before) */}
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

           {/* Media Tag Reader (runs silently) - Uses originalFileObject */}
            {originalFileObject && (internalUploadedFile?.contentType === 'audio' || internalUploadedFile?.contentType === 'video') && (
                <MediaTagReader
                    file={originalFileObject} // Pass the stored original File
                    onSuccess={setAudioVideoTags}
                    onError={(err) => console.warn("Media tag reading error:", err)}
                />
           )}

          {/* Accordion (Keep as before) */}
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
        </div>
      )}
    </>
  );
};

export default UploadInteract;
