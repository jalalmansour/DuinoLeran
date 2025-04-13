'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import {
  File as FileIconLucide,
  MessageSquare,
  Upload,
  Sun,
  Moon,
  Settings,
  Trash2,
  ImageIcon,
  Code,
  BookOpen,
  Loader2,
  Send,
  X,
  ChevronsDown,
  ChevronsUp,
  Lightbulb,
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
import 'katex/dist/katex.min.css';

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

const generateId = () => Math.random().toString(36).substring(2, 15);

const getFileIcon = (fileName: string): React.ElementType => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  switch (fileExtension) {
    case 'pdf': return BookOpen;
    case 'docx': case 'doc': return FileIconLucide;
    case 'pptx': case 'ppt': return FileIconLucide;
    case 'txt': return FileIconLucide;
    case 'py': case 'js': case 'jsx': case 'ts': case 'tsx': case 'html': case 'css': case 'json': case 'md': return Code;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': return ImageIcon;
    default: return FileIconLucide;
  }
};

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"upload" | "history" | "settings">("upload");

  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isExplanatoryUIEnabled, setIsExplanatoryUIEnabled] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('uploadHistory');
      if (storedHistory) {
        setUploadHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error('Failed to parse upload history:', error);
      localStorage.removeItem('uploadHistory');
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      const viewport = chatContainerRef.current.querySelector('div[style*="overflow: scroll;"]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      } else {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, [chatHistory, isChatLoading]);

  const saveUploadHistory = useCallback((file: UploadedFile) => {
    setUploadHistory((prevHistory) => {
      const exists = prevHistory.some(
        (item) => item.name === file.name && item.lastModified === file.lastModified
      );
      if (exists) return prevHistory;

      const newHistory = [file, ...prevHistory].slice(0, 10);
      try {
        localStorage.setItem('uploadHistory', JSON.stringify(newHistory));
      } catch (error: any) {
        if (error.name === 'QuotaExceededError') {
          toast({
            title: 'Storage Full',
            description: 'Local storage quota exceeded. Please clear history or upload smaller files.',
            variant: 'warning',
          });
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
      setSummary('');
      setChatHistory([]);
      setCurrentMessage('');
      setIsSummarizing(true);
      toast({
        title: 'File Loaded',
        description: `Loaded ${fileToLoad.name} from history. Summarizing...`,
      });
      summarizeTheDocument(fileToLoad.content);
      setActiveTab("upload"); // Switch to upload tab
    } else {
      toast({
        title: 'Error Loading File',
        description: 'Could not find the selected file in history.',
        variant: 'destructive',
      });
    }
  }, [uploadHistory, toast, setActiveTab]);

  const summarizeTheDocument = async (fileContent: string) => {
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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
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
          setIsSummarizing(true);
          setUploadProgress(100);
          await summarizeTheDocument(content);
          setTimeout(() => setUploadProgress(null), 500);
          setIsExplanatoryUIEnabled(true);

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const FileIcon = uploadedFile ? getFileIcon(uploadedFile.name) : Upload;

  const MemoizedMarkdown = React.memo(({ content }: { content: string }) => (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-4xl text-purple-400 mb-4" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-3xl text-pink-400 mb-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-2xl text-teal-300 mb-2" {...props} />
          ),
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className={cn(className, 'bg-gray-800 dark:bg-gray-900 rounded p-3 my-3 overflow-x-auto')} {...props}>
                <code className={cn("text-sm", match ? `language-${match[1]}` : '')}>{children}</code>
              </pre>
            ) : (
              <code className={cn(className, "bg-gray-700 dark:bg-gray-600 px-1 py-0.5 rounded text-yellow-300 dark:text-yellow-400")} {...props}>
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table className="table-auto border-collapse border border-gray-400 dark:border-gray-600 w-full my-3 text-sm" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => <th className="border border-gray-300 dark:border-gray-700 px-2 py-1 bg-gray-100 dark:bg-gray-800 font-medium" {...props} />,
          td: ({ node, ...props }) => <td className="border border-gray-300 dark:border-gray-700 px-2 py-1" {...props} />,
        }}
      />
    </div>
  ));
  MemoizedMarkdown.displayName = 'MemoizedMarkdown';

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col min-h-screen', darkMode ? 'dark' : '')}>
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            DuinoLearn AI
          </h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setDarkMode(!darkMode)}>
                {/* Wrap the icon and sr-only span in a single element */}
                <span className="inline-flex items-center justify-center">
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span className="sr-only">Toggle dark mode</span>
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Toggle dark mode
            </TooltipContent>
          </Tooltip>
        </header>

        <main className="container mx-auto flex flex-col flex-grow p-4 space-y-4 md:space-y-6">
          <Tabs defaultValue={activeTab} className="w-full" onValueChange={(tab) => setActiveTab(tab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">
                Upload
              </TabsTrigger>
              <TabsTrigger value="history">
                History
              </TabsTrigger>
              <TabsTrigger value="settings">
                Settings
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-0 h-full">
              {/* Upload Area */}
              <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                <Card className="flex-1 overflow-hidden">
                  <div
                    {...getRootProps()}
                    className={cn(
                      "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                      isDragActive
                        ? "bg-accent"
                        : "border-muted hover:bg-secondary"
                    )}
                  >
                    <input {...getInputProps()} />
                    <FileIcon className="h-10 w-10 text-muted-foreground mb-3" />
                    {isDragActive ? (
                      <p className="text-lg">Drop the file here...</p>
                    ) : (
                      <div className="text-center">
                        <p className="text-lg">
                          Drag &amp; drop file here, or click to select
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Supports text-based files (TXT, PDF, DOCX, code,
                          etc.)
                        </p>
                      </div>
                    )}
                    {uploadProgress !== null && uploadProgress >= 0 && (
                      <div className="w-full mt-4">
                        <Progress value={uploadProgress} />
                        <p className="text-sm text-muted-foreground mt-1 text-right">
                          {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Summary Section */}
                <Card className="flex flex-col overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Summary
                      {uploadedFile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                        >
                          {isSummaryCollapsed ? (
                            <ChevronsDown className="h-4 w-4" />
                          ) : (
                            <ChevronsUp className="h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {isSummaryCollapsed ? 'Expand' : 'Collapse'} Summary
                          </span>
                        </Button>
                      )}
                    </CardTitle>
                    <CardDescription>
                      AI-generated summary of the document.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className={cn(isSummaryCollapsed ? 'h-0' : 'h-auto', 'overflow-hidden transition-all duration-300')}>
                    {isSummarizing ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <p className="text-sm text-muted-foreground">
                          Summarizing...
                        </p>
                      </div>
                    ) : (
                      <>
                        {summary ? (
                          <>
                            <h3 className="text-lg font-semibold mb-2">Document Summary</h3>
                            <MemoizedMarkdown content={summary} />
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {uploadedFile
                              ? 'Summarizing document...'
                              : 'Upload a document to see its summary.'}
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Explanatory UI Section */}
              {uploadedFile && (
                <div className="fixed bottom-4 right-4 z-50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        className="rounded-full p-3 shadow-lg"
                        onClick={() => setIsExplanatoryUIEnabled(!isExplanatoryUIEnabled)}
                      >
                        <Lightbulb className="h-6 w-6" />
                        <span className="sr-only">
                          {isExplanatoryUIEnabled ? 'Hide' : 'Show'} Explanatory UI
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      {isExplanatoryUIEnabled ? 'Hide Explanatory UI' : 'Show Explanatory UI'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {isExplanatoryUIEnabled && uploadedFile && (
                <motion.div
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-4xl p-6 bg-background border rounded-lg shadow-xl"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Explanatory UI</CardTitle>
                      <CardDescription>
                        Interactive explanations for "{uploadedFile.name}".
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Add interactive components here */}
                      <p className="text-muted-foreground">
                        This section will dynamically generate interactive components based on
                        AI analysis of the uploaded document.
                      </p>
                      <ul className="list-disc list-inside mt-2">
                        <li>Interactive quizzes</li>
                        <li>Definition cards with animations</li>
                        <li>Timeline-based content</li>
                        <li>And more!</li>
                      </ul>
                      <Button onClick={() => setIsExplanatoryUIEnabled(false)} variant="outline" className="mt-4">Close</Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Chat Section */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>
                    Chat with Document
                  </CardTitle>
                  <CardDescription>
                    Ask questions about the uploaded file.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea ref={chatContainerRef} className="h-[300px] mb-2 pr-4">
                    <div className="flex flex-col space-y-2">
                      {chatHistory.map((message, index) => (
                        <div
                          key={index}
                          className={cn(
                            'p-3 rounded-lg',
                            message.role === 'user'
                              ? 'bg-secondary text-secondary-foreground self-end'
                              : 'bg-muted text-muted-foreground self-start'
                          )}
                        >
                          <MemoizedMarkdown content={message.content} />
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <p className="text-sm text-muted-foreground">
                            Thinking...
                          </p>
                        </div>
                      )}
                      {!uploadedFile && chatHistory.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Upload a document to start chatting.
                        </p>
                      )}
                      {uploadedFile && chatHistory.length === 0 && !isChatLoading && (
                        <p className="text-sm text-muted-foreground">
                          Ask a question about "{uploadedFile?.name ||
                            'the document'}"
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="sticky bottom-0 pt-2">
                    <div className="flex items-center space-x-2">
                      <Textarea
                        placeholder="Ask me anything about the document..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        ref={textAreaRef}
                        rows={1}
                        className="resize-none flex-1"
                        aria-label="Chat input"
                        disabled={!uploadedFile}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!uploadedFile || isChatLoading}
                      >
                        {isChatLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Upload History</CardTitle>
                  <CardDescription>
                    View and reload recently uploaded files.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {uploadHistory.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          Clear Upload History?
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Are you absolutely sure?</DialogTitle>
                          <DialogDescription>
                            This action cannot be undone. All locally stored
                            file references and content previews will be
                            removed.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="secondary">
                              Cancel
                            </Button>
                          </DialogClose>
                          <Button
                            type="submit"
                            variant="destructive"
                            onClick={clearUploadHistory}
                          >
                            Clear History
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {uploadHistory.length > 0 ? (
                    <div className="grid gap-4">
                      {uploadHistory.map((file) => {
                        const FileIconComponent = getFileIcon(file.name);
                        return (
                          <div
                            key={file.id}
                            className="border rounded-md p-4 flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-4">
                              {React.createElement(FileIconComponent, { className: "inline-block h-4 w-4 mr-2" })}
                              <div>
                                <p className="text-sm font-medium leading-none">
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024).toFixed(1)} KB - Uploaded:{' '}
                                  {new Date(
                                    file.lastModified
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                loadFileFromHistory(file.id);
                              }}
                            >
                              Load
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No upload history found. Upload a file to get started.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>
                    Customize application preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="flex items-center space-x-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="dark-mode">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Toggle between light and dark themes.
                      </p>
                    </div>
                    <Switch
                      id="dark-mode"
                      checked={darkMode}
                      onCheckedChange={setDarkMode}
                      aria-label="Toggle dark mode"
                    />
                  </div>
                  {/* Add more settings here as needed */}
                  {/* Example:
                    
                    
                      Another Setting
                      Value
                    
                     */}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </TooltipProvider>
  );
}

