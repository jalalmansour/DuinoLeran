// src/components/chat/ChatSection.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, HelpCircle, Copy, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardContent } from '@/components/ui/card';
import {
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ChatMessageItem } from './ChatMessageItem'; // Import the item component

// Interfaces (ensure consistency)
interface UploadedFile { id: string; name: string; type: string; size: number; lastModified: number; content: any; contentType: string; }
interface ChatMessage { role: 'user' | 'assistant'; content: string; }
interface ChatSectionProps { chatHistory: ChatMessage[]; isChatLoading: boolean; uploadedFile: UploadedFile | null; onSendMessage: (message: string) => Promise<void>; }

const ChatSection: React.FC<ChatSectionProps> = ({
  chatHistory = [],
  isChatLoading,
  uploadedFile,
  onSendMessage,
}) => {
  const { toast } = useToast();
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom effect
  useEffect(() => {
    const viewport = scrollAreaRef.current;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [chatHistory, isChatLoading]);

  // Adjust textarea height effect
   useEffect(() => {
       if (textAreaRef.current) {
           textAreaRef.current.style.height = 'auto';
           const scrollHeight = textAreaRef.current.scrollHeight;
           // Apply clamped height based on CSS min/max-height
           const currentHeight = parseInt(window.getComputedStyle(textAreaRef.current).height, 10);
           const maxHeight = parseInt(window.getComputedStyle(textAreaRef.current).maxHeight, 10) || Infinity;
           textAreaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
       }
   }, [currentMessage]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isChatLoading) {
      event.preventDefault();
      handleSendMessageInternal(); // Use internal wrapper
    }
  };

  // Internal send message handler to manage state and call parent prop
  const handleSendMessageInternal = async () => {
    const messageToSend = currentMessage.trim();
    if (!messageToSend || isChatLoading || !uploadedFile) return;

    // Clear input immediately
    setCurrentMessage('');
    // Reset textarea height briefly to allow it to shrink if needed
     if (textAreaRef.current) { textAreaRef.current.style.height = 'auto'; }


    try {
      await onSendMessage(messageToSend); // Call parent's handler
       // Refocus input after send attempt (success or fail)
      requestAnimationFrame(() => { textAreaRef.current?.focus(); });
    } catch (error) {
      // Parent should handle the toast/UI for the error
      console.error('Error during onSendMessage prop call:', error);
        // Optionally add a generic error message here if parent doesn't always
        // toast({ title: "Send Error", description: "Could not send message.", variant: "destructive" });
    }
  };

  // --- Markdown Rendering Function (Reused from ChatMessageItem context) ---
   // This function setup can be simplified if the logic is identical to the one in MemoizedChatMessageItem
   // However, keeping it separate allows potential future customization for this specific context.
   // Ensure CodeBlock is accessible here (imported or defined).
  const renderMarkdown = useCallback((content: string) => {
      // Reuse the MemoizedMarkdown component defined in ChatMessageItem or shared location
       // Make sure it's correctly imported or passed down if needed.
       // For this example, assuming MemoizedMarkdown is available in scope
      return <ChatMessageItem.MemoizedMarkdown content={content} />;
  }, []);


  return (
    <TooltipProvider>
        <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-4" viewportRef={scrollAreaRef}>
                <div className="flex flex-col space-y-3 pr-1">
                    {Array.isArray(chatHistory) && chatHistory.map((message, index) => (
                        // Use the imported ChatMessageItem component directly
                        <ChatMessageItem key={`${message.role}-${index}-${message.content.slice(0,10)}`} message={message} />
                    ))}
                    {isChatLoading && (
                        <div className="flex items-center space-x-2 self-start text-[hsl(var(--secondary))] p-3 ai-bubble !bg-transparent !border-none !shadow-none">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-mono animate-pulse tracking-wider">AI thinking...</span>
                        </div>
                    )}
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
        </CardContent>

        <div className="p-3 border-t border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.8)] backdrop-blur-sm flex-shrink-0">
            <div className="flex items-end space-x-2">
                <Textarea
                    ref={textAreaRef} value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} onKeyDown={handleKeyDown}
                    rows={1}
                    className={cn( "flex-1 resize-none rounded-lg border px-3 py-2 text-sm", "bg-[hsl(var(--input))] text-[hsl(var(--input-foreground))] border-[hsl(var(--border))]", "focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--ring))] focus:outline-none", "min-h-[40px] max-h-[120px] scrollbar-thin" )} // Added min/max height and scrollbar
                    placeholder={uploadedFile ? `Ask about ${uploadedFile.name}...` : "Upload a file first..."} aria-label="Chat input"
                    disabled={!uploadedFile || isChatLoading}
                />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleSendMessageInternal} disabled={!currentMessage.trim() || isChatLoading || !uploadedFile} aria-label="Send message">
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
