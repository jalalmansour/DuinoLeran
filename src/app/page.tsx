'use client';

// Import pdfjs-dist dynamically only on the client-side when needed
// (Removed the top-level import)
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  File as FileIconLucide,
  Upload,
  ImageIcon,
  Code,
  BookOpen,
  Loader2,
  Send,
  Lightbulb,
  ChevronsDown,
  ChevronsUp,
  Trophy,
  Download,
  Wand2,
  Rocket,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { summarizeDocument } from '@/ai/flows/summarize-document';
import { chatWithDocument } from '@/ai/flows/chat-with-document';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Ensure Tabs imports are present
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
import { Progress } from '@/components/ui/progress';
import FAQPage from './faq';
import Footer from '../components/footer';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch'; // Import Switch for Settings tab
import Header from '@/components/header'; // Assuming Header component exists and accepts xp prop

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const getFileIcon = (fileName: string): React.ElementType => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  switch (fileExtension) {
    case 'pdf': return BookOpen;
    case 'docx': case 'doc': return FileIconLucide;
    case 'pptx': case 'ppt': return FileIconLucide;
    case 'txt': case 'md': return FileIconLucide;
    case 'py': case 'js': case 'jsx': case 'ts': case 'tsx': case 'html': case 'css': case 'json': case 'xml': case 'java': case 'c': case 'cpp': return Code;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': return ImageIcon;
    default: return FileIconLucide;
  }
};


