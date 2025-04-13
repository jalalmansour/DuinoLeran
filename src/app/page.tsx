'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import {
  File as FileIconLucide, // Renamed to avoid conflict with built-in File type
  MessageSquare,
  Upload,
  Sun,
  Moon,
  Settings,
  Trash2,
  ImageIcon,
  Code,
  BookOpen,
  Loader2, // Added for loading spinner
  Send, // Added for send icon
  X, // Added for close icon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { summarizeDocument } from '@/ai/flows/summarize-document'; // Assuming these exist and work
import { chatWithDocument } from '@/ai/flows/chat-with-document'; // Assuming these exist and work
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css'; // Ensure KaTeX CSS is imported

// Interfaces remain the same
interface UploadedFile {
  id: string; // Added unique ID for better list management
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string; // Storing full content might be memory intensive for large files
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Mapping file extensions to icons
const getFileIcon = (fileName: string): React.ElementType => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  switch (fileExtension) {
    case 'pdf': return BookOpen;
    case 'docx': case 'doc': return FileIconLucide;
    case 'pptx': case 'ppt': return FileIconLucide; // Consider a specific presentation icon if available
    case 'txt': return FileIconLucide;
    case 'py': case 'js': case 'jsx': case 'ts': case 'tsx': case 'html': case 'css': case 'json': case 'md': return Code;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': return ImageIcon;
    default: return FileIconLucide;
  }
};

