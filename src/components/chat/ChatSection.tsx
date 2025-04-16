// src/components/chat/ChatSection.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, HelpCircle, Copy, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardContent } from '@/components/ui/card'; // Using CardContent for semantic structure and padding
import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// --- Markdown Imports ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';         // Tables, footnotes, strikethrough, task lists, URLs
import remarkMath from 'remark-math';       // Support for math syntax
import rehypeKatex from 'rehype-katex';     // Rendering math with KaTeX
import rehypeRaw from 'rehype-raw';         // Allow rendering raw HTML (use with caution if source isn't trusted)
import 'katex/dist/katex.min.css';          // KaTeX CSS styles

// --- CodeBlock Component (Essential for Syntax Highlighting & Copying Code) ---
// This component ensures code blocks have consistent styling and copy functionality
const CodeBlock: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast(); // Use toast within the hook's provider context
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'plaintext';

    const handleCopyCode = () => {
        const codeString = String(children).replace(/\n$/, '');
        if (codeString) {
            navigator.clipboard.writeText(codeString); setCopied(true);
            toast({ title: "Code Copied!", variant: "success", duration: 1500 });
            setTimeout(() => setCopied(false), 1500);
        } else { toast({ title: "Copy Failed", variant: "warning" }); }
    };

    const codeToRender = String(children).replace(/\n$/, '');

    // Replace <pre> with your syntax highlighter if using one
    return (
        <div className="relative group my-3 text-sm">
            <pre className={cn(
                className,
                // Use card background for contrast, or a specific code block background variable if defined
                'bg-[hsl(var(--card)/0.8)] border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 pr-10 overflow-x-auto scrollbar-thin',
                'shadow-inner'
             )} >
                 {/* Use card-foreground which should contrast with card background */}
                <code className={cn("block font-mono text-[hsl(var(--card-foreground))] opacity-95", `language-${language}`)}>
                    {codeToRender}
                </code>
            </pre>
            {/* Copy button styling adjusted for better contrast if needed */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost" size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]"
                        onClick={handleCopyCode} aria-label={copied ? "Copied code" : "Copy code"} >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                     </Button>
                </TooltipTrigger>
                <TooltipContent side="left"> {copied ? "Copied!" : "Copy code"} </TooltipContent>
            </Tooltip>
        </div>
    );
};
// --- End CodeBlock ---

// --- Interfaces ---
interface UploadedFile { id: string; name: string; type: string; size: number; lastModified: number; content: any; contentType: 'document' | 'presentation' | 'code' | 'audio' | 'video' | 'book' | 'archive' | 'list' | 'metadata' | 'image' | 'error' | 'other'; }
interface ChatMessage { role: 'user' | 'assistant'; content: string; }
interface ChatSectionProps { chatHistory: ChatMessage[]; isChatLoading: boolean; uploadedFile: UploadedFile | null; onSendMessage: (message: string) => Promise<void>; }

// --- Preprocessing Function ---
// Simple function to handle the specific textcolor format
const cleanLatexColors = (text: string): string => {
    // Regex to find $$ \textcolor{color}{content} $$
    // Making it slightly more robust to handle potential whitespace variations
    const regex = /\$\$\s*\\textcolor\s*\{([^}]+)\}\s*\{([^}]+)\}\s*\$\$/g;
    // Replace with Markdown bold **content**
    return text.replace(regex, '**$2**');
};

