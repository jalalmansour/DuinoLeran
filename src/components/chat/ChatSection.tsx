// src/components/chat/ChatSection.tsx

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, HelpCircle, Copy, Check } from 'lucide-react'; // Added Copy, Check
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent // Import Card components
} from '@/components/ui/card';
import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import GPT3Tokenizer from 'gpt-tokenizer'; // Consider dynamic import if large
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

// Assume CodeBlock is defined or imported if needed by renderMarkdown
// Example placeholder:
const CodeBlock: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
    <pre className={cn(className, 'bg-gray-800 dark:bg-gray-900 rounded p-3 my-3 overflow-x-auto')}>
        <code className="text-sm">{children}</code>
    </pre>
);


interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string; // Content might be text, list, metadata etc.
  contentType: 'text' | 'list' | 'metadata' | 'image' | 'error' | 'other';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSectionProps {
  chatHistory: ChatMessage[];
  isChatLoading: boolean;
  uploadedFile: UploadedFile | null;
  onSendMessage: (message: string) => Promise<void>; // Expecting async
}

// --- Memoized ChatMessageItem (extracted for clarity) ---
const MemoizedChatMessageItem = React.memo(({ message, renderMarkdown }: { message: ChatMessage, renderMarkdown: (content: string) => JSX.Element }) => {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast(); // useToast needs TooltipProvider wrapper

    const handleCopy = () => {
        if (!message.content) return;
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        toast({ title: "Copied!", variant: "success", duration: 1500 });
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className={cn('chat-bubble group relative', message.role === 'user' ? 'user-bubble' : 'ai-bubble')}>
            {renderMarkdown(message.content)}
            {message.role === 'assistant' && !message.content.startsWith("Error:") && message.content.length > 0 && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span>
                            <Button
                                variant="ghost" size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-200 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] scale-75 group-hover:scale-100 z-10"
                                onClick={handleCopy} aria-label={copied ? "Copied" : "Copy response"}
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">{copied ? "Copied!" : "Copy response"}</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
});
MemoizedChatMessageItem.displayName = 'MemoizedChatMessageItem';
// --- End MemoizedChatMessageItem ---

const ChatSection: React.FC<ChatSectionProps> = ({
  chatHistory,
  isChatLoading,
  uploadedFile,
  onSendMessage,
}) => {
  const { toast } = useToast();
  const [isTruncated, setIsTruncated] = useState(false); // Keep track if last sent message was truncated
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for the ScrollArea viewport
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom effect
  useEffect(() => {
    const viewport = scrollAreaRef.current;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTop = viewport.scrollHeight;
      });
    }
  }, [chatHistory, isChatLoading]); // Trigger on new messages or loading state

  // Adjust textarea height effect
   useEffect(() => {
       if (textAreaRef.current) {
           textAreaRef.current.style.height = 'auto'; // Reset height
           const scrollHeight = textAreaRef.current.scrollHeight;
           // Set height based on content, up to a max (e.g., 120px)
           textAreaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
       }
   }, [currentMessage]);


  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isChatLoading) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    const messageToSend = currentMessage.trim();
    if (!messageToSend || isChatLoading || !uploadedFile) return; // Basic guards

    // Reset truncation state for new message
    setIsTruncated(false);

    // Basic token check placeholder (replace with actual tokenizer if needed)
    // const tokenizer = new GPT3Tokenizer({ type: 'gpt3' }); // Costly init, consider alternatives
    const approxTokenCount = messageToSend.length / 4; // Very rough estimate
    const MAX_APPROX_TOKENS = 1000; // Example limit

    let finalMessage = messageToSend;

    if (approxTokenCount > MAX_APPROX_TOKENS) {
        // Simple truncation for example
        finalMessage = messageToSend.substring(0, MAX_APPROX_TOKENS * 4); // Adjust logic as needed
        setIsTruncated(true); // Set truncation state
        toast({
          title: 'Message May Be Truncated',
          description: 'Your message might be too long and could be truncated by the AI.',
          variant: 'warning', // Use warning instead of destructive
        });
    }

    setCurrentMessage(''); // Clear input immediately

    try {
      await onSendMessage(finalMessage); // Send the (potentially truncated) message
      // Clear input again in case user typed during async call
       setCurrentMessage('');
       // Refocus textarea after sending
       requestAnimationFrame(() => { textAreaRef.current?.focus(); });

    } catch (error: any) {
        console.error('Error calling onSendMessage:', error);
        // Basic error handling (onSendMessage should ideally handle its own UI feedback)
        toast({
          title: 'Error Sending Message',
          description: error.message || 'Could not send message.',
          variant: 'destructive',
        });
        // Optionally restore the message if sending failed?
        // setCurrentMessage(messageToSend);
    }
  };

  // --- renderMarkdown (ensure it uses themed components/styles) ---
  const renderMarkdown = useCallback((content: string) => {
      // Using MemoizedMarkdown defined in page.tsx for consistency
      // Ensure MemoizedMarkdown is correctly passed or imported if ChatSection is moved
      // For now, let's use a basic themed structure
      return (
        <div className={cn(
            "prose prose-sm dark:prose-invert max-w-none break-words",
            "prose-p:my-1 prose-li:my-0.5",
            // Add other themed styles from page.tsx MemoizedMarkdown if needed
            "text-[hsl(var(--foreground))]" // Ensure base text color
        )}>
            <ReactMarkdown
                children={content}
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{ // Use themed code block
                    code({ node, inline, className, children, ...props }) {
                        if (inline || !String(children).includes('\n')) {
                            return <code className={cn(className, "prose-code before:content-none after:content-none")} {...props}>{children}</code>;
                        }
                        return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
                    },
                    // Add other overrides if necessary
                }}
            />
        </div>
      );
  }, []); // Empty dependency array if CodeBlock is stable


  return (
    // Wrap component in TooltipProvider if Tooltips are used inside (like in MemoizedChatMessageItem)
    <TooltipProvider>
        {/* Use Card as the main container */}
        <Card className="h-full flex flex-col overflow-hidden glassmorphism"> {/* Added glassmorphism */}
            {/* Card Header */}
            <CardHeader className="border-b border-[hsl(var(--border)/0.5)] py-3 px-4">
                {/* Wrap text in appropriate tags */}
                <CardTitle className="text-base font-semibold text-[hsl(var(--primary))]">
                    Chat with Document
                </CardTitle>
                <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                    Ask questions about {uploadedFile ? `"${uploadedFile.name}"` : "the uploaded file"}.
                </CardDescription>
            </CardHeader>

            {/* Card Content - Scrollable Chat Area */}
            <CardContent className="flex-1 overflow-hidden p-0">
                {/* Use ScrollArea for the chat history */}
                <ScrollArea className="h-full p-4" viewportRef={scrollAreaRef}> {/* Assign ref to viewport */}
                    <div className="flex flex-col space-y-3 pr-1"> {/* Chat messages container */}
                        {chatHistory.map((message, index) => (
                            <MemoizedChatMessageItem key={index} message={message} renderMarkdown={renderMarkdown} />
                        ))}

                        {/* Loading Indicator */}
                        {isChatLoading && (
                            <div className="flex items-center space-x-2 self-start text-[hsl(var(--secondary))] p-3 ai-bubble !bg-transparent !border-none !shadow-none">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-mono animate-pulse tracking-wider">AI thinking...</span>
                            </div>
                        )}

                        {/* Initial state messages */}
                        {!uploadedFile && chatHistory.length === 0 && (
                            <div className="flex items-center justify-center text-sm text-center text-[hsl(var(--muted-foreground))] italic py-6">
                                <HelpCircle className="w-4 h-4 mr-2"/> Upload a document to start chatting.
                            </div>
                        )}
                        {uploadedFile && chatHistory.length === 0 && !isChatLoading && (
                            <div className="flex items-center justify-center text-sm text-center text-[hsl(var(--muted-foreground))] italic py-6">
                                <HelpCircle className="w-4 h-4 mr-2"/> Ask a question about "{uploadedFile.name}" below.
                            </div>
                        )}
                    </div>
                </ScrollArea>
                {/* Show truncation warning if applicable */}
                 {isTruncated && (
                    <p className="text-xs text-yellow-500/80 px-4 py-1 border-t border-[hsl(var(--border)/0.3)]">
                        Note: Your last message might have been shortened due to length limits.
                    </p>
                 )}
            </CardContent>

            {/* Card Footer - Input Area */}
            <div className="p-3 border-t border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.8)] backdrop-blur-sm">
                <div className="flex items-end space-x-2">
                    <Textarea
                        ref={textAreaRef}
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        className={cn(
                            "flex-1 resize-none rounded-lg border px-3 py-2 text-sm", // Adjusted padding/rounding
                            "bg-[hsl(var(--input))] text-[hsl(var(--input-foreground))] border-[hsl(var(--border))]",
                            "focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--ring))] focus:outline-none",
                             "min-h-[40px] max-h-[120px] scrollbar-thin" // Allow scrolling within textarea
                        )}
                        placeholder={uploadedFile ? `Ask about ${uploadedFile.name}...` : "Upload a file first..."}
                        aria-label="Chat input"
                        disabled={!uploadedFile || isChatLoading} // Disable if no file or loading
                    />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* Span needed for tooltip on disabled button */}
                            <span>
                                <Button
                                    size="icon"
                                    className="h-9 w-9 flex-shrink-0" // Match textarea height
                                    onClick={handleSendMessage}
                                    disabled={!currentMessage.trim() || isChatLoading || !uploadedFile}
                                    aria-label="Send message"
                                >
                                    {isChatLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">Send Message</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </Card>
    </TooltipProvider>
  );
};

export default ChatSection;