// Main Component
export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true); // Default to dark mode
  const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // Use null when not uploading

  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // --- Effects ---

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    // Optional: Also add light class for explicit styling
    // document.body.classList.toggle('light', !darkMode);
  }, [darkMode]);

  // Load upload history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('uploadHistory');
      if (storedHistory) {
        setUploadHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error('Failed to parse upload history:', error);
      localStorage.removeItem('uploadHistory'); // Clear corrupted data
    }
  }, []);

  // Scroll chat to bottom when new messages are added or loading starts/stops
  useEffect(() => {
    if (chatContainerRef.current) {
      // Use scrollHeight for the ScrollArea's viewport
      const viewport = chatContainerRef.current.querySelector('div[style*="overflow: scroll;"]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      } else {
        // Fallback for simpler ScrollArea structures
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [chatHistory, isChatLoading]);


  // --- Upload History Management ---

  const saveUploadHistory = useCallback((file: UploadedFile) => {
    setUploadHistory((prevHistory) => {
      // Avoid duplicates based on content and name (simple check)
      const exists = prevHistory.some(
        (item) => item.name === file.name && item.lastModified === file.lastModified
      );
      if (exists) return prevHistory;

      const newHistory = [file, ...prevHistory].slice(0, 10); // Limit history
      try {
        localStorage.setItem('uploadHistory', JSON.stringify(newHistory));
      } catch (error: any) {
          if (error.name === 'QuotaExceededError') {
              toast({
                  title: 'Storage Full',
                  description: 'Local storage quota exceeded. Please clear history or upload smaller files.',
                  variant: 'warning',
              });
              // Optionally, clear the history to allow further uploads
              // clearUploadHistory();
          } else {
              console.error('Failed to save upload history:', error);
              toast({
                  title: 'Error Saving History',
                  description: 'Could not save to upload history. Local storage might be unavailable.',
                  variant: 'warning',
              });
          }
        return prevHistory;
      }
      return newHistory;
    });
  }, [toast]);

  const clearUploadHistory = useCallback(() => {
    setUploadHistory([]);
    localStorage.removeItem('uploadHistory');
    toast({
      title: 'History Cleared',
      description: 'Upload history has been removed.',
    });
  }, [toast]);

  // Added missing `summarizeTheDocument` function call which was removed from dependency array previously
  const loadFileFromHistory = useCallback(async (fileId: string) => {
    const fileToLoad = uploadHistory.find(file => file.id === fileId);
    if (fileToLoad) {
      setUploadedFile(fileToLoad);
      setSummary(''); // Clear previous summary
      setChatHistory([]); // Clear previous chat
      setCurrentMessage(''); // Clear chat input
      setIsSummarizing(true); // Indicate loading
      toast({
        title: 'File Loaded',
        description: `Loaded ${fileToLoad.name} from history. Summarizing...`,
      });
      // Need to define or import summarizeTheDocument if not already done
      // Assuming summarizeTheDocument exists in scope:
      await summarizeTheDocument(fileToLoad.content); // Call the summary function
    } else {
      toast({
        title: 'Error Loading File',
        description: 'Could not find the selected file in history.',
        variant: 'destructive',
      });
    }
  }, [uploadHistory, toast]);


  // --- AI Interaction ---

  // Define summarizeTheDocument (assuming it was defined outside the useCallback previously)
   const summarizeTheDocument = async (fileContent: string) => {
    // This state is set before calling, but setting again doesn't hurt
    setIsSummarizing(true);
    try {
      const summaryResult = await summarizeDocument({ fileContent: fileContent });
      setSummary(summaryResult.summary);
    } catch (error: any) {
      console.error('Error summarizing document:', error);
      toast({
        title: 'Summarization Failed',
        description: error.message || 'Could not generate summary.',
        variant: 'destructive',
      });
      setSummary('Error: Could not generate summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // --- File Drop Handling --- (Includes summarizeTheDocument call)
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => { // Made async to await summarizeTheDocument
      const file = acceptedFiles[0];
      if (!file) return;

      setUploadedFile(null);
      setSummary('');
      setChatHistory([]);
      setCurrentMessage('');
      setUploadProgress(0);

      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      reader.onloadstart = () => {
        setUploadProgress(0);
      };

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (typeof content !== 'string') {
            throw new Error('Failed to read file content as text.');
          }
          const newFile: UploadedFile = {
            id: generateId(),
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            content: content,
          };

          setUploadedFile(newFile);
          saveUploadHistory(newFile);
          toast({
            title: 'File Uploaded',
            description: `Successfully uploaded ${file.name}. Summarizing...`,
          });
          setIsSummarizing(true); // Set summarizing before calling
          setUploadProgress(100);
          await summarizeTheDocument(content); // Call the function
          setTimeout(() => setUploadProgress(null), 500);

        } catch (error: any) {
            console.error('Error processing file:', error);
            toast({
                title: 'Error Processing File',
                description: error.message || 'Could not process the uploaded file.',
                variant: 'destructive',
            });
            setUploadProgress(null);
            setIsSummarizing(false);
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader Error:', error);
        toast({
          title: 'Error Reading File',
          description: 'Could not read the selected file.',
          variant: 'destructive',
        });
        setUploadProgress(null);
        setIsSummarizing(false);
      };

      reader.readAsText(file);

    },
    // Dependencies: toast, saveUploadHistory, summarizeTheDocument
    [toast, saveUploadHistory, summarizeTheDocument]
  );


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });


  const handleSendMessage = async () => {
    const messageToSend = currentMessage.trim();
    if (!uploadedFile || !messageToSend || isChatLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: messageToSend };
    setChatHistory((prev) => [...prev, userMessage]);
    setCurrentMessage('');
    setIsChatLoading(true);

    try {
      const chatResult = await chatWithDocument({
        documentContent: uploadedFile.content,
        userMessage: messageToSend,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: chatResult.response,
      };
      setChatHistory((prev) => [...prev, assistantMessage]);

    } catch (error: any) {
      console.error('Error chatting with document:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error.message || 'Could not get response.'}`,
      };
       setChatHistory((prev) => [...prev, errorMessage]);
      toast({
        title: 'Chat Error',
        description: error.message || 'Failed to get response from AI.',
        variant: 'destructive',
      });
    } finally {
      setIsChatLoading(false);
      textAreaRef.current?.focus();
    }
  };

   // Handle Enter key press in textarea (Shift+Enter for newline)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent default newline insertion
      handleSendMessage();
    }
  };


  // --- Rendering ---

  const FileIcon = uploadedFile ? getFileIcon(uploadedFile.name) : Upload; // Use Upload icon if no file

   // Optimized Markdown Rendering Component
   const MemoizedMarkdown = React.memo(({ content }: { content: string }) => (
    +   <div className="prose prose-sm dark:prose-invert max-w-none"> {/* Apply classes to a wrapper div */}
          <ReactMarkdown
             children={content}
             remarkPlugins={[remarkGfm, remarkMath]}
             rehypePlugins={[rehypeKatex]}
             components={{
                code({ node, inline, className, children, ...props }) {
                 // ... code component implementation ...
                 return !inline ? (
                   <pre className={cn(className, 'bg-gray-800 dark:bg-gray-900 rounded p-3 my-3 overflow-x-auto')} {...props}>
                     <code className={cn("text-sm", className ? `language-${className}` : '')}>{children}</code>
                   </pre>
                 ) : (
                   <code className={cn(className, "bg-gray-700 dark:bg-gray-600 px-1 py-0.5 rounded text-yellow-300 dark:text-yellow-400")} {...props}>
                     {children}
                   </code>
                 );
               },
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto">
                    <table className="table-auto border-collapse border border-gray-400 dark:border-gray-600 w-full my-3 text-sm" {...props} />
                  </div>
                 ),
                 th: ({node, ...props}) => <th className="border border-gray-300 dark:border-gray-700 px-2 py-1 bg-gray-100 dark:bg-gray-800 font-medium" {...props} />,
                 td: ({node, ...props}) => <td className="border border-gray-300 dark:border-gray-700 px-2 py-1" {...props} />,
             }}
         />
    +   </div>
      ))
      MemoizedMarkdown.displayName = 'MemoizedMarkdown';

  return (
    <TooltipProvider> {/* Restored */}
      <div className={cn('flex flex-col min-h-screen', darkMode ? 'dark' : '')}> {/* Restored */}
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6"> {/* Restored */}
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text"> {/* Restored */}
            DuinoLearn AI
          </h1>
          <Tooltip>
   <TooltipTrigger asChild>
     <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
       {/* Wrap the icon and sr-only span in a single element */}
       <span className="inline-flex items-center justify-center"> {/* Optional: classes to help layout if needed */}
         {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
         <span className="sr-only">Toggle Theme</span>
       </span>
     </Button>
   </TooltipTrigger>
   <TooltipContent>
     <p>Toggle {darkMode ? 'Light' : 'Dark'} Mode</p>
   </TooltipContent>
 </Tooltip>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8"> {/* Restored */}
          <Tabs defaultValue="upload" className="flex flex-col lg:flex-row gap-6 h-full"> {/* Restored */}
            {/* Left Panel: Tabs Navigation */}
            <div className="w-full lg:w-auto lg:max-w-xs shrink-0"> {/* Restored */}
              <TabsList className="grid grid-cols-3 lg:grid-cols-1 lg:h-auto w-full"> {/* Restored */}
                <TabsTrigger value="upload"> {/* Restored */}
                  <Upload className="h-4 w-4 mr-2" /> Upload {/* Restored */}
                </TabsTrigger>
                <TabsTrigger value="history"> {/* Restored */}
                  <BookOpen className="h-4 w-4 mr-2" /> History {/* Restored */}
                </TabsTrigger>
                <TabsTrigger value="settings"> {/* Restored */}
                  <Settings className="h-4 w-4 mr-2" /> Settings {/* Restored */}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Right Panel: Tabs Content */}
            <div className="flex-1 min-w-0"> {/* Restored */}
              {/* --- Upload/Chat Tab --- */}
              <TabsContent value="upload" className="mt-0 h-full"> {/* Restored */}
                  <div className="flex flex-col gap-4 h-full max-h-[calc(100vh-10rem)]"> {/* Restored */}
                      {/* Dropzone Card */}
                      <Card
                          {...getRootProps()}
                          className={cn(
                              "border-2 border-dashed hover:border-primary/60 cursor-pointer transition-colors",
                              isDragActive ? "border-primary bg-primary/10" : "border-muted"
                          )}
                      > {/* Restored */}
                          <CardContent className="flex flex-col items-center justify-center p-6 text-center min-h-[120px]"> {/* Restored */}
                              <input {...getInputProps()} /> {/* Restored */}
                              <FileIcon className="h-10 w-10 text-muted-foreground mb-3" /> {/* Restored */}
                              {isDragActive ? (
                                  <p className="text-lg font-semibold text-primary">Drop the file here...</p>
                              ) : (
                                  <>
                                      <p className="font-semibold">Drag & drop file here, or click to select</p>
                                      <p className="text-sm text-muted-foreground mt-1">Supports text-based files (TXT, PDF, DOCX, code, etc.)</p>
                                  </>
                              )}
                              {uploadProgress !== null && uploadProgress >= 0 && (
                                  <div className="w-full max-w-xs mt-4">
                                    <Progress value={uploadProgress} className="h-2" />
                                    <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
                                  </div>
                              )}
                          </CardContent>
                      </Card>

                      {/* Separator */}
                      <Separator className="my-2"/> {/* Restored */}

                       {/* Content Area (Summary & Chat) */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"> {/* Restored */}
                        {/* Summary Section */}
                        <Card className="flex flex-col overflow-hidden"> {/* Restored */}
                            <CardHeader> {/* Restored */}
                                <CardTitle>Summary</CardTitle>
                                <CardDescription>AI-generated summary of the document.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-4"> {/* Restored */}
                                {isSummarizing ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-[80%]" />
                                         <Skeleton className="h-4 w-full mt-4" />
                                        <Skeleton className="h-4 w-[90%]" />
                                    </div>
                                ) : summary ? (
                                     <MemoizedMarkdown content={summary} />
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        {uploadedFile ? 'Summarizing...' : 'Upload a document to see its summary.'}
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Chat Section */}
                        <Card className="flex flex-col overflow-hidden"> {/* Restored */}
                            <CardHeader> {/* Restored */}
                                <CardTitle>Chat with Document</CardTitle>
                                <CardDescription>Ask questions about the uploaded file.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 p-0 overflow-hidden"> {/* Restored */}
                                <ScrollArea className="h-full p-4" ref={chatContainerRef}> {/* Restored */}
                                    <div className="space-y-4"> {/* Restored */}
                                        {chatHistory.map((message, index) => (
                                            <div
                                                key={index}
                                                className={cn(
                                                    "flex w-full",
                                                    message.role === 'user' ? "justify-end" : "justify-start"
                                                )}
                                            > {/* Restored */}
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className={cn(
                                                        "p-3 rounded-lg max-w-[80%]",
                                                        message.role === 'user'
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted"
                                                    )}
                                                > {/* Restored */}
                                                     <MemoizedMarkdown content={message.content} />
                                                </motion.div>
                                            </div>
                                        ))}
                                        {isChatLoading && (
                                            <div className="flex justify-start"> {/* Restored */}
                                                 <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="p-3 rounded-lg bg-muted flex items-center space-x-2"
                                                > {/* Restored */}
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">Thinking...</span>
                                                </motion.div>
                                            </div>
                                        )}
                                        {!uploadedFile && chatHistory.length === 0 && (
                                            <p className="text-sm text-center text-muted-foreground italic py-4">
                                                Upload a document to start chatting.
                                            </p>
                                        )}
                                         {uploadedFile && chatHistory.length === 0 && !isChatLoading && (
                                            <p className="text-sm text-center text-muted-foreground italic py-4">
                                                Ask a question about "{uploadedFile?.name || 'the document'}".
                                            </p>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                            <CardFooter className="p-4 border-t"> {/* Restored */}
                                <div className="flex w-full items-center gap-2"> {/* Restored */}
                                    <Textarea
                                        ref={textAreaRef}
                                        placeholder={uploadedFile ? "Ask anything about the document..." : "Please upload a document first"}
                                        value={currentMessage}
                                        onChange={(e) => setCurrentMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                        className="min-h-[40px] max-h-[150px] flex-1 resize-none"
                                        disabled={!uploadedFile || isChatLoading || isSummarizing}
                                        aria-label="Chat input"
                                        suppressHydrationWarning={true} // Keep this fix from earlier
                                    /> {/* Restored */}
                                    <Button
                                        type="button"
                                        onClick={handleSendMessage}
                                        disabled={!uploadedFile || !currentMessage.trim() || isChatLoading || isSummarizing}
                                        size="icon"
                                    > {/* Restored */}
                                        {isChatLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">Send Message</span>
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                      </div>
                  </div>
              </TabsContent>


              {/* --- History Tab --- */}
              <TabsContent value="history" className="mt-0"> {/* Restored */}
                <Card> {/* Restored */}
                  <CardHeader className="flex flex-row items-center justify-between"> {/* Restored */}
                    <div> {/* Restored */}
                      <CardTitle>Upload History</CardTitle>
                      <CardDescription>View and reload recently uploaded files.</CardDescription>
                    </div>
                     {uploadHistory.length > 0 && (
                       <Dialog> {/* Restored */}
                         <DialogTrigger asChild> {/* Restored */}
                           <Button variant="outline" size="sm">
                             <Trash2 className="h-4 w-4 mr-1" /> Clear History
                           </Button>
                         </DialogTrigger>
                         <DialogContent> {/* Restored */}
                           <DialogHeader> {/* Restored */}
                             <DialogTitle>Clear Upload History?</DialogTitle>
                             <DialogDescription>
                               This action cannot be undone. All locally stored file references and content previews will be removed.
                             </DialogDescription>
                           </DialogHeader>
                           <DialogFooter> {/* Restored */}
                             <DialogClose asChild> {/* Restored */}
                               <Button variant="outline">Cancel</Button>
                             </DialogClose>
                             <DialogClose asChild> {/* Restored */}
                                <Button variant="destructive" onClick={clearUploadHistory}>
                                 Clear History
                                </Button>
                             </DialogClose>
                           </DialogFooter>
                         </DialogContent>
                       </Dialog>
                     )}
                  </CardHeader>
                  <CardContent> {/* Restored */}
                    {uploadHistory.length > 0 ? (
                      <ScrollArea className="h-[calc(100vh-20rem)]"> {/* Restored */}
                        <ul className="space-y-2"> {/* Restored */}
                          {uploadHistory.map((file) => {
                            const FileIconComponent = getFileIcon(file.name);
                            return (
                              <li
                                key={file.id} // Use generated unique ID
                                className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 transition-colors"
                              > {/* Restored */}
                                <div className="flex items-center gap-3 truncate"> {/* Restored */}
                                  <FileIconComponent className="h-5 w-5 text-muted-foreground shrink-0" />
                                  <div className="truncate"> {/* Restored */}
                                    <span className="font-medium truncate block">{file.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB - Uploaded: {new Date(file.lastModified).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => loadFileFromHistory(file.id)}
                                > {/* Restored */}
                                  Load
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-4">
                        No upload history found. Upload a file to get started.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>


              {/* --- Settings Tab --- */}
              <TabsContent value="settings" className="mt-0"> {/* Restored */}
                <Card> {/* Restored */}
                  <CardHeader> {/* Restored */}
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Customize application preferences.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6"> {/* Restored */}
                    <div className="flex items-center justify-between p-4 rounded-lg border"> {/* Restored */}
                       <div> {/* Restored */}
                            <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                            <p className="text-sm text-muted-foreground">Toggle between light and dark themes.</p>
                       </div>
                      <Switch
                        id="dark-mode"
                        checked={darkMode}
                        onCheckedChange={setDarkMode}
                        aria-label="Toggle dark mode"
                      /> {/* Restored */}
                    </div>
                     {/* Add more settings here as needed */}
                     {/* Example:
                     <Separator />
                     <div className="flex items-center justify-between">
                        <Label htmlFor="setting-2">Another Setting</Label>
                        <Input id="setting-2" placeholder="Value" className="max-w-xs"/>
                    </div>
                     */}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t px-4 py-3 text-center text-xs text-muted-foreground md:px-6"> {/* Restored */}
          © {new Date().getFullYear()} DuinoLearn AI. All rights reserved.
        </footer>
      </div>
    </TooltipProvider>
  );
}