// --- Memoized ChatMessageItem ---
const MemoizedChatMessageItem = React.memo(({ message, renderMarkdown }: { message: ChatMessage, renderMarkdown: (content: string) => JSX.Element }) => {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleCopyMessage = () => {
        if (!message.content) return;
        // Clean the text *before* copying to avoid copying the raw command
        const textToCopy = cleanLatexColors(message.content);
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        toast({ title: "Copied to Clipboard!", variant: "success", duration: 1500 });
        setTimeout(() => setCopied(false), 1500);
    };

    const textColorClass = message.role === 'user' ? 'text-[hsl(var(--foreground))]' : 'text-[hsl(var(--card-foreground))]';
    // Clean the content BEFORE passing to renderMarkdown
    const cleanedContent = cleanLatexColors(message.content);

    return (
        // Add dir="auto" for LTR/RTL handling
        <div dir="auto" className={cn('chat-bubble group relative', message.role === 'user' ? 'user-bubble' : 'ai-bubble', textColorClass )}>
            {/* Render the cleaned content */}
            {renderMarkdown(cleanedContent)}
            {/* Copy Button */}
            {message.role === 'assistant' && !message.content.startsWith("*Error:") && message.content.length > 0 && (
                 <Tooltip>
                     <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="absolute top-0 right-0 mt-1 mr-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-200 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] scale-90 group-hover:scale-100 z-10" onClick={handleCopyMessage} aria-label={copied ? "Copied" : "Copy response"}>
                             {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                         </Button>
                     </TooltipTrigger>
                     <TooltipContent side="top">{copied ? "Copied!" : "Copy response"}</TooltipContent>
                 </Tooltip>
             )}
        </div>
    );
});
MemoizedChatMessageItem.displayName = 'MemoizedChatMessageItem';
// --- End MemoizedChatMessageItem ---


// --- ChatSection Component ---
const ChatSection: React.FC<ChatSectionProps> = ({
  chatHistory = [], // Default prop
  isChatLoading,
  uploadedFile,
  onSendMessage,
}) => {
  const { toast } = useToast();
  const [isTruncated, setIsTruncated] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for ScrollArea viewport
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom effect
  useEffect(() => {
    const viewport = scrollAreaRef.current;
    if (viewport) {
      // Use requestAnimationFrame for smoother scroll after render
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [chatHistory, isChatLoading]); // Trigger on new messages or loading change

  // Adjust textarea height effect
   useEffect(() => {
       if (textAreaRef.current) {
           textAreaRef.current.style.height = 'auto'; // Reset height to calculate scrollHeight correctly
           const scrollHeight = textAreaRef.current.scrollHeight;
           // Set height based on content, clamped by min/max styles
           textAreaRef.current.style.height = `${scrollHeight}px`;
       }
   }, [currentMessage]); // Re-run when message content changes

  // Keydown handler for Enter key
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isChatLoading) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Send message handler (calls parent function)
  const handleSendMessage = async () => {
    const messageToSend = currentMessage.trim();
    if (!messageToSend || isChatLoading || !uploadedFile) return;
    setIsTruncated(false); // Reset warning

    // Simplified length check
    const MAX_LENGTH_APPROX = 4000; // Adjust if needed
    let finalMessage = messageToSend;
    if (messageToSend.length > MAX_LENGTH_APPROX) {
        finalMessage = messageToSend.substring(0, MAX_LENGTH_APPROX);
        setIsTruncated(true);
        toast({ title: 'Message Shortened', description: 'Message may be shortened due to length.', variant: 'warning' });
    }

    setCurrentMessage(''); // Clear input immediately
    try {
      await onSendMessage(finalMessage); // Call the actual API handler passed from parent
      setCurrentMessage(''); // Clear again in case of typing during async call
      requestAnimationFrame(() => { textAreaRef.current?.focus(); }); // Refocus input
    } catch (error) {
      // Parent's handleSendMessage callback is responsible for UI error feedback (toast/message)
      console.error('Error occurred during onSendMessage prop call:', error);
    }
  };

  // --- Markdown Rendering Function ---
  // Sets up ReactMarkdown with desired plugins and component overrides
  const renderMarkdown = useCallback((content: string) => {
      return (
        // Base prose styling controlled by globals.css theme variables
        <div className={cn(
            "prose prose-sm dark:prose-invert max-w-none break-words",
            "prose-p:my-1 prose-li:my-0.5", // Fine-tune spacing
            "prose-headings:text-[hsl(var(--primary))]",
            "prose-a:text-[hsl(var(--accent))] prose-a:underline hover:prose-a:opacity-80",
            "prose-strong:text-[hsl(var(--foreground))]",
            "prose-blockquote:border-l-[hsl(var(--border))] prose-blockquote:text-[hsl(var(--muted-foreground))]",
            "prose-table:border-[hsl(var(--border))] prose-th:border-[hsl(var(--border))] prose-td:border-[hsl(var(--border))]",
            "prose-hr:border-[hsl(var(--border)/0.5)]",
            "prose-code:text-[hsl(var(--card-foreground))/90]", // Inline code text
            "prose-code:bg-[hsl(var(--muted)/0.3)]",          // Inline code background
            "prose-code:font-mono prose-code:text-xs prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm", // Inline code styling
            "prose-pre:bg-transparent prose-pre:p-0", // Reset pre if CodeBlock handles background
            // Base text color inherited from MemoizedChatMessageItem's textColorClass
        )}>
            <ReactMarkdown
                children={content}
                remarkPlugins={[remarkGfm, remarkMath]} // Enable GFM (tables, etc.), Math
                rehypePlugins={[rehypeKatex, rehypeRaw]} // Render Math, Allow Raw HTML (use with caution)
                components={{
                  // --- Component Overrides ---
                  code({ node, inline, className, children, ...props }) {
                    if (inline || !String(children).includes('\n')) {
                      // Inline code uses prose-code styles
                      return <code className={cn(className, "before:content-none after:content-none")} {...props}>{children}</code>;
                    }
                    // Block code uses the custom CodeBlock component
                    return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
                  },
                   // Ensure tables are responsive and styled
                   table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table className="w-full" {...props} /></div>,
                   th: ({ node, ...props }) => <th className="border border-[hsl(var(--border))] px-2 py-1 text-left font-semibold text-[hsl(var(--foreground))]" {...props} />,
                   td: ({ node, ...props }) => <td className="border border-[hsl(var(--border))] px-2 py-1" {...props} />,
                   // Style links for clarity
                   a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
                }}
            />
        </div>
      );
  }, []); // Empty dependency array assumes CodeBlock is stable


  return (
    // TooltipProvider needed for copy buttons and send button tooltip
    <TooltipProvider>
        {/* Chat History Area - Flex-1 makes it grow, overflow-hidden prevents breaking layout */}
        <CardContent className="flex-1 overflow-hidden p-0">
            {/* ScrollArea fills its container (CardContent) */}
            <ScrollArea className="h-full p-4" viewportRef={scrollAreaRef}> {/* Use h-full */}
                <div className="flex flex-col space-y-3 pr-1">
                    {/* Message Mapping */}
                    {Array.isArray(chatHistory) && chatHistory.map((message, index) => (
                        <MemoizedChatMessageItem key={message.content + index} message={message} renderMarkdown={renderMarkdown} /> // Added index to key for potential duplicate messages
                    ))}
                    {/* Loading Indicator */}
                    {isChatLoading && (
                        <div className="flex items-center space-x-2 self-start text-[hsl(var(--secondary))] p-3 ai-bubble !bg-transparent !border-none !shadow-none">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-mono animate-pulse tracking-wider">AI thinking...</span>
                        </div>
                    )}
                    {/* Initial State Messages */}
                    {!uploadedFile && (!chatHistory || chatHistory.length === 0) && (
                         <div className="flex items-center justify-center text-sm text-center text-[hsl(var(--muted-foreground))] italic py-6 px-2">
                             <HelpCircle className="w-4 h-4 mr-2 shrink-0"/> Upload a document to enable the chat.
                         </div>
                     )}
                     {uploadedFile && (!chatHistory || chatHistory.length === 0) && !isChatLoading && (
                         <div className="flex items-center justify-center text-sm text-center text-[hsl(var(--muted-foreground))] italic py-6 px-2">
                             <HelpCircle className="w-4 h-4 mr-2 shrink-0"/> Ask a question about "{uploadedFile.name}" below.
                         </div>
                     )}
                </div>
            </ScrollArea>
            {/* Truncation Warning */}
            {isTruncated && ( <p className="text-xs text-yellow-500/80 px-4 py-1 border-t border-[hsl(var(--border)/0.3)]"> Note: Your last message might have been shortened. </p> )}
        </CardContent>

        {/* Input Area Footer - flex-shrink-0 prevents it from shrinking */}
        <div className="p-3 border-t border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.8)] backdrop-blur-sm flex-shrink-0">
            <div className="flex items-end space-x-2">
                <Textarea
                    ref={textAreaRef} value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} onKeyDown={handleKeyDown}
                    rows={1}
                    className={cn( "flex-1 resize-none rounded-lg border px-3 py-2 text-sm", "bg-[hsl(var(--input))] text-[hsl(var(--input-foreground))] border-[hsl(var(--border))]", "focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--ring))] focus:outline-none", "min-h-[40px] max-h-[120px] scrollbar-thin" )} // scrollbar-thin added
                    placeholder={uploadedFile ? `Ask about ${uploadedFile.name}...` : "Upload a file first..."} aria-label="Chat input"
                    disabled={!uploadedFile || isChatLoading}
                />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleSendMessage} disabled={!currentMessage.trim() || isChatLoading || !uploadedFile} aria-label="Send message">
                            {isChatLoading ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <Send className="h-4 w-4" /> )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Send Message</TooltipContent>
                </Tooltip>
            </div>
        </div>
    </TooltipProvider>
  );
};

export default ChatSection;