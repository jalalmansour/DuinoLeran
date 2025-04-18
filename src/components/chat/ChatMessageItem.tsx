// src/components/chat/ChatMessageItem.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Import the hook directly

// --- Markdown Imports (Ensure these are available) ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css'; // Ensure KaTeX CSS is imported globally or here

// --- CodeBlock (Use the definition from ChatSection or a shared location) ---
const CodeBlock: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
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

    // Replace <pre> with your actual syntax highlighter if needed
    return (
        <div className="relative group my-3 text-sm">
            <pre className={cn( className, 'bg-[hsl(var(--card)/0.8)] border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 pr-10 overflow-x-auto scrollbar-thin', 'shadow-inner' )} >
                <code className={cn("block font-mono text-[hsl(var(--card-foreground))] opacity-95", `language-${language}`)}>
                    {codeToRender}
                </code>
            </pre>
            <Tooltip>
                <TooltipTrigger asChild>
                    <ShadcnButton variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)]" onClick={handleCopyCode} aria-label={copied ? "Copied code" : "Copy code"} >
                        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                     </ShadcnButton>
                </TooltipTrigger>
                <TooltipContent side="left"> {copied ? "Copied!" : "Copy code"} </TooltipContent>
            </Tooltip>
        </div>
    );
};
// --- End CodeBlock ---


// --- CleanLatex Helper ---
const cleanLatexColors = (text: string): string => {
    const regex = /\$\$\s*\\textcolor\s*\{([^}]+)\}\s*\{([^}]+)\}\s*\$\$/g;
    return text.replace(regex, '**$2**');
};
// --- End CleanLatex ---


// --- MemoizedMarkdown (Shared component used for rendering) ---
const MemoizedMarkdown = React.memo(({ content }: { content: string }) => (
    <div className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        "prose-p:my-1 prose-li:my-0.5",
        "prose-headings:text-[hsl(var(--primary))]",
        "prose-a:text-[hsl(var(--accent))] prose-a:underline hover:prose-a:opacity-80",
        "prose-strong:text-[hsl(var(--foreground))]",
        "prose-blockquote:border-l-[hsl(var(--border))] prose-blockquote:text-[hsl(var(--muted-foreground))]",
        "prose-table:border-[hsl(var(--border))] prose-th:border-[hsl(var(--border))] prose-td:border-[hsl(var(--border))]",
        "prose-hr:border-[hsl(var(--border)/0.5)]",
        "prose-code:text-[hsl(var(--card-foreground))/90] prose-code:bg-[hsl(var(--muted)/0.3)] prose-code:font-mono prose-code:text-xs prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm",
        "prose-pre:bg-transparent prose-pre:p-0",
        "text-[hsl(var(--foreground))]" // Default text color for assistant bubbles (overridden for user)
    )}>
        <ReactMarkdown
            children={content} // Use the cleaned content passed as prop
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={{
                code({ node, inline, className, children, ...props }) {
                    if (inline || !String(children).includes('\n')) {
                        return <code className={cn(className, "before:content-none after:content-none")} {...props}>{children}</code>;
                    }
                    return <CodeBlock className={className} {...props}>{children}</CodeBlock>;
                },
                table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table className="w-full" {...props} /></div>,
                th: ({ node, ...props }) => <th className="border border-[hsl(var(--border))] px-2 py-1 text-left font-semibold text-[hsl(var(--foreground))]" {...props} />,
                td: ({ node, ...props }) => <td className="border border-[hsl(var(--border))] px-2 py-1" {...props} />,
                a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
            }}
        />
    </div>
));
MemoizedMarkdown.displayName = 'MemoizedMarkdown';
// --- End MemoizedMarkdown ---


interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageItemProps {
  message: ChatMessage;
  // toast function is used internally by CodeBlock and copy button now
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({ message }) => {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast(); // Use toast hook here

    const handleCopyMessage = () => {
        if (!message.content) return;
        const textToCopy = cleanLatexColors(message.content); // Clean before copying
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        toast({ title: "Copied to Clipboard!", variant: "success", duration: 1500 });
        setTimeout(() => setCopied(false), 1500);
    };

    const isUser = message.role === 'user';
    const cleanedContent = cleanLatexColors(message.content); // Clean once

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20, duration: 0.3, delay: 0.05 }}
            className={cn(
                'chat-bubble group relative',
                isUser ? 'user-bubble' : 'ai-bubble'
            )}
            dir="auto" // Handle LTR/RTL
        >
            {/* Use MemoizedMarkdown and pass cleaned content */}
            {/* Apply specific text color for user messages */}
            <div className={cn(isUser ? "text-[hsl(var(--foreground))]" : "")}>
                <MemoizedMarkdown content={cleanedContent} />
            </div>

            {/* Copy Button - only for non-error assistant messages */}
            {message.role === 'assistant' && !message.content.startsWith("*Error:") && !message.content.startsWith("*System Error:") && !message.content.startsWith("*Assistant Response Blocked:") && message.content.length > 0 && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <ShadcnButton
                            variant="ghost" size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-200 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.1)] scale-90 group-hover:scale-100 z-10"
                            onClick={handleCopyMessage}
                            aria-label={copied ? "Copied" : "Copy response"}
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </ShadcnButton>
                    </TooltipTrigger>
                    <TooltipContent side="top">{copied ? "Copied!" : "Copy response"}</TooltipContent>
                </Tooltip>
            )}
        </motion.div>
    );
});

ChatMessageItem.displayName = 'ChatMessageItem';
