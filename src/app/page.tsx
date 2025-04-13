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
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
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
      await summarizeTheDocument(fileToLoad.content);
    } else {
      toast({
        title: 'Error Loading File',
        description: 'Could not find the selected file in history.',
        variant: 'destructive',
      });
    }
  }, [uploadHistory, toast]); // Removed summarizeTheDocument dependency here, call it directly


  // --- File Drop Handling ---

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Basic type check (expand as needed) - This is client-side only
      // const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      // if (!allowedTypes.includes(file.type)) {
      //     toast({ title: 'Unsupported File Type', description: `File type ${file.type} is not supported.`, variant: 'destructive' });
      //     return;
      // }

      // Reset states for new upload
      setUploadedFile(null);
      setSummary('');
      setChatHistory([]);
      setCurrentMessage('');
      setUploadProgress(0); // Start progress tracking

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
            content: content, // Consider security implications of storing content client-side
          };

          setUploadedFile(newFile);
          saveUploadHistory(newFile);
          toast({
            title: 'File Uploaded',
            description: `Successfully uploaded ${file.name}. Summarizing...`,
          });
          setIsSummarizing(true);
          setUploadProgress(100); // Ensure progress hits 100 before hiding
          await summarizeTheDocument(content);
          setTimeout(() => setUploadProgress(null), 500); // Hide progress bar after a short delay

        } catch (error: any) {
            console.error('Error processing file:', error);
            toast({
                title: 'Error Processing File',
                description: error.message || 'Could not process the uploaded file.',
                variant: 'destructive',
            });
            setUploadProgress(null);
            setIsSummarizing(false); // Ensure loading state is reset on error
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
        setIsSummarizing(false); // Reset loading state
      };

      // Consider using readAsArrayBuffer for binary files and server-side parsing
      reader.readAsText(file); // Reads content as text. Might fail for non-text files.

    },
    [toast, saveUploadHistory] // Removed summarizeTheDocument dependency here, call it directly
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false, // Only allow single file uploads
    // Add accepted file types here if needed, e.g.,
    // accept: {
    //   'text/plain': ['.txt'],
    //   'application/pdf': ['.pdf'],
    //   'application/msword': ['.doc'],
    //   'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    // }
  });

  // --- AI Interaction ---

  const summarizeTheDocument = async (fileContent: string) => {
    // No need to set summarizing state here, it's set before calling
    try {
      // Simulate network delay for testing loading states
      // await new Promise(resolve => setTimeout(resolve, 2000));
      const summaryResult = await summarizeDocument({ fileContent: fileContent });
      setSummary(summaryResult.summary);
    } catch (error: any) {
      console.error('Error summarizing document:', error);
      toast({
        title: 'Summarization Failed',
        description: error.message || 'Could not generate summary.',
        variant: 'destructive',
      });
      setSummary('Error: Could not generate summary.'); // Provide feedback in the UI
    } finally {
      setIsSummarizing(false); // Turn off summarizing indicator regardless of success/failure
    }
  };

  const handleSendMessage = async () => {
    const messageToSend = currentMessage.trim();
    if (!uploadedFile || !messageToSend || isChatLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: messageToSend };
    setChatHistory((prev) => [...prev, userMessage]);
    setCurrentMessage('');
    setIsChatLoading(true);

    try {
        // Simulate network delay
        // await new Promise(resolve => setTimeout(resolve, 1500));
      const chatResult = await chatWithDocument({
        documentContent: uploadedFile.content,
        userMessage: messageToSend,
        // Optionally pass chat history for context
        // chatHistory: chatHistory
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
       // Refocus the textarea after sending
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
    <ReactMarkdown
       children={content}
       remarkPlugins={[remarkGfm, remarkMath]}
       rehypePlugins={[rehypeKatex]}
       className="prose prose-sm dark:prose-invert max-w-none" // Added prose styling
       components={{
         // Customize rendering further if needed
          code({ node, inline, className, children, ...props }) {
           // ... code component implementation ...
           return (
            <code className={className} {...props}>
              {children}
            </code>
          );
         }, // Comma is correct
          table: ({node, ...props}) => (
            <div className="overflow-x-auto">
              <table className="table-auto border-collapse border border-gray-400 dark:border-gray-600 w-full my-3 text-sm" {...props} />
            </div>
           ), // <----- ADD COMMA HERE
           th: ({node, ...props}) => <th className="border border-gray-300 dark:border-gray-700 px-2 py-1 bg-gray-100 dark:bg-gray-800 font-medium" {...props} />,
           td: ({node, ...props}) => <td className="border border-gray-300 dark:border-gray-700 px-2 py-1" {...props} />,
           // Add more custom components if needed (e.g., for links, lists)
       }}
   />
 ));
 MemoizedMarkdown.displayName = 'MemoizedMarkdown';


  return (
    
      
        {/* Header */}
        
          
            DuinoLearn AI
          
          
            
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              
            
            
              Toggle {darkMode ? 'Light' : 'Dark'} Mode
            
          
        

        {/* Main Content Area */}
        
          
            {/* Left Panel: Tabs Navigation */}
            
              
                
                  
                    Upload
                  
                
                
                  
                    History
                  
                
                
                  
                    Settings
                  
                
              
            

            {/* Right Panel: Tabs Content */}
            
              {/* --- Upload/Chat Tab --- */}
              
                  
                      {/* Dropzone Card */}
                      
                          
                              
                                  
                                      
                                          Drop the file here...
                                      
                                      
                                          Drag & drop file here, or click to select
                                          
                                              Supports text-based files (TXT, PDF, DOCX, code, etc.)
                                          
                                      
                                  
                                  {uploadProgress !== null && uploadProgress >= 0 && (
                                      
                                        
                                        {uploadProgress}%
                                      
                                  )}
                              
                          
                      

                      {/* Separator */}
                      

                       {/* Content Area (Summary & Chat) */}
                      
                        {/* Summary Section */}
                        
                            
                                
                                    Summary
                                
                                
                                    AI-generated summary of the document.
                                
                            
                            
                                {isSummarizing ? (
                                    
                                        
                                        
                                        
                                         
                                        
                                    
                                ) : summary ? (
                                     <MemoizedMarkdown content={summary} />
                                ) : (
                                    
                                        {uploadedFile ? 'Summarizing...' : 'Upload a document to see its summary.'}
                                    
                                )}
                            
                        

                        {/* Chat Section */}
                        
                            
                                
                                    Chat with Document
                                
                                
                                    Ask questions about the uploaded file.
                                
                            
                            
                                
                                    
                                        {chatHistory.map((message, index) => (
                                            
                                                
                                                    
                                                        <MemoizedMarkdown content={message.content} />
                                                    
                                                
                                            
                                        ))}
                                        {isChatLoading && (
                                            
                                                 
                                                    
                                                    
                                                        Thinking...
                                                    
                                                
                                            
                                        )}
                                        {!uploadedFile && chatHistory.length === 0 && (
                                            
                                                Upload a document to start chatting.
                                            
                                        )}
                                         {uploadedFile && chatHistory.length === 0 && !isChatLoading && (
                                            
                                                Ask a question about "{uploadedFile?.name || 'the document'}".
                                            
                                        )}
                                    
                                
                            
                            
                                
                                  
                                    
                                      Ask me anything about the document...
                                    
                                      
                                          {isChatLoading ? (
                                              
                                          ) : (
                                              
                                          )}
                                          
                                      
                                  
                                
                            
                        
                      
                  
              

              {/* --- History Tab --- */}
              
                
                  
                    
                      
                        
                          Upload History
                          View and reload recently uploaded files.
                        
                      
                       {uploadHistory.length > 0 && (
                         
                           
                             
                               
                                 Clear Upload History?
                               
                               
                                 This action cannot be undone. All locally stored file references and content previews will be removed.
                               
                             
                             
                               
                                 Cancel
                               
                                 
                                  Clear History
                                 
                               
                             
                           
                         
                       )}
                    
                  
                  
                    {uploadHistory.length > 0 ? (
                      
                        
                          {uploadHistory.map((file) => {
                            const FileIconComponent = getFileIcon(file.name);
                            return (
                              
                                
                                  
                                    
                                      
                                      
                                        {(file.size / 1024).toFixed(1)} KB - Uploaded: {new Date(file.lastModified).toLocaleDateString()}
                                      
                                    
                                  
                                
                                
                                  Load
                                
                              
                            );
                          })}
                        
                      
                    ) : (
                      
                        No upload history found. Upload a file to get started.
                      
                    )}
                  
                
              

              {/* --- Settings Tab --- */}
              
                
                  
                    
                      
                        Settings
                        Customize application preferences.
                      
                    
                  
                  
                    
                      
                           Dark Mode
                            Toggle between light and dark themes.
                      
                      
                        
                          
                            
                          
                        
                      
                    
                     {/* Add more settings here as needed */}
                     {/* Example:
                     
                     
                      
                        Another Setting
                        
                    
                     */}
                  
                
              
            
          
        

        {/* Footer */}
        
          © {new Date().getFullYear()} DuinoLearn AI. All rights reserved.
        
      
    
  );
}

