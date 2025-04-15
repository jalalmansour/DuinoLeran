// src/components/chat/ChatMessageItem.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Import the hook directly

// --- IMPORTANT: Ensure MemoizedMarkdown is handled correctly ---
// Option 1: Import it if it's in a separate file
// import { MemoizedMarkdown } from './MemoizedMarkdown'; // Adjust path as needed

// Option 2: If defined in page.tsx, ensure it's passed down as a prop
//           and modify the component signature to accept it.

// Option 3: Define it here (less ideal if used elsewhere)
// Example placeholder definition (replace with your actual themed component)
const MemoizedMarkdown = React.memo(({ content, isUser }: { content: string, isUser?: boolean }) => (
    <div className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        // Add your specific themed prose classes here from page.tsx
        "prose-p:my-1 prose-li:my-0.5",
        "prose-headings:font-display prose-headings:text-[hsl(var(--primary))]",
        "prose-a:text-[hsl(var(--accent))] prose-a:underline hover:prose-a:opacity-80",
        "prose-strong:text-[hsl(var(--foreground))]",
        "prose-code:bg-[hsl(var(--muted)/0.3)] prose-code:text-[hsl(var(--muted-foreground))] prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:text-xs prose-code:font-mono before:content-none after:content-none", // Inline code
        "prose-blockquote:border-l-[hsl(var(--border))] prose-blockquote:text-[hsl(var(--muted-foreground))]",
        "prose-table:border-[hsl(var(--border))] prose-th:border-[hsl(var(--border))] prose-td:border-[hsl(var(--border))]",
        "text-[hsl(var(--foreground))]" // Default text color
    )}>
        {/* Basic rendering for placeholder - REPLACE with ReactMarkdown */}
        <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
        {/* OR use the actual ReactMarkdown component */}
        {/* <ReactMarkdown remarkPlugins={[...]} rehypePlugins={[...]} components={{...}}>{content}</ReactMarkdown> */}
    </div>
));
MemoizedMarkdown.displayName = 'MemoizedMarkdown';
// --- End MemoizedMarkdown Handling ---


// Define the message type (can also be imported from a shared types file)
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Define props for the component
interface ChatMessageItemProps {
  message: ChatMessage;
  // Use the correctly derived type for the toast function prop
  toast: ReturnType<typeof useToast>['toast'];
  // Optionally pass MemoizedMarkdown component if defined elsewhere:
  // MarkdownComponent?: React.FC<{ content: string, isUser?: boolean }>;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({
    message,
    toast,
    // MarkdownComponent = MemoizedMarkdown // Default to locally defined/imported one
 }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!message.content) return;
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        toast({ title: "Copied!", variant: "success", duration: 1500 });
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <motion.div
            layout // Animate layout changes
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20, duration: 0.3, delay: 0.05 }}
            className={cn(
                'chat-bubble group relative', // Base class + relative positioning context
                message.role === 'user' ? 'user-bubble' : 'ai-bubble' // Theme-aware classes from globals.css
            )}
        >
            {/* Render the markdown content using the designated component */}
            {/* <MarkdownComponent content={message.content} isUser={message.role === 'user'} /> */}
            {/* Using the locally defined/imported one for this example: */}
            <MemoizedMarkdown content={message.content} isUser={message.role === 'user'} />

            {/* Copy Button - only for non-error assistant messages */}
            {message.role === 'assistant' && !message.content.startsWith("Error:") && message.content.length > 0 && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span> {/* Span helps with tooltip on disabled/complex elements */}
                            <ShadcnButton
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-200 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] scale-75 group-hover:scale-100 z-10" // Ensure button is above content
                                onClick={handleCopy}
                                aria-label={copied ? "Copied AI response" : "Copy AI response"}
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </ShadcnButton>
                        </span>
                    </TooltipTrigger>
                    {/* Tooltip uses theme styles from globals.css */}
                    <TooltipContent side="top">
                        {copied ? "Copied!" : "Copy response"}
                    </TooltipContent>
                </Tooltip>
            )}
        </motion.div>
    );
});

ChatMessageItem.displayName = 'ChatMessageItem'; // Add display name for DevTools