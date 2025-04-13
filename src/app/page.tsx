'use client';

import {useState, useCallback, useEffect} from 'react';
import {useDropzone} from 'react-dropzone';
import {motion} from 'framer-motion';
import {File, MessageSquare, Upload, Sun, Moon, Settings, Trash2} from 'lucide-react';
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

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([]);
  const {toast} = useToast();

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    document.body.classList.toggle('light', !darkMode);
  }, [darkMode]);

  useEffect(() => {
    const storedHistory = localStorage.getItem('uploadHistory');
    if (storedHistory) {
      setUploadHistory(JSON.parse(storedHistory));
    }
  }, []);

  const saveUploadHistory = (file: UploadedFile) => {
    const newHistory = [file, ...uploadHistory];
    setUploadHistory(newHistory);
    localStorage.setItem('uploadHistory', JSON.stringify(newHistory));
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
        reader.onload = async (e) => {
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
        reader.readAsText(file);
      }
    },
    [toast]
  );

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop});

  const summarizeTheDocument = async (fileContent: string) => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 bg-background/70 backdrop-blur-md z-10 p-4 border-b border-border">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">DuinoLearn AI</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Customize app settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <main className="container mx-auto p-4 flex flex-col lg:flex-row gap-4 flex-1">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="flex justify-center lg:justify-start">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="outline-none">
            <motion.div
              {...getRootProps()}
              className={`dropzone rounded-lg border-2 border-dashed border-accent/50 bg-secondary/50 text-center p-10 cursor-pointer transition-all ${
                isDragActive ? 'border-primary bg-accent/50' : ''
              }`}
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.3}}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-8 w-8 text-accent mb-2" />
              <p>Drag &amp; drop a file here, or click to select files</p>
              {uploadedFile && (
                <motion.div
                  className="mt-4 p-4 rounded-md bg-muted text-sm"
                  initial={{opacity: 0, x: -20}}
                  animate={{opacity: 1, x: 0}}
                  transition={{duration: 0.3}}
                >
                  <File className="inline-block h-4 w-4 mr-2" />
                  {uploadedFile.name}
                </motion.div>
              )}
            </motion.div>

            {summary && (
              <motion.div
                className="mt-4 p-4 rounded-md bg-muted text-sm"
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.3}}
              >
                <h2 className="font-bold mb-2">Summary</h2>
                <p>{summary}</p>
              </motion.div>
            )}

            {uploadedFile && (
              <div className="mt-4">
                <Textarea
                  placeholder="Ask me anything about the document..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  className="mb-2"
                />
                <Button onClick={handleSendMessage} disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send'}
                </Button>

                <div className="mt-4">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`mb-2 p-3 rounded-md ${
                        message.role === 'user' ? 'bg-primary/10 text-right' : 'bg-secondary/10 text-left'
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="outline-none">
            <div className="flex flex-col gap-2">
              {uploadHistory.length > 0 ? (
                uploadHistory.map((file, index) => (
                  <motion.div
                    key={index}
                    className="p-4 rounded-md bg-muted text-sm flex items-center justify-between"
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.3, delay: index * 0.1}}
                  >
                    <div>
                      <File className="inline-block h-4 w-4 mr-2" />
                      {file.name}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(file.lastModified).toLocaleDateString()}
                    </span>
                  </motion.div>
                ))
              ) : (
                <p>No upload history available.</p>
              )}

              {uploadHistory.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear History
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Are you absolutely sure?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete your upload history
                        from our servers.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      
                      <Button variant="secondary" type="button">
                          Cancel
                        </Button>
                       <Button variant="destructive" onClick={clearUploadHistory}>
                          Delete
                        </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="outline-none">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize the look and feel of the app.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dark-mode">Dark Mode</Label>
                    <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="p-4 text-center text-muted-foreground border-t border-border">
        <p>&copy; {new Date().getFullYear()} DuinoLearn. All rights reserved.</p>
      </footer>
    </div>
  );
}


