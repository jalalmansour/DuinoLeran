'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TooltipProvider} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { GPT3Tokenizer } from 'gpt-tokenizer';
import { cn } from '@/lib/utils';
import { MemoizedMarkdown } from '@/app/page'; // Assuming MemoizedMarkdown is in page.tsx
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

interface ChatSectionProps {
  chatHistory: ChatMessage[];
  isChatLoading: boolean;
  uploadedFile: UploadedFile | null;
  onSendMessage: (message: string) => void;
}

const ChatSection: React.FC<ChatSectionProps> = ({
  chatHistory,
  isChatLoading,
  uploadedFile,
  onSendMessage,
}) => {
  const { toast } = useToast();
  const [isTruncated, setIsTruncated] = useState(false);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  const [currentMessage, setCurrentMessage] = useState<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
    const fetchChatHistory = async () => {
        const userId = localStorage.getItem('userId');
        try {
            const response = await fetch('/api/chat-history', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId || '', // Include userId in the headers
                },
            });
            if (response.ok) {
              // ... handle the response
            } else {
                console.error('Error fetching chat history:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };
    fetchChatHistory();
  }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    const tokenizer = new GPT3Tokenizer({ type: 'gpt3' });
    const messageToSend = currentMessage.trim();    
    if (messageToSend) {
        const encoded = tokenizer.encode(messageToSend);
        const tokenCount = encoded.length;
        const MAX_TOKENS = 1000000;
        if (tokenCount > MAX_TOKENS) {
            const truncatedMessage = tokenizer.decode(encoded.slice(0, MAX_TOKENS));
            onSendMessage(truncatedMessage);
            setCurrentMessage('');
            setIsTruncated(true);
            toast({
              title: 'Message Truncated',
              description: 'Your message was too long and has been truncated.',
              variant: 'destructive',
            });
        } else {
            try {
                // Send message to the server
                await onSendMessage(messageToSend);
                setCurrentMessage('');
            } catch (error: any) {
                console.error('Error during API call:', error); // Log the full error for debugging

                let userMessage = 'An error occurred while processing your request. Please try again later.';

                // Check for API key-related errors (adjust conditions as needed)
                if (
                    error.message?.includes('API key') ||
                    error.message?.includes('authentication') ||
                    error.message?.includes('credentials') ||
                    error.response?.status === 401 ||
                    error.response?.status === 403
                ) {
                    console.warn('API key-related error suppressed from UI.');
                } else {
                    userMessage = 'There was a problem communicating with the server. Please try again.';
                }
                toast({
                    title: 'Error',
                    description: userMessage,
                    variant: 'destructive',
                });
            setIsTruncated(false);
        }
      
    }
  };

  return (
    <TooltipProvider>
      <div className="mt-4 w-full">
        <div className="p-6 rounded-lg shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <div className="font-bold text-lg mb-4">Chat with Document</div>
          <div className="text-sm text-muted-foreground mb-4">
            Ask questions about the uploaded file.
          </div>
          <ScrollArea ref={chatContainerRef} className="h-[300px] mb-4 pr-4">
            <div className="flex flex-col space-y-4">
              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'p-4 rounded-lg max-w-[85%] transition-all duration-300 ease-in-out',
                    message.role === 'user'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 self-end'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 self-start'
                  )}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animationName: 'slideIn',
                    animationDuration: '0.5s',
                    animationTimingFunction: 'ease-out',
                    animationFillMode: 'both',
                  }}
                >
                  <MemoizedMarkdown content={message.content} />
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center space-x-2">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              )}
              {!uploadedFile && chatHistory.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Upload a document to start chatting.
                </p>
              )}
              {uploadedFile && chatHistory.length === 0 && !isChatLoading && (
                <p className="text-sm text-muted-foreground">
                  Ask a question about &quot;
                  {uploadedFile?.name || 'the document'}&quot;
                </p>
              )}
            </div>
            {isTruncated && (
              <div className="text-xs text-red-500">
                Message was truncated to fit the maximum length.
              </div>
            )}
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
                className="resize-none flex-1 rounded-full border border-input bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm shadow-md ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Chat input"
                disabled={!uploadedFile}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!uploadedFile || isChatLoading}
                className="rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-md"
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
          </div>
      </div>
    </TooltipProvider>
  );
};

export default ChatSection;