// Moved PDF worker setup logic outside the component for clarity
const setupPdfWorker = async () => {
    if (typeof window !== 'undefined') {
        try {
            const pdfjsLib = await import('pdfjs-dist');
            // Check if worker is already set to avoid redundant calls
            if (pdfjsLib.GlobalWorkerOptions.workerSrc !== '/pdf.worker.js') {
                 // console.log('Setting PDF worker source...'); // Optional: for debugging
                 pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.js`;
            }
            return pdfjsLib; // Return the library instance
        } catch (error) {
            console.error('Failed to load pdfjs-dist:', error);
            // Consider showing a toast message here as well
            return null; // Indicate failure
        }
    }
    return null; // Not in a browser environment
};


export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true); // State for settings tab
  const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([]); // State for history tab
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"upload" | "history" | "settings" | "faq">("upload");
  const [xp, setXp] = useState<number>(0);
  const [isExplanatoryUIEnabled, setIsExplanatoryUIEnabled] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'md' | 'pdf'>('txt');

  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Load initial state from localStorage
  useEffect(() => {
    // Load dark mode preference if available (example)
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode) {
      setDarkMode(JSON.parse(storedDarkMode));
    } else {
        // Default to system preference or dark mode
        setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    // Load history
    try {
      const storedHistory = localStorage.getItem('uploadHistory');
      if (storedHistory) {
        setUploadHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
        console.error('Failed to parse upload history from localStorage:', error);
        localStorage.removeItem('uploadHistory'); // Clear corrupted data
    }

    // Load XP
    try {
      const storedXp = localStorage.getItem('userXp');
      if (storedXp) {
        setXp(parseInt(storedXp, 10) || 0);
      }
    } catch(error){
        console.error('Failed to parse user XP from localStorage:', error);
        localStorage.removeItem('userXp'); // Clear corrupted data
    }
  }, []); // Runs only once on mount

  // Effect for dark mode updates
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
    localStorage.setItem('darkMode', JSON.stringify(darkMode)); // Save preference
  }, [darkMode]);

  // Effect for saving XP
  useEffect(() => {
    localStorage.setItem('userXp', xp.toString());
  }, [xp]);

  // Effect for scrolling chat
  useEffect(() => {
    const chatViewport = chatContainerRef.current?.querySelector<HTMLDivElement>('div[style*="overflow: scroll;"]');
    if (chatViewport) {
      requestAnimationFrame(() => {
        chatViewport.scrollTop = chatViewport.scrollHeight;
      });
    } else if (chatContainerRef.current) {
        requestAnimationFrame(() => {
            chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight;
        });
    }
  }, [chatHistory, isChatLoading]);

  // --- History Management Callbacks ---
  const saveUploadHistory = useCallback((file: UploadedFile) => {
    setUploadHistory((prevHistory) => {
      const exists = prevHistory.some(
        (item) => item.name === file.name && item.lastModified === file.lastModified
      );
      if (exists) return prevHistory;
      const historyEntry = { ...file }; // Storing content - be wary of size!
      const newHistory = [historyEntry, ...prevHistory].slice(0, 10);
      try {
        localStorage.setItem('uploadHistory', JSON.stringify(newHistory));
      } catch (error: any) {
        // Handle storage errors
        if (error.name === 'QuotaExceededError') {
          toast({ title: 'Storage Full', description: 'Cannot save to history. Local storage quota exceeded.', variant: 'warning' });
        } else {
          console.error('Failed to save upload history:', error);
          toast({ title: 'Error Saving History', description: 'Could not save to upload history.', variant: 'warning' });
        }
        return prevHistory;
      }
      return newHistory;
    });
  }, [toast]);

  const clearUploadHistory = useCallback(() => {
    setUploadHistory([]);
    localStorage.removeItem('uploadHistory');
    toast({ title: 'History Cleared', description: 'Upload history has been removed.' });
  }, [toast]);

  // --- Summarization and AI Callbacks ---
  const summarizeTheDocument = useCallback(async (textContent: string, fileName: string) => {
    if (typeof textContent !== 'string' || !textContent.trim()) {
        setSummary('Cannot summarize non-text or empty content.');
        setIsSummarizing(false);
        return;
    }
    setIsSummarizing(true);
    setSummary('');
    try {
      const summaryResult = await summarizeDocument({ fileContent: textContent });
      setSummary(summaryResult.summary);
      const newXp = xp + 10; // Calculate new XP first
      setXp(newXp); // Then update state
      toast({ title: 'Summary Ready', description: `Generated summary for ${fileName}.` });
    } catch (error: any) {
      console.error('Error summarizing document:', error);
      const errorMessage = error?.message || 'Could not generate summary.';
      setSummary(`Error: ${errorMessage}`);
      toast({ title: 'Summarization Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSummarizing(false);
    }
  }, [toast, xp, setXp]); // Add xp and setXp to dependencies

  const loadFileFromHistory = useCallback(async (fileId: string) => {
    const fileToLoad = uploadHistory.find(file => file.id === fileId);
    if (fileToLoad) {
      if (!fileToLoad.content || typeof fileToLoad.content !== 'string') {
        toast({ title: 'Content Issue', description: `Text content for ${fileToLoad.name} is missing or invalid.`, variant: 'warning' });
        return;
      }
      setUploadedFile(fileToLoad);
      setChatHistory([]);
      setCurrentMessage('');
      setIsExplanatoryUIEnabled(false);
      setActiveTab("upload"); // Switch to upload tab when loading from history
      toast({ title: 'File Loaded', description: `Loaded ${fileToLoad.name}. Summarizing...` });
      await summarizeTheDocument(fileToLoad.content, fileToLoad.name);
    } else {
      toast({ title: 'Error Loading File', description: 'Could not find the selected file in history.', variant: 'destructive' });
    }
  }, [uploadHistory, toast, summarizeTheDocument, setActiveTab]); // Dependencies adjusted

  // --- File Drop Callback ---
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Reset state
      setUploadedFile(null);
      setSummary('');
      setChatHistory([]);
      setCurrentMessage('');
      setUploadProgress(0);
      setIsExplanatoryUIEnabled(false);
      setIsSummarizing(true);

      // Size check
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
         toast({ title: 'File Too Large', description: `Max size is ${maxSize / 1024 / 1024}MB.`, variant: 'destructive' });
         setUploadProgress(null);
         setIsSummarizing(false);
         return;
      }

      // --- Shared Handlers ---
      const handleTextExtracted = async (textContent: string, originalFile: File) => {
          try {
              const newFile: UploadedFile = { id: generateId(), name: originalFile.name, type: originalFile.type, size: originalFile.size, lastModified: originalFile.lastModified, content: textContent };
              setUploadedFile(newFile);
              saveUploadHistory(newFile); // Save history after setting state
              setUploadProgress(100);
              await summarizeTheDocument(textContent, newFile.name);
              setTimeout(() => setUploadProgress(null), 600);
              setIsExplanatoryUIEnabled(true);
          } catch (error: any) { handleProcessingError(error, 'Failed to process extracted text.'); }
      };
      const handleProcessingError = (error: any, message: string) => {
           console.error(message, error);
           toast({ title: 'File Processing Error', description: error?.message || message, variant: 'destructive' });
           setUploadProgress(null);
           setIsSummarizing(false);
           setUploadedFile(null);
      };

      // --- File Type Handling ---
      try {
          setUploadProgress(10);
          if (file.type === 'application/pdf') {
              const pdfjsLibInstance = await setupPdfWorker(); // Ensure worker is ready
              if (!pdfjsLibInstance) {
                  throw new Error('PDF library failed to load.');
              }
              const pdfFileReader = new FileReader();
              pdfFileReader.onload = async (event) => {
                  try {
                      if (!event.target?.result) throw new Error("Failed to read PDF file.");
                      setUploadProgress(30);
                      const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
                      const pdf = await pdfjsLibInstance.getDocument({ data: typedArray }).promise;
                      setUploadProgress(50);
                      const numPages = pdf.numPages;
                      let textContent = '';
                      const pagePromises = [];
                      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                          pagePromises.push(
                              pdf.getPage(pageNum).then(async (page) => {
                                  const text = await page.getTextContent();
                                  return text.items.map((item: any) => item.str).join(' ');
                              })
                          );
                      }
                      const pageTexts = await Promise.all(pagePromises);
                      textContent = pageTexts.join('\n\n');
                      setUploadProgress(80);
                      await handleTextExtracted(textContent, file);
                  } catch (pdfError: any) { handleProcessingError(pdfError, 'Could not process PDF content.'); }
              };
              pdfFileReader.onerror = (errorEvent) => { handleProcessingError(errorEvent, 'Error reading PDF file.'); };
              pdfFileReader.readAsArrayBuffer(file);
          // Adjusted check for text-based files including .py without explicit MIME type
          } else if ((file.type === '' && file.name.endsWith('.py')) || file.type.startsWith('text/') || ['application/json', 'application/xml', 'application/javascript', 'application/python'].includes(file.type)) {
              const textFileReader = new FileReader();
              textFileReader.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(10 + Math.round((event.loaded / event.total) * 70)); };
              textFileReader.onloadstart = () => setUploadProgress(10);
              textFileReader.onload = async (e) => {
                  try {
                      const content = e.target?.result;
                      if (typeof content !== 'string') throw new Error('Failed to read file as text.');
                      await handleTextExtracted(content, file);
                  } catch (textError: any) { handleProcessingError(textError, 'Could not process text file.'); }
              };
              textFileReader.onerror = (errorEvent) => { handleProcessingError(errorEvent, 'Error reading text file.'); };
              textFileReader.readAsText(file);
          } else {
              // Use file name for error message if available
               handleProcessingError(new Error(`Unsupported type: ${file.type}`), `Unsupported file type: ${file.name || 'Unknown File'}`);
          }
      } catch (error: any) {
          handleProcessingError(error, 'Unexpected error during file handling.');
      }
    },
    [toast, summarizeTheDocument, saveUploadHistory] // Dependencies
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
        'text/plain': ['.txt'],
        'text/markdown': ['.md'],
        'text/csv': ['.csv'],
        'text/html': ['.html', '.htm'],
        'text/css': ['.css'],
        'application/javascript': ['.js', '.jsx', '.ts', '.tsx'],
        'application/json': ['.json'],
        'application/xml': ['.xml'],
        'application/python': ['.py'],
        'application/pdf': ['.pdf'],
    },
    onDropRejected: (rejectedFiles: FileRejection[]) => {
      rejectedFiles.forEach(({file, errors}) => {
        console.warn(`File rejected: ${file.name}`, errors);
        errors.forEach(err => {
          if (err.code === 'file-invalid-type') toast({ title: 'Invalid File Type', description: `File "${file.name}" is not supported.`, variant: 'destructive'});
          else if (err.code === 'file-too-large') toast({ title: 'File Too Large', description: `File "${file.name}" exceeds size limit.`, variant: 'destructive'});
          else toast({ title: 'Upload Error', description: `Could not upload "${file.name}": ${err.message}`, variant: 'destructive'});
        });
      });
       setUploadProgress(null);
       setIsSummarizing(false);
    }
  });

  // --- Chat Message Sending ---
  const handleSendMessage = async () => {
    const messageToSend = currentMessage.trim();
    if (!uploadedFile || !uploadedFile.content || !messageToSend || isChatLoading) {
        if (!uploadedFile?.content) toast({ title: 'Cannot Chat', description: 'No document content loaded.', variant: 'warning' });
        return;
    }
    const userMessage: ChatMessage = { role: 'user', content: messageToSend };
    setChatHistory((prev) => [...prev, userMessage]);
    setCurrentMessage('');
    setIsChatLoading(true);
    try {
      const chatResult = await chatWithDocument({ documentContent: uploadedFile.content, userMessage: messageToSend });
      const assistantMessage: ChatMessage = { role: 'assistant', content: chatResult.response };
      setChatHistory((prev) => [...prev, assistantMessage]);
      const newXp = xp + 5; // Calculate new XP
      setXp(newXp); // Update state
    } catch (error: any) {
      console.error('Error chatting with document:', error);
      const errorMessageContent = `Error: ${error.message || 'Could not get response.'}`;
      const errorMessage: ChatMessage = { role: 'assistant', content: errorMessageContent };
      setChatHistory((prev) => [...prev, errorMessage]);
      toast({ title: 'Chat Error', description: error.message || 'Failed to get AI response.', variant: 'destructive' });
    } finally {
      setIsChatLoading(false);
      textAreaRef.current?.focus();
    }
  };

  // --- Export Logic ---
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
   };

   const formatChatHistoryForExport = (): string => {
    let formattedContent = `Document: ${uploadedFile?.name || 'N/A'}\n\n`;
    if (summary) formattedContent += `Summary:\n-------\n${summary}\n\n`;
    formattedContent += "Chat History:\n-------------\n";
    chatHistory.forEach((message) => {
        formattedContent += `[${message.role.toUpperCase()}]\n${message.content}\n\n`;
    });
    return formattedContent;
   };

   const handleExport = () => {
    if (!chatHistory.length && !summary) {
        toast({ title: "Nothing to Export", description: "Upload a file and interact first.", variant: "warning"});
        return;
    }
    setShowExportModal(true);
   };

   const handleConfirmExport = async () => {
    let fileContent = formatChatHistoryForExport();
    let filename = 'DuinoInsights_Chat';
    let fileExtension = `.${exportFormat}`;
    let mimeType = `text/${exportFormat}`;

    if (uploadedFile) {
        const baseName = uploadedFile.name.split('.').slice(0, -1).join('.') || uploadedFile.name;
        filename = `DuinoInsights_${baseName}_Chat`;
    }

    if (exportFormat === 'pdf') {
        try {
            const { default: jsPDF } = await import('jspdf'); // Dynamic import
            const pdf = new jsPDF();
            const lines = pdf.splitTextToSize(fileContent, 180);
            pdf.text(lines, 10, 10);
            pdf.save(filename + fileExtension);
            toast({ title: "Export Successful", description: "PDF export initiated." });
        } catch (error) {
            console.error("Error exporting PDF:", error);
            toast({ title: "PDF Export Failed", description: "Could not generate PDF. Ensure 'jspdf' is installed.", variant: "destructive" });
        }
        setShowExportModal(false);
        return;
    } else if (exportFormat === 'md') {
        mimeType = 'text/markdown';
    } else { // txt
        mimeType = 'text/plain';
    }

    downloadFile(fileContent, filename + fileExtension, mimeType);
    setShowExportModal(false);
   };

  // --- Keyboard Handler ---
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // --- Icon Logic ---
  const CurrentFileIcon = uploadedFile ? getFileIcon(uploadedFile.name) : Upload;

  // --- Memoized Markdown ---
  const MemoizedMarkdown = React.memo(({ content }: { content: string }) => (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-semibold text-primary mb-3" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-semibold text-primary mb-2" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-md font-semibold text-primary mb-1" {...props} />,
          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className={cn(className, 'bg-muted dark:bg-gray-800 rounded p-3 my-3 overflow-x-auto')} {...props}>
                <code className={cn("text-sm font-mono", match ? `language-${match[1]}` : '')}>{String(children).replace(/\n$/, '')}</code>
              </pre>
            ) : (
              <code className={cn(className, "bg-muted dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-foreground dark:text-yellow-300")} {...props}>
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => ( <div className="overflow-x-auto my-3 border border-border rounded"><table className="table-auto border-collapse w-full text-sm" {...props} /></div> ),
          th: ({ node, ...props }) => <th className="border border-border px-3 py-1.5 bg-muted font-medium text-left" {...props} />,
          td: ({ node, ...props }) => <td className="border border-border px-3 py-1.5 align-top" {...props} />,
          a: ({ node, ...props }) => <a className="text-primary underline hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />,
        }}
      />
    </div>
  ));
  MemoizedMarkdown.displayName = 'MemoizedMarkdown';


  // --- Main Component Return ---
  return (
    <TooltipProvider> {/* Moved to wrap the entire component */}
      <div className={cn('flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300 pt-20', darkMode ? 'dark' : '')}> {/* Added pt-20 for fixed header */}
        {/* Background */}
        <div
          className={cn(
              "fixed inset-0 -z-10 transition-opacity duration-1000",
              darkMode ? "bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 opacity-100" : "bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 opacity-100",
              "animate-gradient"
          )}
          style={{ backgroundSize: '200% 200%' }}
        />

        {/* Fixed Header */}
        <Header xp={xp} />

        {/* Main Content Area */}
        <main className="container mx-auto flex flex-col flex-grow p-4 md:p-6 space-y-4 md:space-y-6 relative z-10">

          {/* Export Button (Positioned relative to viewport) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleExport}
                disabled={!chatHistory.length && !summary}
                className={cn(
                    "fixed bottom-6 right-6 z-50 p-3 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 text-white shadow-xl hover:scale-105 transition-all",
                    (!chatHistory.length && !summary) && "opacity-50 cursor-not-allowed hover:scale-100"
                )}
                aria-label="Export chat and summary"
              >
                <Download className="w-6 h-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">
                {(!chatHistory.length && !summary) ? "Nothing to export yet" : "Export Chat & Summary"}
            </TooltipContent>
          </Tooltip>

          {/* Export Modal */}
          <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Export Chat & Summary</DialogTitle>
                  <DialogDescription>Choose the format for your exported file.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                   <div className="space-y-2">
                       <Label htmlFor="export-format">Select Format</Label>
                       <Select value={exportFormat} onValueChange={value => setExportFormat(value as 'txt' | 'md' | 'pdf')}>
                        <SelectTrigger id="export-format"> <SelectValue placeholder="Select Format" /> </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="txt">Text (.txt)</SelectItem>
                            <SelectItem value="md">Markdown (.md)</SelectItem>
                            <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                        </SelectContent>
                        </Select>
                        {exportFormat === 'pdf' && ( <p className="text-xs text-muted-foreground pt-1">Basic PDF export using jsPDF. Requires <code className='text-xs'>jspdf</code> installed.</p> )}
                    </div>
                  </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button type="button" onClick={handleConfirmExport}>Export</Button>
                </DialogFooter>
              </DialogContent>
          </Dialog>

          {/* Reintroduce the Tabs component structure */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full flex-grow flex flex-col">
            {/* Tabs List */}
            <TabsList className="grid w-full grid-cols-4 mb-4 sticky top-[80px] z-20 bg-background/80 backdrop-blur-sm"> {/* Make tabs sticky below header */}
              <TabsTrigger value="upload"> <Upload className="mr-1.5 h-4 w-4" /> Upload & Chat </TabsTrigger>
              <TabsTrigger value="history"> <BookOpen className="mr-1.5 h-4 w-4" /> History </TabsTrigger>
              <TabsTrigger value="settings"> <Code className="mr-1.5 h-4 w-4" /> Settings </TabsTrigger>
              <TabsTrigger value="faq"> <Lightbulb className="mr-1.5 h-4 w-4" /> FAQ </TabsTrigger>
            </TabsList>

            {/* Upload Tab Content */}
            <TabsContent value="upload" className="mt-0 flex-grow flex flex-col space-y-4">
               {/* ... (Keep the existing logic for Landing Page vs Main Interface) ... */}
               {!uploadedFile ? (
                 // Landing Page
                 <motion.div key="landing" /* ...props... */ {...getRootProps()} className="flex-grow flex flex-col items-center justify-center text-center p-6 md:p-10 border border-dashed rounded-lg bg-background/50 backdrop-blur-sm">
                   <input {...getInputProps()} />
                   {/* ... landing page content ... */}
                   <motion.div className="mb-6"> <Rocket className="h-16 w-16 text-primary mx-auto" /> </motion.div>
                   <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-3 dark:from-purple-400 dark:to-pink-400"> Learn Faster with DuinoBot! </h1>
                   <p className="text-base md:text-lg text-muted-foreground max-w-xl mb-6"> Upload text documents (TXT, PDF, code) to get summaries, ask questions, and accelerate your learning. </p>
                   <Button size="lg" variant="default" className="transition-transform hover:scale-105"> <Upload className="mr-2 h-4 w-4" /> {isDragActive ? "Drop File Here" : "Upload Document or Drag & Drop"} </Button>
                   <p className="text-sm text-muted-foreground mt-4"> Powered by <Wand2 className="inline h-4 w-4 mx-1 text-purple-500 dark:text-purple-400" /> DuinoBot </p>
                   {uploadProgress !== null && uploadProgress > 0 && ( <div className="w-full max-w-xs mt-4"> <Progress value={uploadProgress} className="h-2" /> <p className="text-sm text-muted-foreground mt-1"> {uploadProgress < 100 ? `Processing ${uploadProgress}%` : 'Finalizing...'} </p> </div> )}
                 </motion.div>
               ) : (
                 // Main Interface
                 <motion.div key="main-interface" /* ...props... */ className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 flex-grow">
                    {/* Left Panel */}
                    <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col space-y-4">
                       <Card className="overflow-hidden">
                         {/* ... file info card content ... */}
                         <CardHeader className="pb-3"> <CardTitle className="flex items-center text-lg"> <CurrentFileIcon className="h-5 w-5 mr-2 flex-shrink-0 text-primary" /> <span className="truncate" title={uploadedFile.name}>{uploadedFile.name}</span> </CardTitle> <CardDescription className="text-xs"> {(uploadedFile.size / 1024).toFixed(1)} KB | {uploadedFile.type || 'unknown'} </CardDescription> </CardHeader>
                         <CardContent>
                           <div {...getRootProps()} className={cn("flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-sm", isDragActive ? "bg-accent border-primary" : "border-muted hover:border-foreground/30 hover:bg-muted/50")}>
                             <input {...getInputProps()} />
                             <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                             {isDragActive ? <p>Drop file to replace...</p> : <p className="text-center">Re-upload or drag new file</p>}
                           </div>
                           {uploadProgress !== null && uploadProgress >= 0 && ( <div className="w-full mt-2"> <Progress value={uploadProgress} className="h-1.5" /> <p className="text-xs text-muted-foreground mt-1 text-center"> {uploadProgress < 100 ? `Processing: ${uploadProgress}%` : 'Finalizing...'} </p> </div> )}
                         </CardContent>
                       </Card>
                       <Card className="flex flex-col flex-grow overflow-hidden">
                         {/* ... summary card content ... */}
                          <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 border-b"> <div className="space-y-0.5"> <CardTitle className="text-base">Summary</CardTitle> <CardDescription className="text-xs">AI-generated overview.</CardDescription> </div> {(summary || isSummarizing) && ( <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)} aria-label={isSummaryCollapsed ? 'Expand Summary' : 'Collapse Summary'} disabled={isSummarizing && !summary}> {isSummarizing && !summary ? <Loader2 className="h-4 w-4 animate-spin" /> : (isSummaryCollapsed ? <ChevronsDown className="h-4 w-4" /> : <ChevronsUp className="h-4 w-4" />)} </Button> )} </CardHeader>
                          <AnimatePresence initial={false}> {!isSummaryCollapsed && ( <motion.div key="summary-content" initial="collapsed" animate="open" exit="collapsed" variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }} transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} className="overflow-hidden flex-grow flex flex-col"> <CardContent className="p-0 flex-grow"> <ScrollArea className="h-full max-h-[250px] p-4"> {isSummarizing && !summary ? ( <div className="flex items-center justify-center space-x-2 text-muted-foreground pt-4"> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> <span>Generating Summary...</span> </div> ) : summary ? ( <MemoizedMarkdown content={summary} /> ) : ( <p className="text-muted-foreground italic text-sm text-center py-4"> {isSummarizing ? 'Loading...' : 'No summary available.'} </p> )} </ScrollArea> </CardContent> </motion.div> )} </AnimatePresence>
                       </Card>
                    </div>
                    {/* Right Panel */}
                    <Card className="flex-1 flex flex-col w-full md:w-2/3 lg:w-3/4">
                      {/* ... chat card content ... */}
                       <CardHeader className="border-b"> <CardTitle>Chat with Document</CardTitle> <CardDescription> Ask questions about "<span className="font-medium truncate inline-block max-w-xs">{uploadedFile.name}</span>". </CardDescription> </CardHeader>
                       <CardContent className="flex-grow flex flex-col p-0 overflow-hidden"> <ScrollArea ref={chatContainerRef} className="flex-grow p-4"> <div className="flex flex-col space-y-3 pr-2"> {chatHistory.map((message, index) => ( <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={cn('p-3 rounded-lg max-w-[85%] w-fit', message.role === 'user' ? 'bg-primary text-primary-foreground self-end rounded-br-none' : 'bg-muted text-muted-foreground self-start rounded-bl-none')}> <MemoizedMarkdown content={message.content} /> </motion.div> ))} {isChatLoading && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center space-x-2 self-start text-muted-foreground p-3"> <Loader2 className="h-4 w-4 animate-spin" /> <span>Thinking...</span> </motion.div> )} {chatHistory.length === 0 && !isChatLoading && ( <p className="text-sm text-muted-foreground text-center py-4 italic"> Ask a question to start the conversation. </p> )} </div> </ScrollArea> <div className="p-4 border-t bg-background/80 backdrop-blur-sm"> <div className="flex items-end space-x-2"> <Textarea placeholder="Ask anything about the document..." value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} onKeyDown={handleKeyDown} ref={textAreaRef} rows={1} className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[150px]" aria-label="Chat input" disabled={!uploadedFile || isChatLoading} /> <Button onClick={handleSendMessage} disabled={!uploadedFile || isChatLoading || !currentMessage.trim()} size="icon" aria-label="Send message"> {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} </Button> </div> </div> </CardContent>
                    </Card>
                    {/* Explanatory UI Toggle & Panel */}
                    {/* ... (Explanatory UI logic remains the same) ... */}
                    <div className="fixed bottom-20 right-6 z-30"> <Tooltip> <TooltipTrigger asChild> <Button variant={isExplanatoryUIEnabled ? "default" : "secondary"} className="rounded-full p-3 shadow-lg data-[state=open]:animate-pulse" onClick={() => setIsExplanatoryUIEnabled(!isExplanatoryUIEnabled)} aria-label={isExplanatoryUIEnabled ? 'Hide Explanatory UI' : 'Show Explanatory UI'}> <Lightbulb className="h-6 w-6" /> </Button> </TooltipTrigger> <TooltipContent side="left" align="center"> {isExplanatoryUIEnabled ? 'Hide Help' : 'Show Help'} </TooltipContent> </Tooltip> </div>
                    <AnimatePresence> {isExplanatoryUIEnabled && uploadedFile && ( <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsExplanatoryUIEnabled(false)}> <motion.div className="w-full max-w-2xl" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()}> <Card className="shadow-xl max-h-[85vh] overflow-hidden flex flex-col bg-card"> <CardHeader className="border-b"> <CardTitle>How DuinoBot Helps You Learn</CardTitle> <CardDescription> Your interactive AI tutor for documents. </CardDescription> </CardHeader> <CardContent className="overflow-y-auto text-sm space-y-4 p-6"> <p> DuinoBot transforms your text-based documents into interactive learning sessions. Here's how: </p> <ul className="list-disc list-outside space-y-2 pl-5 text-muted-foreground"> <li><strong className="text-foreground">Dynamic Summaries:</strong> Get quick AI-generated overviews of your document's content.</li> <li><strong className="text-foreground">Contextual Chat:</strong> Ask specific questions about the text. The AI understands the document's context to provide relevant answers.</li> <li><strong className="text-foreground">Gamified Learning:</strong> Earn XP (<Trophy className="inline h-4 w-4 text-yellow-500" />) for uploading files and chatting, making learning more engaging.</li> <li><strong className="text-foreground">Code Understanding:</strong> For code files, ask DuinoBot to explain snippets or concepts (effectiveness depends on the AI model).</li> <li><strong className="text-foreground">Supported Files:</strong> Works best with TXT, MD, code files, and can process text from PDF files.</li> </ul> <p className="mt-4 font-semibold text-foreground">Try asking questions like:</p> <ul className="list-disc list-outside space-y-1 pl-5 text-muted-foreground"> <li>"Summarize the main points of section X."</li> <li>"Explain the term '[specific term]' in simple terms."</li> <li>"What does this Python function do?"</li> <li>"Create a short quiz based on this document."</li> </ul> </CardContent> <DialogFooter className="p-4 border-t bg-muted/50 rounded-b-lg"> <Button onClick={() => setIsExplanatoryUIEnabled(false)} variant="outline" size="sm">Close</Button> </DialogFooter> </Card> </motion.div> </motion.div> )} </AnimatePresence>
                 </motion.div>
               )}
            </TabsContent>

            {/* History Tab Content (Restored) */}
            <TabsContent value="history" className="mt-0 flex-grow">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between border-b">
                  <div><CardTitle>Upload History</CardTitle><CardDescription>Reload recently processed files.</CardDescription></div>
                  {uploadHistory.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild><Button variant="outline" size="sm">Clear History</Button></DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader><DialogTitle>Clear Upload History?</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                          <DialogClose asChild><Button type="button" variant="destructive" onClick={clearUploadHistory}>Clear History</Button></DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent className="flex-grow p-0">
                  <ScrollArea className="h-full">
                    {uploadHistory.length > 0 ? (
                      <div className="grid gap-3 p-4">
                        {uploadHistory.map((file) => {
                          const FileIconComponent = getFileIcon(file.name);
                          return (
                            <div key={file.id} className="border rounded-md p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                              <div className="flex items-center space-x-3 overflow-hidden">
                                <FileIconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <div className="overflow-hidden">
                                  <p className="text-sm font-medium leading-none truncate" title={file.name}>{file.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB - {new Date(file.lastModified).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <Button variant="link" size="sm" onClick={() => loadFileFromHistory(file.id)} className="px-2">Load</Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground text-center p-6">No upload history.</p></div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab Content (Restored) */}
            <TabsContent value="settings" className="mt-0 flex-grow">
              <Card className="h-full">
                <CardHeader><CardTitle>Settings</CardTitle><CardDescription>Customize application preferences.</CardDescription></CardHeader>
                <CardContent className="grid gap-6 p-6">
                  <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-muted/30">
                    <div className="space-y-0.5"><Label htmlFor="dark-mode" className="text-base font-medium">Dark Mode</Label><p className="text-sm text-muted-foreground">Toggle theme.</p></div>
                    <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} aria-label="Toggle dark mode" />
                  </div>
                  {/* Add more settings here */}
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQ Tab Content (Restored) */}
            <TabsContent value="faq" className="mt-0 flex-grow">
               <Card className="h-full">
                 <ScrollArea className="h-full p-6"><FAQPage /></ScrollArea>
               </Card>
            </TabsContent>

          </Tabs> {/* End of <Tabs> component */}

          {/* Footer */}
          <Footer />

        </main>

        <style jsx>{`
          @keyframes gradientAnimation { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
          .animate-gradient { animation: gradientAnimation 15s ease infinite; }
        `}</style>
      </div>
    </TooltipProvider>
  );
}