'use client';

import React, {useState, useCallback, useEffect, useRef} from 'react';
import {useDropzone} from 'react-dropzone';
import {motion} from 'framer-motion';
import {File, MessageSquare, Upload, Sun, Moon, Settings, Trash2, ImageIcon, Code, BookOpen} from 'lucide-react';
import {useToast} from '@/hooks/use-toast';
import {summarizeDocument} from '@/ai/flows/summarize-document';
import {chatWithDocument} from '@/ai/flows/chat-with-document';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose} from '@/components/ui/dialog';
import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import {Separator} from '@/components/ui/separator';
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs"
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip"
import {cn} from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface UploadedFile {
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

const getFileIcon = (fileName: string) => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();

  switch (fileExtension) {
    case 'pdf':
      return BookOpen;
    case 'docx':
    case 'doc':
      return File;
    case 'pptx':
    case 'ppt':
      return File;
    case 'txt':
      return File;
    case 'py':
    case 'js':
    case 'html':
    case 'css':
      return Code;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return ImageIcon;
    default:
      return File;
  }
};

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([]);
  const {toast} = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    document.body.classList.toggle('light', !darkMode);
  }, [darkMode]);

  useEffect(() => {
    const storedHistory = localStorage.getItem('uploadHistory');
    if (storedHistory) {
      try {
        setUploadHistory(JSON.parse(storedHistory));
      } catch (error) {
        console.error('Failed to parse upload history from localStorage:', error);
        localStorage.removeItem('uploadHistory');
        setUploadHistory([]);
      }
    }
  }, []);

  const saveUploadHistory = (file: UploadedFile) => {
    const newHistory = [file, ...uploadHistory];
    // Limit the history to the 10 most recent files
    const limitedHistory = newHistory.slice(0, 10);
    setUploadHistory(limitedHistory);
    try {
      localStorage.setItem('uploadHistory', JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Failed to save upload history to localStorage:', error);
      toast({
        title: 'Error',
        description: 'Could not save upload history due to storage quota limitations.',
        variant: 'destructive',
      });
    }
  };

  const clearUploadHistory = () => {
    setUploadHistory([]);
    localStorage.removeItem('uploadHistory');
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
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
          setUploadProgress(100);
          const content = e.target?.result as string;
          const newFile: UploadedFile = {
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
            description: `Successfully uploaded ${file.name}`,
          });
          await summarizeTheDocument(content);
        };

        reader.onerror = () => {
          toast({
            title: 'Error Uploading',
            description: 'Failed to read the file.',
            variant: 'destructive',
          });
          setUploadProgress(0);
        };

        reader.readAsText(file);
      }
    },
    [toast, saveUploadHistory, summarizeDocument]
  );

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop});

  const summarizeTheDocument = async (fileContent: string) => {
    setIsSummarizing(true);
    try {
      const summaryResult = await summarizeDocument({fileContent: fileContent});
      setSummary(summaryResult.summary);
    } catch (error: any) {
      toast({
        title: 'Error Summarizing',
        description: error.message,
        variant: 'destructive',
      });
      console.error('Error summarizing document:', error);
      setSummary('');
    } finally {
      setIsLoading(false);
      setIsSummarizing(false);
    }
  };

  const handleSendMessage = async () => {
    if (uploadedFile && currentMessage.trim() !== '') {
      const userMessage: ChatMessage = {role: 'user', content: currentMessage};
      setChatHistory((prev) => [...prev, userMessage]);
      setCurrentMessage('');

      try {
        setIsLoading(true);
        const chatResult = await chatWithDocument({
          documentContent: uploadedFile.content,
          userMessage: currentMessage,
        });

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: chatResult.response,
        };
        setChatHistory((prev) => [...prev, assistantMessage]);

        // Scroll to the bottom of the chat interface
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      } catch (error: any) {
        toast({
          title: 'Error Chatting',
          description: error.message,
          variant: 'destructive',
        });
        console.error('Error chatting with document:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const fileIcon = uploadedFile ? getFileIcon(uploadedFile.name) : File;

  const renderMarkdown = (markdown: string) => {
    return (
      
        <ReactMarkdown
          children={markdown}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-4xl text-purple-400 mb-4" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-3xl text-pink-400 mb-3" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-2xl text-teal-300 mb-2" {...props} />,
            code: ({node, inline, className, children, ...props}) => {
              return !inline ? (
                
                  <code {...props}>{children}</code>
                
              ) : (
                <code className="bg-gray-700 px-1 py-0.5 rounded text-yellow-300">{children}</code>
              );
            },
            table: ({node, ...props}) => (
              <table className="table-auto border border-gray-600 text-sm text-left">{props.children}</table>
            ),
            img: ({src, alt}) => (
              <img src={src} alt={alt} className="rounded-lg shadow-md my-4" />
            )
          }}
        />
      
    );
  };

  return (
    
      
        
          
            DuinoLearn AI
          
          
            
              
                
                  <Settings className="h-5 w-5" />
                  Settings
                
              
              Customize app settings
            
          
        
      

      
        
          
            
              Upload
              History
              Settings
            
            
              
                
                  
                    
                      
                      Drag &amp; drop a file here, or click to select files
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        
                      )}
                      {uploadedFile && (
                        
                          {React.createElement(fileIcon, {className: "inline-block h-4 w-4 mr-2"})}
                          {uploadedFile.name}
                        
                      )}
                    
                  
                

                {isSummarizing ? (
                   
                    
                      Summary
                      
                    
                  
                ) : summary ? (
                  
                    
                      Summary
                       {renderMarkdown(summary)}
                    
                  
                ) : null}

                {uploadedFile && (
                  
                    
                      
                        
                          {chatHistory.map((message, index) => (
                            
                              {renderMarkdown(message.content)}
                            
                          ))}
                        
                        
                          
                            
                              
                                Ask me anything about the document...
                                
                              
                              
                                {isLoading ? 'Sending...' : 'Send'}
                              
                            
                          
                        
                      
                    
                  
                )}
              
            

            
              
                {uploadHistory.length > 0 ? (
                  uploadHistory.map((file, index) => {
                     const FileIconComponent = getFileIcon(file.name);
                    return (
                    
                      
                        
                          {React.createElement(FileIconComponent, {className: "inline-block h-4 w-4 mr-2"})}
                          {file.name}
                        
                        
                          {new Date(file.lastModified).toLocaleDateString()}
                        
                      
                    
                  )
                  })
                ) : (
                  
                    No upload history available.
                  
                )}

                {uploadHistory.length > 0 && (
                  
                    
                      
                        
                          Are you absolutely sure?
                          This action cannot be undone. This will permanently delete your upload history
                          from our servers.
                        
                      
                      
                        
                          Delete
                        
                      
                    
                  
                )}
              
            

            
              
                
                  
                    Appearance
                    Customize the look and feel of the app.
                  
                  
                    
                      Dark Mode
                      
                    
                  
                
              
            
          
        
      

      
        © {new Date().getFullYear()} DuinoLearn. All rights reserved.
      
    
  );
}

