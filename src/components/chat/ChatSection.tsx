'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import GPT3Tokenizer from 'gpt-tokenizer';
import { cn } from '@/lib/utils';
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
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

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
          await onSendMessage(messageToSend);
          setCurrentMessage('');
        } catch (error: any) {
          console.error('Error during API call:', error);

          let userMessage = 'An error occurred while processing your request. Please try again later.';

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

    }
  };

  const renderMarkdown = useCallback((content: string) => {
    return (
      <ReactMarkdown
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
        className="prose prose-sm dark:prose-invert max-w-none"
      />
    );
  }, []);


  return (
    
      
        
          
            
              Chat with Document
            
            
              Ask questions about the uploaded file.
            
            
              {chatHistory.map((message, index) => (
                
                  {renderMarkdown(message.content)}
                
              ))}
              {isChatLoading && (
                
                  
                    Thinking...
                  
                
              )}
              {!uploadedFile && chatHistory.length === 0 && (
                
                  Upload a document to start chatting.
                
              )}
              {uploadedFile && chatHistory.length === 0 && !isChatLoading && (
                
                  Ask a question about &quot;
                  {uploadedFile?.name || 'the document'}&quot;
                
              )}
            
            {isTruncated && (
              
                Message was truncated to fit the maximum length.
              
            )}
          
          
            
              
                Ask me anything about the document...
                {handleKeyDown}
                ref={textAreaRef}
                rows={1}
                className="resize-none flex-1 rounded-full border border-input bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm shadow-md ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Chat input"
                disabled={!uploadedFile}
              />
              
                {isChatLoading ? (
                  
                    
                  
                ) : (
                  
                    
                  
                )}
                Send
              
              
            
          
        
      
    
  );
};

export default ChatSection;
