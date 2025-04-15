// src/app/page.tsx
'use client';

// --- Core React & Next.js ---
import React, { useState, useCallback, useEffect, useRef } from 'react';

// --- Libraries ---
import { useDropzone, FileRejection } from 'react-dropzone';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; // Correct slim path
import * as pdfjsLib from 'pdfjs-dist'; // Import pdfjs directly
import mammoth from 'mammoth'; // For .docx processing
import JSZip from 'jszip';     // For .zip archive handling
import jsmediatags from 'jsmediatags'; // For reading media file tags

// --- UI Components (Shadcn/ui & Custom) ---
import { Button as ShadcnButton } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
// import { Switch } from '@/components/ui/switch'; // Keep if used elsewhere
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import Footer from '../components/footer';
import FAQPage from './faq';
import { ChatMessageItem } from '@/components/chat/ChatMessageItem'; // Import ChatMessageItem

// --- Icons ---
import {
  File as FileIconLucide, Upload, ImageIcon, Code, BookOpen, Loader2, Send,
  ChevronDown, Trophy, Download, Wand2, Rocket, X, Moon, Sun, Palette,
  Settings as SettingsIcon,
  MessageSquare, Copy, Check, HelpCircle,
  Sparkles,
  FileText,       // More specific icon for text/docx
  FileArchive,    // Icon for zip/archives
  Music,          // Icon for audio
  VideoIcon,      // Icon for video
  Presentation,   // Icon for pptx/ppt
  FileSpreadsheet,// Icon for xlsx/xls
  FileCode        // Generic icon for code files
} from 'lucide-react';

// --- Utilities & Hooks ---
import { cn } from '@/lib/utils';
import { useToast, type UseToast } from '@/hooks/use-toast'; // Import UseToast type if passing toast func
import { useThemeStore, themes, useHasHydrated, type ThemeId } from '@/hooks/useThemeStore';

// --- AI Flows ---
import { summarizeDocument } from '@/ai/flows/summarize-document';
import { chatWithDocument } from '@/ai/flows/chat-with-document';

// --- Custom Components & Types ---
import Header, { type ActiveTabValue } from '@/components/header';
// import ExplanatoryMode from '@/components/explanatory'; // Keep if used

// --- Interfaces ---
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string; // Can be text, file list, metadata, or placeholder
  contentType: 'text' | 'list' | 'metadata' | 'image' | 'error' | 'other'; // To know how to interpret content
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// --- Constants & Helpers ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
const MAX_FILE_SIZE_MB = 50;

// --- UPDATED getFileIcon ---
const getFileIcon = (fileName: string): React.ElementType => {
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    // Prioritize specific types
    switch (fileExtension) {
      // Documents
      case 'pdf': return BookOpen;
      case 'docx': case 'doc': return FileText; // More specific doc icon
      case 'pptx': case 'ppt': return Presentation;
      case 'xlsx': case 'xls': return FileSpreadsheet;
      case 'odt': return FileText;
      case 'rtf': return FileText;
      case 'txt': return FileText;
      case 'md': return FileText;
      // Code (add more as needed)
      case 'py': case 'js': case 'jsx': case 'ts': case 'tsx': case 'html':
      case 'css': case 'scss': case 'json': case 'yaml': case 'yml': case 'xml':
      case 'java': case 'c': case 'cpp': case 'h': case 'cs': case 'swift':
      case 'php': case 'rb': case 'go': case 'rs': case 'sql': return FileCode; // Generic code icon
      // Archives
      case 'zip': case 'rar': case '7z': case 'tar': case 'gz': return FileArchive;
      // Images
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': case 'bmp': case 'ico': return ImageIcon;
      // Audio
      case 'mp3': case 'wav': case 'ogg': case 'aac': case 'flac': return Music;
      // Video
      case 'mp4': case 'avi': case 'mov': case 'wmv': case 'mkv': case 'webm': return VideoIcon;
      // Default
      default: return FileIconLucide;
    }
};

// --- UPDATED getFileIconColor ---
const getFileIconColor = (fileName: string): string => {
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    // Assign colors based on category
    switch (fileExtension) {
      // Documents
      case 'pdf': return 'text-red-400';
      case 'docx': case 'doc': return 'text-blue-400';
      case 'pptx': case 'ppt': return 'text-orange-400';
      case 'xlsx': case 'xls': return 'text-green-500';
      case 'odt': return 'text-blue-300';
      case 'rtf': return 'text-purple-300';
      case 'txt': case 'md': return 'text-gray-400';
      // Code
      case 'py': case 'js': case 'jsx': case 'ts': case 'tsx': case 'html':
      case 'css': case 'scss': case 'json': case 'yaml': case 'yml': case 'xml':
      case 'java': case 'c': case 'cpp': case 'h': case 'cs': case 'swift':
      case 'php': case 'rb': case 'go': case 'rs': case 'sql': return 'text-cyan-400'; // Consistent code color
      // Archives
      case 'zip': case 'rar': case '7z': case 'tar': case 'gz': return 'text-yellow-500';
      // Images
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': case 'bmp': case 'ico': return 'text-purple-400';
      // Audio
      case 'mp3': case 'wav': case 'ogg': case 'aac': case 'flac': return 'text-pink-400';
      // Video
      case 'mp4': case 'avi': case 'mov': case 'wmv': case 'mkv': case 'webm': return 'text-indigo-400';
      // Default
      default: return 'text-gray-500';
    }
};

// --- Framer Motion Variants ---
const tooltipVariants = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } };
const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } };
const tabContentVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } }, exit: { opacity: 0, x: 10, transition: { duration: 0.2, ease: 'easeIn' } } };
const exportButtonVariants = { hidden: { opacity: 0, scale: 0.5, y: 20 }, visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 15, delay: 0.3 } }, hover: { scale: 1.1, transition: { type: 'spring', stiffness: 300 } }, tap: { scale: 0.9 } };
const floatingChatVariants = { hidden: { opacity: 0, y: 50, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 15, duration: 0.4 } }, exit: { opacity: 0, y: 30, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } } };


// --- PDF worker setup (Ensure pdf.worker.mjs is in /public) ---
const setupPdfWorker = async () => {
    if (typeof window !== 'undefined') {
        try {
            const workerUrl = `/pdf.worker.mjs`;
            if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerUrl) {
                 console.log(`Setting PDF worker source to: ${workerUrl}`);
                 pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
            }
            return pdfjsLib;
        } catch (error) {
            console.error('Failed to load pdfjs-dist or set up worker:', error);
            return null; // Handled later by toast in onDrop
        }
    }
    return null;
};

// --- NeonButton Definition --- (Relies on theme styles)
const NeonButton = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof ShadcnButton>>(
    ({ className, children, variant, size, ...props }, ref) => {
        const baseStyle = "relative transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group";
        return (
            <ShadcnButton ref={ref} className={cn(baseStyle, className)} variant={variant} size={size} {...props} >
                <motion.span whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}>
                    {children}
                </motion.span>
            </ShadcnButton>
        );
    }
);
NeonButton.displayName = 'NeonButton';


// --- Dedicated CodeBlock Component (Uses Theme Vars) ---
const CodeBlock: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'plaintext';

    const handleCopy = () => {
        const codeString = String(children).replace(/\n$/, '');
        if (codeString) {
            navigator.clipboard.writeText(codeString);
            setCopied(true);
            toast({ title: "Code Copied!", variant: "success", duration: 1500 });
            setTimeout(() => setCopied(false), 1500);
        } else {
            console.warn("Attempted to copy empty code block.");
            toast({ title: "Copy Failed", description: "No content to copy.", variant: "warning", duration: 2000 });
        }
    };

    const codeToRender = String(children).replace(/\n$/, '');

    return (
        <div className="relative group my-3">
            <pre className={cn(
                className,
                'bg-[hsla(var(--muted),0.2)] border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 pr-10 overflow-x-auto scrollbar-thin', // Themed styles
                'shadow-inner'
            )} >
                <code className={cn("block text-sm font-mono text-[hsl(var(--accent-foreground))] opacity-90", `language-${language}`)}>
                    {codeToRender}
                </code>
            </pre>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span>
                        <ShadcnButton
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent)/0.2)]"
                            onClick={handleCopy}
                            aria-label={copied ? "Copied code" : "Copy code"}
                        >
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </ShadcnButton>
                    </span>
                </TooltipTrigger>
                <TooltipContent side="left">
                    {copied ? "Copied!" : "Copy code"}
                </TooltipContent>
            </Tooltip>
        </div>
    );
};
// --- End CodeBlock Component ---

// --- Memoized Markdown Component (Uses Theme Vars & CodeBlock) ---
const MemoizedMarkdown = React.memo(({ content, isUser }: { content: string, isUser?: boolean }) => (
    <div className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        "prose-p:my-1 prose-li:my-0.5",
        "prose-headings:font-display prose-headings:text-[hsl(var(--primary))]",
        "prose-a:text-[hsl(var(--accent))] prose-a:underline hover:prose-a:opacity-80",
        "prose-strong:text-[hsl(var(--foreground))]",
        "prose-code:bg-[hsl(var(--muted)/0.3)] prose-code:text-[hsl(var(--muted-foreground))] prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:text-xs prose-code:font-mono", // Inline code
        "prose-blockquote:border-l-[hsl(var(--border))] prose-blockquote:text-[hsl(var(--muted-foreground))]",
        "prose-table:border-[hsl(var(--border))] prose-th:border-[hsl(var(--border))] prose-td:border-[hsl(var(--border))]",
        "text-[hsl(var(--foreground))]"
    )}>
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }) {
            if (inline || !String(children).includes('\n')) {
              return <code className={cn(className, "before:content-none after:content-none")} {...props}>{children}</code>;
            }
            return (
                <CodeBlock className={className} {...props}>
                    {children}
                </CodeBlock>
            );
          },
        }}
      />
    </div>
));
MemoizedMarkdown.displayName = 'MemoizedMarkdown';
// --- End MemoizedMarkdown Component ---


// --- Main Component ---
export default function Home() {
  const hasHydrated = useHasHydrated();
  // --- Theme State ---
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  // --- Other State ---
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false); // Used for AI analysis indicator
  const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('Idle'); // More descriptive status
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTabValue>("upload");
  const [xp, setXp] = useState<number>(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'md' | 'pdf'>('txt');
  const [isAIActive, setIsAIActive] = useState(false); // For chat window indicator
  const [particlesInit, setParticlesInit] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [showFloatingChatButton, setShowFloatingChatButton] = useState(false);

  // --- Refs ---
  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // --- Effects ---
  useEffect(() => { // Particle Init
    initParticlesEngine(async (engine) => { await loadSlim(engine); }).then(() => setParticlesInit(true));
  }, []);

  useEffect(() => { // Load initial state (history, XP)
    try { const storedHistory = localStorage.getItem('uploadHistory'); if (storedHistory) setUploadHistory(JSON.parse(storedHistory)); } catch (e) { console.error('Failed to parse upload history:', e); localStorage.removeItem('uploadHistory'); }
    try { const storedXp = localStorage.getItem('userXp'); if (storedXp) setXp(parseInt(storedXp, 10) || 0); } catch (e) { console.error('Failed to parse user XP:', e); localStorage.removeItem('userXp'); }
  }, []);

  useEffect(() => { localStorage.setItem('userXp', xp.toString()); }, [xp]); // Save XP

  useEffect(() => { // Scroll chat to bottom
    const chatViewport = chatContainerRef.current?.querySelector<HTMLDivElement>('div[style*="overflow: scroll;"]');
    if (chatViewport) { requestAnimationFrame(() => { chatViewport.scrollTop = chatViewport.scrollHeight; }); }
    else if (chatContainerRef.current) { requestAnimationFrame(() => { chatContainerRef.current!.scrollTop = chatContainerRef.current!.scrollHeight; }); }
  }, [chatHistory, isChatLoading]); // Trigger on new messages or loading state change

  useEffect(() => { setIsAIActive(isChatLoading || isSummarizing); }, [isChatLoading, isSummarizing]); // Update AI Active state

  // Scroll animation for header underline
  const { scrollY } = useScroll();
  const underlineScaleX = useTransform(scrollY, [0, 50], [0, 1], { clamp: false });

  // --- Callbacks ---
  const saveUploadHistory = useCallback((file: UploadedFile) => {
    setUploadHistory((prev) => {
      if (prev.some(i => i.name === file.name && i.lastModified === file.lastModified)) return prev; // Avoid duplicates
      const newHistory = [file, ...prev].slice(0, 15); // Limit history size
      try { localStorage.setItem('uploadHistory', JSON.stringify(newHistory)); }
      catch (e: any) {
        if (e.name === 'QuotaExceededError') toast({ title: 'Storage Full', description: 'Could not save to history.', variant: 'warning' });
        else { console.error('Failed to save upload history:', e); toast({ title: 'Error Saving History', variant: 'warning' }); }
        return prev; // Return previous state if saving failed
      } return newHistory;
    });
  }, [toast]);

  const clearUploadHistory = useCallback(() => {
    setUploadHistory([]); localStorage.removeItem('uploadHistory'); toast({ title: 'History Cleared', variant: 'info' });
  }, [toast]);

  // Updated summarize function to check content type
  const summarizeTheDocument = useCallback(async (file: UploadedFile) => {
     if (!file || !file.content || typeof file.content !== 'string') {
         setSummary('Cannot summarize empty or invalid content.');
         setIsSummarizing(false); setUploadStatus('Analysis Error');
         toast({ title: 'Content Issue', description: 'File has no content to analyze.', variant: 'warning' });
         return;
     }
      // Only try to summarize actual text content
     if (file.contentType !== 'text') {
         setSummary(`*Analysis Note:* File type (${file.name.split('.').pop()}) does not contain primary text for summarization. Content represents file ${file.contentType}.`);
         setIsSummarizing(false); setUploadStatus('Ready');
         // No toast needed here, it's expected behavior
         return;
     }

     setIsSummarizing(true); setSummary(''); setUploadStatus('Analyzing...');
     try {
       // Simulate API call delay if needed: await new Promise(resolve => setTimeout(resolve, 1500));
       const res = await summarizeDocument({ fileContent: file.content });
       setSummary(res.summary);
       setXp(x => x + 10); // Award XP
       toast({ title: 'Analysis Complete', description: `Summary generated for ${file.name}.`, variant: 'success' });
     } catch (e: any) {
       console.error('Summarization Error:', e);
       const msg = e?.message || 'Could not generate summary.';
       setSummary(`Error during analysis: ${msg}`);
       toast({ title: 'Summarization Failed', description: msg, variant: 'destructive' });
     }
     finally { setIsSummarizing(false); setUploadStatus('Ready'); }
   }, [toast, setXp]);

  const loadFileFromHistory = useCallback(async (fileId: string) => {
    const fileToLoad = uploadHistory.find(f => f.id === fileId);
    if (fileToLoad) {
      if (!fileToLoad.content) {
          toast({ title: 'Content Missing', description: `Data for ${fileToLoad.name} is missing. Please re-upload.`, variant: 'warning' });
          // Optional: remove faulty item
          setUploadHistory(prev => prev.filter(f => f.id !== fileId));
          localStorage.setItem('uploadHistory', JSON.stringify(uploadHistory.filter(f => f.id !== fileId)));
          return;
      }
      setUploadedFile(fileToLoad); setChatHistory([]); setCurrentMessage(''); setActiveTab("upload"); setShowChatWindow(true); // Show chat immediately
      toast({ title: 'File Loaded', description: `Accessing ${fileToLoad.name}...`, variant: 'info' });
      await summarizeTheDocument(fileToLoad); // Start analysis.
    } else { toast({ title: 'Error Loading File', description: 'Could not find file in history.', variant: 'destructive' }); }
  }, [uploadHistory, toast, summarizeTheDocument, setActiveTab]); // Dependencies

  // --- MAJOR REFACTOR: onDrop ---
  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
        fileRejections.forEach(({ file, errors }) => {
            errors.forEach(err => {
                const message = err.code === 'file-too-large' ? `${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`
                              : err.code === 'file-invalid-type' ? `${file.name} type not supported by dropzone.` // May not trigger if accept=undefined
                              : `${file.name}: ${err.message}`;
                toast({ title: 'File Rejected', description: message, variant: 'destructive' });
            });
        });
        return;
    }

    const file = acceptedFiles[0]; if (!file) return;

    // Reset state for new upload
    setUploadedFile(null); setSummary(''); setChatHistory([]); setCurrentMessage('');
    setUploadProgress(0); setUploadStatus('Initializing...'); setIsSummarizing(true); // Indicate processing start
    setShowChatWindow(false); setShowFloatingChatButton(false);

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: 'File Too Large', description: `${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`, variant: 'destructive' });
        setIsSummarizing(false); setUploadProgress(null); setUploadStatus('Error');
        return;
    }

    const handleProcessingError = (e: any, msg: string) => {
        console.error("Processing Error:", msg, e);
        const description = typeof e?.message === 'string' ? e.message : msg;
        toast({ title: 'File Processing Error', description, variant: 'destructive' });
        setUploadProgress(null); setIsSummarizing(false); setUploadedFile(null); setShowChatWindow(false); setUploadStatus('Error');
    };

    // --- Centralized File Processing Logic ---
    const processAndUploadFile = async (inputFile: File) => {
        let processedContent: string = '';
        let contentType: UploadedFile['contentType'] = 'other';
        const fileExtension = inputFile.name.split('.').pop()?.toLowerCase() ?? '';

        const updateProg = (p: number, status: string) => {
            setUploadProgress(cur => Math.min(100, Math.max(cur ?? 0, p)));
            setUploadStatus(status);
        };

        try {
            updateProg(10, 'Reading file...');
            const arrayBuffer = await inputFile.arrayBuffer();
            updateProg(30, 'Processing...');

            // 1. PDF
            if (inputFile.type === 'application/pdf' || fileExtension === 'pdf') {
                updateProg(40, 'Processing PDF...');
                const pdfjs = await setupPdfWorker();
                if (!pdfjs) {
                    throw new Error('PDF library failed to load. Please ensure pdf.worker.mjs is in the public folder.');
                }
                const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
                let text = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    text += content.items.map((item: any) => item.str).join(' ') + '\n\n';
                    updateProg(40 + Math.round((i / pdf.numPages) * 50), `Extracting PDF page ${i}/${pdf.numPages}`);
                }
                processedContent = text.trim();
                contentType = 'text';
                updateProg(95, 'PDF Extracted');
            }
            // 2. DOCX
            else if (fileExtension === 'docx') {
                updateProg(40, 'Processing DOCX...');
                try {
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    processedContent = result.value;
                    contentType = 'text';
                    updateProg(95, 'DOCX Extracted');
                } catch (mammothError: any) {
                    console.warn("Mammoth error, falling back:", mammothError);
                    processedContent = `*Note: Could not extract text from DOCX. Error: ${mammothError.message || 'Unknown error'}*`;
                    contentType = 'error';
                    updateProg(95, 'DOCX Processing Issue');
                 }
            }
            // 3. ZIP / Archives
            else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension) || inputFile.type.startsWith('application/zip') || inputFile.type.startsWith('application/x-zip')) {
                 updateProg(40, 'Reading Archive...');
                 try {
                    const jszip = new JSZip();
                    const zip = await jszip.loadAsync(arrayBuffer);
                    const fileNames = Object.keys(zip.files).filter(name => !zip.files[name].dir); // Get only files
                    processedContent = `Archive contains ${fileNames.length} file(s):\n- ${fileNames.slice(0, 20).join('\n- ')}${fileNames.length > 20 ? '\n- ... (and more)' : ''}`;
                    contentType = 'list';
                    updateProg(95, 'Archive Contents Listed');
                 } catch (zipError: any) {
                     console.warn("JSZip error:", zipError);
                     processedContent = `*Note: Could not read archive contents. Error: ${zipError.message || 'Unknown error'}*`;
                     contentType = 'error';
                     updateProg(95, 'Archive Read Error');
                 }
            }
            // 4. Text-based (Code, TXT, MD, JSON, etc.) - Add more extensions as needed
            else if (inputFile.type.startsWith('text/') || /\.(txt|md|py|js|jsx|ts|tsx|html|css|scss|json|xml|yaml|yml|java|c|cpp|h|cs|swift|php|rb|go|rs|sql|log|cfg|ini|sh|bat|ps1)$/i.test(inputFile.name)) {
                 updateProg(40, 'Processing Text/Code...');
                 const decoder = new TextDecoder('utf-8', { fatal: false }); // Be lenient with encoding
                 processedContent = decoder.decode(arrayBuffer);
                 contentType = 'text';
                 updateProg(95, 'Text/Code Processed');
            }
             // 5. Images
            else if (inputFile.type.startsWith('image/')) {
                updateProg(50, 'Noting Image...');
                processedContent = `Image file: ${inputFile.name}\nType: ${inputFile.type}`;
                contentType = 'image';
                updateProg(95, 'Image Noted');
            }
             // 6. Audio/Video (Metadata)
            else if (inputFile.type.startsWith('audio/') || inputFile.type.startsWith('video/')) {
                updateProg(40, 'Reading Media Tags...');
                 await new Promise<void>((resolve) => { // Removed reject as we handle errors internally
                    jsmediatags.read(inputFile, {
                        onSuccess: (tag) => {
                            let meta = `Media File: ${inputFile.name}\nType: ${inputFile.type}\n`;
                            if (tag.tags.title) meta += `Title: ${tag.tags.title}\n`;
                            if (tag.tags.artist) meta += `Artist: ${tag.tags.artist}\n`;
                            if (tag.tags.album) meta += `Album: ${tag.tags.album}\n`;
                            if (tag.tags.genre) meta += `Genre: ${tag.tags.genre}\n`;
                            // Add more tags if needed (e.g., year, track)
                            processedContent = meta.trim();
                            contentType = 'metadata';
                            updateProg(95, 'Media Tags Read');
                            resolve();
                        },
                        onError: (error) => {
                            console.warn('jsmediatags Error:', error);
                            processedContent = `Media File: ${inputFile.name}\nType: ${inputFile.type}\n*Note: Could not read media tags.*`;
                            contentType = 'metadata'; // Still metadata, just failed
                            updateProg(95, 'Media Tags Error');
                            resolve(); // Resolve even on error to continue
                        }
                    });
                 });
            }
            // 7. Fallback for other types (PPTX, XLSX, ODT, RTF etc. - Add specific handlers if libraries become available)
            else {
                 updateProg(50, 'Handling Other Type...');
                 console.log(`Unsupported type for direct text extraction: ${inputFile.type} / ${fileExtension}`);
                 processedContent = `File Type: ${inputFile.type || 'Unknown'}\nName: ${inputFile.name}\nSize: ${(inputFile.size / 1024).toFixed(1)} KB\n*Note: Direct content analysis for this file type is not currently supported.*`;
                 contentType = 'other';
                 updateProg(95, 'File Type Noted');
            }

            // --- Finalize Uploaded File Object ---
            const newFile: UploadedFile = {
                id: generateId(),
                name: inputFile.name,
                type: inputFile.type || 'unknown', // Ensure type exists
                size: inputFile.size,
                lastModified: inputFile.lastModified,
                content: processedContent,
                contentType: contentType,
            };

            setUploadedFile(newFile);
            saveUploadHistory(newFile);
            setUploadProgress(100); setUploadStatus('Processing Complete');
            toast({ title: 'Processing Complete', description: `File ${newFile.name} ready. Analyzing...`, variant: 'success' });

            // Trigger summarization AFTER setting state
            await summarizeTheDocument(newFile);

            // Show chat window and button AFTER summary attempt
            setShowChatWindow(true);
            setShowFloatingChatButton(true);
            setTimeout(() => { setUploadProgress(null); setUploadStatus('Ready'); }, 1000); // Hide progress bar, set final status

        } catch (e: any) {
            handleProcessingError(e, 'Unexpected error during file processing.');
        }
    };

    // Start the processing for the dropped file
    await processAndUploadFile(file);

  }, [toast, summarizeTheDocument, saveUploadHistory]); // Dependencies

  // Dropzone Hook Configuration - Allow any file type initially
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      multiple: false,
      accept: undefined, // Allow all types, handle validation in onDrop
      maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  });

  // Send Chat Message
  const handleSendMessage = useCallback(async () => {
    const msg = currentMessage.trim();
    if (!uploadedFile?.content) { toast({ title: 'No Document Loaded', description: 'Upload a file to start chatting.', variant: 'warning' }); return; }
    if (!msg) { toast({ title: 'Empty Message', description: 'Please enter a query.', variant: 'warning' }); return; }
    if (isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: msg };
    setChatHistory(prev => [...prev, userMsg]);
    setCurrentMessage('');
    setIsChatLoading(true);

    try {
      // The AI might be able to interpret lists or metadata, let's try sending it
      const chatRes = await chatWithDocument({ documentContent: uploadedFile.content, userMessage: msg });
      const assistantMsg: ChatMessage = { role: 'assistant', content: chatRes.response };
      setChatHistory(prev => [...prev, assistantMsg]);
      setXp(x => x + 5);
    } catch (e: any) {
      console.error('Chat Error:', e);
      const errMsg: ChatMessage = { role: 'assistant', content: `Error: ${e.message || 'Could not get response from AI.'}` };
      setChatHistory(prev => [...prev, errMsg]);
      toast({ title: 'Chat Error', description: e.message || 'AI failed to respond.', variant: 'destructive' });
    }
    finally {
        setIsChatLoading(false);
        requestAnimationFrame(() => { chatInputRef.current?.focus(); });
    }
  }, [currentMessage, uploadedFile, isChatLoading, toast, setXp]);

  // --- Export Logic ---
  const downloadFile = useCallback((filename: string, content: string, mimeType: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  }, []);

  const formatChatHistoryForExport = useCallback((format: 'txt' | 'md' | 'pdf'): string => {
    let content = `Analysis Log for: ${uploadedFile?.name || 'Unknown File'}\n`;
    content += `Generated on: ${new Date().toLocaleString()}\n`;
    content += "========================================\n\n";

    // Include original file type info if available
    if (uploadedFile) {
         content += format === 'md' ? "## File Information\n\n" : "### File Information ###\n\n";
         content += `- Name: ${uploadedFile.name}\n`;
         content += `- Type: ${uploadedFile.type || 'N/A'}\n`;
         content += `- Size: ${(uploadedFile.size / 1024).toFixed(1)} KB\n`;
         content += `- Processed as: ${uploadedFile.contentType}\n\n`;
         content += "========================================\n\n";
    }

    if (summary) {
        content += format === 'md' ? "## AI Summary / Analysis\n\n" : "### AI Summary / Analysis ###\n\n";
        content += summary + "\n\n"; // Summary might contain notes for non-text files
        content += "========================================\n\n";
    }

    content += format === 'md' ? "## Chat History\n\n" : "### Chat History ###\n\n";

    chatHistory.forEach(message => {
      const prefix = message.role === 'user' ? "User:" : "AI:";
      if (format === 'md') {
        content += `**${prefix}**\n${message.content}\n\n`;
      } else {
        content += `${prefix}\n${message.content}\n\n`;
      }
    });

    return content;
  }, [summary, chatHistory, uploadedFile]); // Added uploadedFile dependency

  const handleExport = useCallback(() => {
    if (!chatHistory.length && !summary && !uploadedFile) { // Check uploadedFile too
      toast({ title: "Nothing to Export", description: "Upload a file, generate a summary, or chat first.", variant: "warning" });
      return;
    }
    setShowExportModal(true);
  }, [chatHistory, summary, uploadedFile, toast]); // Added uploadedFile dependency

  const handleConfirmExport = useCallback(async () => {
    const baseFilename = uploadedFile?.name ? uploadedFile.name.split('.').slice(0, -1).join('.') : 'duino-ai-export';
    const formattedContent = formatChatHistoryForExport(exportFormat);

    if (exportFormat === 'pdf') {
      try {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(formattedContent, pdf.internal.pageSize.getWidth() - 20); // Margin
        pdf.text(lines, 10, 10);
        pdf.save(`${baseFilename}_log.pdf`);
        toast({ title: "Export Successful", description: "PDF log downloaded.", variant: "success" });
      } catch (e) {
        console.error("PDF Generation Error:", e);
        toast({ title: "PDF Export Failed", description: "Could not generate PDF.", variant: "destructive" });
      }
    } else {
      const mimeType = exportFormat === 'md' ? 'text/markdown' : 'text/plain';
      downloadFile(`${baseFilename}_log.${exportFormat}`, formattedContent, mimeType);
      toast({ title: "Export Successful", description: `.${exportFormat} log downloaded.`, variant: "success" });
    }
    setShowExportModal(false);
  }, [exportFormat, uploadedFile, formatChatHistoryForExport, downloadFile, toast]);
  // --- End Export Logic ---


  // Keyboard handler for floating chat
  const handleChatKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isChatLoading) {
        event.preventDefault();
        handleSendMessage();
    }
  };

  // --- Icon Logic ---
  const CurrentFileIcon = uploadedFile ? getFileIcon(uploadedFile.name) : Upload;


  // --- Particle Config (Themeable) ---
   const particleOptions = React.useMemo(() => {
        // Base config
        const baseConfig = {
            fpsLimit: 60,
            interactivity: {
                events: { onClick: { enable: false }, onHover: { enable: true, mode: "repulse" }, resize: true },
                modes: { repulse: { distance: 80, duration: 0.4 } } // Reduced distance slightly
            },
            particles: {
                links: { distance: 100, enable: true, width: 1 }, // Reduced distance
                move: { direction: "none", enable: true, outModes: { default: "out" }, random: true, speed: 0.5, straight: false },
                number: { density: { enable: true, area: 900 }, value: 40 }, // Reduced density/value
                shape: { type: "circle" },
                size: { value: { min: 1, max: 2.5 } } // Slightly smaller max size
            },
            detectRetina: true,
            background: { color: "transparent" }
        };

        // Theme-specific overrides
        switch(theme) {
            case 'cyberpunk':
            case 'matrix-code':
                return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#0ff", "#f0f", "#0f0"] }, links: { ...baseConfig.particles.links, color: "#0ff", opacity: 0.15 }, opacity: { value: { min: 0.2, max: 0.6 } } } };
            case 'dark-luxe':
                 return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#D4AF37", "#C0C0C0", "#A0A0A0"] }, links: { ...baseConfig.particles.links, color: "#B0B0B0", opacity: 0.08 }, opacity: { value: { min: 0.1, max: 0.4 } } } };
             case 'glassmorphism':
             case 'minimal-light':
                 return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#a0a0ff", "#a0d0ff", "#c0c0ff"] }, links: { ...baseConfig.particles.links, color: "#c0c0c0", opacity: 0.2 }, opacity: { value: { min: 0.3, max: 0.7 } } } };
             case 'pastel-dream':
                 return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#FFB6C1", "#ADD8E6", "#98FB98"] }, links: { ...baseConfig.particles.links, color: "#DDA0DD", opacity: 0.15 }, opacity: { value: { min: 0.2, max: 0.6 } } } };
             case 'sunset-gradient':
                 return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#FFA07A", "#FF6347", "#FF4500"] }, links: { ...baseConfig.particles.links, color: "#FF7F50", opacity: 0.1 }, opacity: { value: { min: 0.2, max: 0.5 } } } };
            case 'retro-terminal':
                 return { ...baseConfig, interactivity: { ...baseConfig.interactivity, onHover: { enable: false }}, particles: { ...baseConfig.particles, number: { value: 20 }, color: { value: ["#00FF00"] }, links: { enable: false }, opacity: { value: 0.7 }, size: { value: 1.5 } } }; // Simpler for terminal
             default:
                return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: "#ffffff" }, links: { color: "#ffffff", opacity: 0.1 }, opacity: { value: { min: 0.1, max: 0.4 } } } }; // Default fallback
        }
    }, [theme]); // Recompute when theme changes

  // --- Render ---
  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('flex flex-col min-h-screen font-sans transition-colors duration-300')}>
        {/* Background Elements - Dynamically Styled */}
        <div className="fixed inset-0 -z-20 overflow-hidden">
           <motion.div
             className={cn("absolute inset-0 transition-opacity duration-1000",
                { // Specific backgrounds per theme
                    'bg-gradient-to-br from-black via-indigo-950 to-black': theme === 'cyberpunk',
                    'bg-gradient-to-br from-white via-blue-50 to-purple-50': theme === 'glassmorphism',
                    'bg-gradient-to-br from-gray-900 via-gray-950 to-black': theme === 'dark-luxe',
                    'bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50': theme === 'pastel-dream',
                    'bg-black': ['retro-terminal', 'matrix-code'].includes(theme),
                    'bg-white': theme === 'minimal-light',
                    'bg-gradient-to-br from-orange-100 via-pink-100 to-purple-100': theme === 'sunset-gradient',
                }[theme] ?? "bg-[hsl(var(--background))]" // Fallback
             )}
             style={{ backgroundSize: '200% 200%' }}
             animate={['cyberpunk', 'sunset-gradient', 'dark-luxe'].includes(theme) ? { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] } : {}}
             transition={['cyberpunk', 'sunset-gradient', 'dark-luxe'].includes(theme) ? { duration: 25, repeat: Infinity, ease: "linear" } : {}}
           />
           {/* Grid Overlay - Themed */}
           <div className={cn(
               "absolute inset-0 bg-grid opacity-20", // Base grid class from globals.css
               { // Theme-specific opacity adjustments
                   'opacity-10': ['cyberpunk', 'dark-luxe', 'matrix-code'].includes(theme),
                   'opacity-5': theme === 'glassmorphism',
                   'opacity-30': theme === 'minimal-light',
                   'opacity-15': ['pastel-dream', 'sunset-gradient'].includes(theme),
                   'opacity-40': theme === 'retro-terminal',
               }
             )} style={{ /* styles applied by .bg-grid class in globals.css */ }}></div>
           {/* Particles */}
           {particlesInit && <Particles id="tsparticles" options={particleOptions as any} className="absolute inset-0 pointer-events-none" />}
        </div>

        {/* Header */}
        <Header
            ref={headerRef}
            xp={xp}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentTheme={theme}
            setTheme={setTheme}
            availableThemes={themes}
        >
            {/* Title - Themed */}
            <motion.h1 className="text-2xl md:text-3xl font-bold tracking-tighter gradient-text filter drop-shadow-[0_0_5px_hsla(var(--primary),0.4)] py-1 relative" style={{ fontFamily: 'var(--font-display, var(--font-sans))' }}>
              DuinoCourse AI
              <motion.div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent shadow-[0_0_8px_hsl(var(--primary))]" style={{ scaleX: underlineScaleX, originX: 0.5 }}/>
            </motion.h1>
        </Header>

        {/* Main Content Area */}
        <main className="container mx-auto flex flex-col flex-grow p-4 md:p-6 space-y-6 relative z-10 pt-24"> {/* Added padding-top */}

            {/* Content Area with Conditional Rendering & Animation */}
            <AnimatePresence mode="wait">
                {/* ------------------ Upload/Interact Tab ------------------ */}
                {activeTab === "upload" && (
                     <motion.div key="upload-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col space-y-6 outline-none">
                        {!uploadedFile ? (
                            // --- Upload Zone ---
                            <motion.div key="upload-zone" {...getRootProps()} variants={cardVariants} initial="hidden" animate="visible"
                                className={cn(
                                    "drag-drop-area", // Themed utility class
                                    "flex-grow flex flex-col items-center justify-center text-center p-8 md:p-12 cursor-pointer relative overflow-hidden",
                                    "bg-[hsl(var(--background)/0.1)] min-h-[40vh]", // Ensure min height
                                    isDragActive && "active" // Active state styling from globals.css
                                )}>
                                <input {...getInputProps()} />
                                {/* Animated border for drag active state */}
                                {isDragActive && (<>
                                 <motion.div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} />
                                 <motion.div className="absolute bottom-0 right-0 h-1 w-full bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent" animate={{ x: ['100%', '-100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: 0.75 }} />
                                 </>)}
                                <motion.div className="mb-6" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}>
                                    <Rocket className="h-16 w-16 text-[hsl(var(--primary))] mx-auto filter drop-shadow-[0_0_10px_hsla(var(--primary),0.5)]" />
                                </motion.div>
                                <h2 className="text-2xl md:text-3xl font-bold gradient-text mb-3" style={{ fontFamily: 'var(--font-display, var(--font-sans))' }}> Interface with DuinoCourse AI </h2>
                                <p className="text-base md:text-lg text-[hsl(var(--muted-foreground))] max-w-xl mb-6"> Upload documents, code, archives, or media to decode knowledge and initiate analysis. </p>
                                <ShadcnButton size="lg" className="px-8 py-3 text-base"> {/* Themed */}
                                    <Upload className="mr-2 h-5 w-5" /> {isDragActive ? "Release to Upload" : "Select File or Drag Here"}
                                </ShadcnButton>
                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4"> Max {MAX_FILE_SIZE_MB}MB | Any File Type</p>
                                {/* Progress Bar & Status - Themed */}
                                {uploadProgress !== null && uploadProgress >= 0 && (
                                    <div className="w-full max-w-sm mt-6">
                                        <Progress value={uploadProgress} className="h-2 [&>div]:bg-[hsl(var(--primary))]" />
                                        <p className="text-sm text-[hsl(var(--primary))] mt-2 animate-pulse font-mono text-center">
                                            {uploadStatus || `${uploadProgress}%`}
                                         </p>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            // --- Main Interface (File Uploaded) ---
                            <motion.div key="main-interface" className="flex flex-col lg:flex-row gap-6 flex-grow" variants={cardVariants} initial="hidden" animate="visible">
                                {/* Left Panel: File Info & Summary */}
                                <div className="w-full lg:w-1/3 flex flex-col space-y-6">
                                    {/* File Info Card - Themed + Glass */}
                                    <Card className="overflow-hidden glassmorphism">
                                      <CardHeader className="pb-3 border-b border-[hsl(var(--border)/0.5)]">
                                         <CardTitle className="flex items-center text-lg font-semibold text-[hsl(var(--primary))]">
                                            <CurrentFileIcon className={cn("h-5 w-5 mr-2 flex-shrink-0", getFileIconColor(uploadedFile.name))} /> {/* Updated Icons */}
                                            <span className="truncate" title={uploadedFile.name}>{uploadedFile.name}</span>
                                         </CardTitle>
                                         <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
                                             {(uploadedFile.size / 1024).toFixed(1)} KB | {uploadedFile.type || 'unknown'} | Processed as: {uploadedFile.contentType}
                                         </CardDescription>
                                       </CardHeader>
                                      <CardContent className="p-4">
                                        {/* Replace file dropzone */}
                                        <div {...getRootProps()} className={cn(
                                            "drag-drop-area !border !border-dashed", // Themed utility
                                            "flex flex-col items-center justify-center p-3 rounded-[calc(var(--radius)*0.8)] cursor-pointer text-sm",
                                            "text-[hsl(var(--muted-foreground))]",
                                            isDragActive && "active"
                                         )}>
                                          <input {...getInputProps()} />
                                          <Upload className="h-5 w-5 mb-1" />
                                          {isDragActive ? <p>Drop new file...</p> : <p className="text-center text-xs">Replace file or Drag & Drop</p>}
                                        </div>
                                        {/* Progress Bar during replace */}
                                        {uploadProgress !== null && uploadProgress >= 0 && (
                                            <div className="w-full mt-3">
                                                <Progress value={uploadProgress} className="h-1.5 [&>div]:bg-[hsl(var(--primary))]" />
                                                <p className="text-xs text-[hsl(var(--primary))] mt-1 text-center animate-pulse">
                                                    {uploadStatus || `${uploadProgress}%`}
                                                </p>
                                             </div>
                                         )}
                                      </CardContent>
                                    </Card>

                                    {/* Summary Card - Themed + Glass */}
                                    <Card className="glassmorphism flex flex-col flex-grow overflow-hidden">
                                       <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4 border-b border-[hsl(var(--border)/0.5)] cursor-pointer" onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}>
                                            <div className="space-y-0.5">
                                                <CardTitle className="text-base font-semibold text-[hsl(var(--primary))]">AI Analysis</CardTitle>
                                                <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">Generated Overview / Summary</CardDescription>
                                            </div>
                                             <motion.div animate={{ rotate: isSummaryCollapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
                                                 <ChevronDown className="h-5 w-5 text-[hsl(var(--primary))]" />
                                             </motion.div>
                                        </CardHeader>
                                      <AnimatePresence initial={false}>
                                        {!isSummaryCollapsed && (
                                          <motion.div key="summary-content" initial="collapsed" animate="open" exit="collapsed" variants={{ open: { opacity: 1, height: 'auto', transition: { type: 'spring', stiffness: 200, damping: 25 } }, collapsed: { opacity: 0, height: 0, transition: { duration: 0.3, ease: 'easeInOut' } } }} className="overflow-hidden flex-grow flex flex-col">
                                            <CardContent className="p-0 flex-grow">
                                               {/* Scroll area uses themed scrollbar */}
                                               <ScrollArea className="h-full max-h-[300px] p-4 scrollbar-thin">
                                                {isSummarizing && !summary ? ( // Check isSummarizing specifically
                                                    <div className="flex items-center justify-center space-x-2 text-[hsl(var(--primary))] pt-4 animate-pulse">
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> <span>{uploadStatus || 'Analyzing...'}</span>
                                                    </div> )
                                                : summary ? ( <MemoizedMarkdown content={summary} /> ) // Render summary (or analysis note)
                                                : ( <p className="text-[hsl(var(--muted-foreground))] italic text-sm text-center py-4"> {uploadStatus === 'Ready' ? 'No analysis available or generated.' : (uploadStatus || 'Loading...')} </p> )}
                                              </ScrollArea>
                                            </CardContent>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </Card>
                                </div>

                                {/* Right Panel: Interaction Hub */}
                                <div className="w-full lg:w-2/3">
                                     <Card className="glassmorphism h-full p-6">
                                        <CardTitle className="text-[hsl(var(--primary))] mb-2">Interaction Hub</CardTitle>
                                        <CardDescription className="text-[hsl(var(--muted-foreground))] mb-4">
                                            Use the floating chat console ( <MessageSquare className="inline h-4 w-4 mx-1 text-[hsl(var(--primary))]"/> ) to query the processed content of: <strong className="text-[hsl(var(--foreground))] truncate inline-block max-w-xs align-bottom" title={uploadedFile.name}>{uploadedFile.name}</strong>.
                                        </CardDescription>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                          {uploadedFile.contentType === 'text' ? 'The AI will analyze the extracted text.'
                                         : uploadedFile.contentType === 'list' ? 'The AI can discuss the list of files found in the archive.'
                                         : uploadedFile.contentType === 'metadata' ? 'The AI can discuss the media file metadata.'
                                         : 'Chat may be limited as primary text content was not extracted.'}
                                        </p>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-4">Export findings using the button ( <Download className="inline h-4 w-4 mx-1 text-[hsl(var(--secondary))]"/> ) on the bottom right.</p>
                                         <div className="mt-8 border border-dashed border-[hsl(var(--border))] rounded-[var(--radius)] h-40 flex items-center justify-center text-[hsl(var(--muted-foreground))]"> [ Future Visualization / Interaction Area ] </div>
                                         {/* Example: <ExplanatoryMode file={uploadedFile} ... /> */}
                                    </Card>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* ------------------ History Tab ------------------ */}
                {activeTab === "history" && (
                    <motion.div key="history-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none">
                        <Card className="glassmorphism h-full flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between border-b border-[hsl(var(--border)/0.5)] py-3 px-4">
                                <div>
                                    <CardTitle className="text-[hsl(var(--primary))] text-lg">Access Logs</CardTitle>
                                    <CardDescription className="text-[hsl(var(--muted-foreground))] text-xs">Reload previous data streams.</CardDescription>
                                </div>
                                {uploadHistory.length > 0 && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <ShadcnButton variant="destructive" size="sm">Clear Logs</ShadcnButton>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]"> {/* Themed */}
                                            <DialogHeader>
                                                <DialogTitle className="text-[hsl(var(--destructive))]">Confirm Log Deletion</DialogTitle>
                                                <DialogDescription className="text-[hsl(var(--muted-foreground))]">This action cannot be reversed.</DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter className="mt-4 sm:justify-end space-x-2">
                                                 <DialogClose asChild><ShadcnButton variant="outline" size="sm">Cancel</ShadcnButton></DialogClose>
                                                 <DialogClose asChild><ShadcnButton variant="destructive" size="sm" onClick={clearUploadHistory}>Purge Logs</ShadcnButton></DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </CardHeader>
                            <CardContent className="flex-grow p-0">
                                <ScrollArea className="h-full max-h-[60vh] scrollbar-thin"> {/* Themed scrollbar */}
                                    {uploadHistory.length > 0 ? (
                                        <div className="grid gap-3 p-4">
                                            {uploadHistory.map((file) => {
                                                const FileIconComponent = getFileIcon(file.name);
                                                const fileColor = getFileIconColor(file.name);
                                                return (
                                                    <motion.div
                                                        key={file.id}
                                                        className="border border-[hsl(var(--border))] rounded-[var(--radius)] p-3 flex items-center justify-between bg-[hsl(var(--card)/0.5)] hover:bg-[hsl(var(--accent)/0.1)] hover:border-[hsl(var(--accent)/0.5)] transition-all duration-200 group"
                                                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}
                                                    >
                                                        <div className="flex items-center space-x-3 overflow-hidden">
                                                            <FileIconComponent className={cn("h-5 w-5 flex-shrink-0 transition-colors", fileColor, "group-hover:text-[hsl(var(--accent))]")} />
                                                            <div className="overflow-hidden">
                                                                <p className="text-sm font-medium leading-none truncate text-[hsl(var(--foreground))]" title={file.name}>{file.name}</p>
                                                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5"> {(file.size / 1024).toFixed(1)} KB | {new Date(file.lastModified).toLocaleDateString()} | Type: {file.contentType} </p>
                                                            </div>
                                                        </div>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <ShadcnButton variant="ghost" size="sm" onClick={() => loadFileFromHistory(file.id)} className="px-2 text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.2)]"> Load </ShadcnButton>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">Load this file</TooltipContent> {/* Themed */}
                                                        </Tooltip>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    ) : ( <div className="flex items-center justify-center h-full p-10"><p className="text-sm text-[hsl(var(--muted-foreground))] text-center italic">No access logs found.</p></div> )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* ------------------ Settings Tab ------------------ */}
                {activeTab === "settings" && (
                     <motion.div key="settings-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none">
                         <Card className="glassmorphism h-full"> {/* Themed + Glass */}
                            <CardHeader className="border-b border-[hsl(var(--border)/0.5)] py-3 px-4">
                                <CardTitle className="text-[hsl(var(--primary))] text-lg">System Preferences</CardTitle>
                                <CardDescription className="text-[hsl(var(--muted-foreground))] text-xs">Configure interface parameters.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6 p-6">
                                {/* Theme Selector */}
                                <motion.div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4 border border-[hsl(var(--border))] p-4 rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] backdrop-blur-sm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                    <div className="space-y-0.5 flex-shrink-0">
                                         <Label htmlFor="theme-select" className="text-base font-medium text-[hsl(var(--foreground))]">Visual Theme</Label>
                                         <p className="text-sm text-[hsl(var(--muted-foreground))]">Select the interface appearance.</p>
                                     </div>
                                     {/* Select uses theme styles */}
                                     <Select value={theme} onValueChange={(value) => setTheme(value as ThemeId)} disabled={!hasHydrated}>
                                         <SelectTrigger id="theme-select" className="w-full sm:w-[220px]">
                                             <SelectValue placeholder={!hasHydrated ? "Loading..." : "Select Theme"} />
                                         </SelectTrigger>
                                         <SelectContent> {/* Themed */}
                                             <SelectGroup>
                                                <SelectLabel>Select Theme</SelectLabel>
                                                {themes.map((t) => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                       <span className='mr-2 text-lg leading-none'>{t.icon}</span> {t.name}
                                                    </SelectItem>
                                                ))}
                                             </SelectGroup>
                                         </SelectContent>
                                     </Select>
                                </motion.div>
                                {/* Add other settings here */}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* ------------------ FAQ Tab ------------------ */}
                {activeTab === "faq" && (
                    <motion.div key="faq-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none">
                        <Card className="glassmorphism h-full flex flex-col"> {/* Themed + Glass */}
                            <CardHeader className="border-b border-[hsl(var(--border)/0.5)] py-3 px-4">
                                <CardTitle className="text-[hsl(var(--primary))] text-lg">Knowledge Base</CardTitle>
                                <CardDescription className="text-[hsl(var(--muted-foreground))] text-xs">Frequently Asked Questions.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow p-0">
                               <ScrollArea className="h-full max-h-[65vh] p-6 scrollbar-thin"> {/* Themed Scrollbar */}
                                   <FAQPage /> {/* Ensure FAQPage uses themed text/styles */}
                               </ScrollArea>
                            </CardContent>
                         </Card>
                    </motion.div>
                )}
            </AnimatePresence>


          {/* ------------------ Floating Chat Window ------------------ */}
          <AnimatePresence>
              {showChatWindow && uploadedFile && (
                 <motion.div
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] sm:w-[90%] max-w-3xl z-40"
                    variants={floatingChatVariants} initial="hidden" animate="visible" exit="exit"
                    drag dragConstraints={{ top: -300, bottom: 0, left: -500, right: 500 }} dragElastic={0.1} dragMomentum={false}
                  >
                      <Card className="shadow-2xl shadow-[hsl(var(--primary)/0.15)] border border-[hsl(var(--primary)/0.5)] rounded-xl overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[70vh] bg-[hsl(var(--background)/0.8)] backdrop-blur-lg">
                         <CardHeader className="relative flex flex-row items-center justify-between py-2.5 px-4 border-b border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.7)] cursor-grab active:cursor-grabbing">
                             <motion.div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[hsl(var(--secondary))] to-transparent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.3 }}/>
                             <div className="flex items-center space-x-2 sm:space-x-3 z-10 overflow-hidden">
                                  {/* AI Active Indicator */}
                                  <motion.div
                                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center shadow-inner shadow-black/50 border-2 border-[hsl(var(--primary)/0.5)] flex-shrink-0"
                                      animate={isAIActive ? { scale: [1, 1.15, 1], y: [0, -2, 0], boxShadow: [`0 0 4px 1px hsla(var(--primary),0.7)`, `0 0 10px 2px hsla(var(--secondary),0.6)`, `0 0 4px 1px hsla(var(--primary),0.7)`] } : { scale: 1, y: 0, boxShadow: `0 0 2px 0px hsla(var(--primary), 0.5)` }}
                                      transition={isAIActive ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
                                    >
                                      <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-white/80 rounded-full animate-pulse"></div>
                                  </motion.div>
                                 <CardTitle className="text-sm font-medium text-[hsl(var(--foreground))] tracking-wider hidden sm:block">AI CONSOLE</CardTitle>
                                 <span className="text-[hsl(var(--muted-foreground))] text-sm hidden sm:block">|</span>
                                 <CardDescription className="text-xs text-[hsl(var(--muted-foreground))] truncate" title={uploadedFile.name}>
                                     <span className='text-[hsl(var(--muted-foreground))/0.7] hidden sm:inline'>Querying: </span> {uploadedFile.name}
                                 </CardDescription>
                             </div>
                             <div className="z-10 flex-shrink-0">
                                 <ShadcnButton variant="ghost" size="icon" className="h-7 w-7 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]" onClick={() => setShowChatWindow(false)}>
                                     <X className="h-4 w-4" />
                                 </ShadcnButton>
                             </div>
                         </CardHeader>
                         {/* Chat Content Area */}
                         <CardContent ref={chatContainerRef} className="flex-grow p-0 overflow-hidden bg-[hsl(var(--background)/0.1)]">
                             <ScrollArea className="h-full max-h-[calc(75vh-120px)] sm:max-h-[calc(70vh-120px)] p-4 scrollbar-thin"> {/* Themed Scrollbar */}
                                 <div className="flex flex-col space-y-3 pr-1 sm:pr-2">
                                      {/* Render Chat Messages */}
                                      {chatHistory.map((message, index) => (
                                          <ChatMessageItem key={index} message={message} toast={toast} />
                                      ))}

                                      {/* Intro Message */}
                                      {chatHistory.length === 0 && !isChatLoading && (
                                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="ai-bubble flex items-start space-x-2 text-sm italic !mt-0"> {/* Themed bubble */}
                                            <Sparkles className="h-4 w-4 text-[hsl(var(--secondary))] flex-shrink-0 mt-0.5"/>
                                            <span>Connection established. Enter query for <span className='font-semibold not-italic text-[hsl(var(--foreground))]'>{uploadedFile.name}</span> below...</span>
                                          </motion.div>
                                       )}

                                     {/* Loading Indicator */}
                                     {isChatLoading && (
                                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center space-x-2 self-start text-[hsl(var(--secondary))] p-3 ai-bubble !bg-transparent !border-none !shadow-none"> {/* Invisible bubble structure */}
                                             <Loader2 className="h-4 w-4 animate-spin" />
                                             <span className="text-sm font-mono animate-pulse tracking-wider">AI Processing...</span>
                                         </motion.div>
                                      )}
                                 </div>
                             </ScrollArea>
                         </CardContent>
                         {/* Chat Input Area */}
                         <motion.div
                             className={cn( "p-3 border-t border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.8)] backdrop-blur-sm transition-colors" )}
                             animate={isChatLoading ? { borderTopColor: [`hsl(var(--border))`, `hsl(var(--secondary))`, `hsl(var(--border))`] } : { borderTopColor: `hsl(var(--border)/0.5)`}} // Simplified animation colors
                              transition={isChatLoading ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
                            >
                              <div className="flex items-end space-x-2">
                                 <Textarea
                                     ref={chatInputRef}
                                     placeholder="Transmit query... (Shift+Enter for newline)"
                                     value={currentMessage}
                                     onChange={(e) => setCurrentMessage(e.target.value)}
                                     onKeyDown={handleChatKeyDown}
                                     rows={1}
                                     className={cn(
                                        "flex-1 resize-none rounded-[calc(var(--radius)*0.8)] border px-3 py-2 text-sm", // Uses theme vars for bg/color/border/radius via .input class
                                        "bg-[hsl(var(--input))] text-[hsl(var(--input-foreground))] border-[hsl(var(--border))]", // Explicit theme vars
                                        "focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--ring))] focus:outline-none",
                                        "min-h-[40px] max-h-[120px] scrollbar-thin transition-colors duration-200"
                                     )}
                                     aria-label="Chat input"
                                     disabled={isChatLoading}
                                 />
                                 <Tooltip>
                                     <TooltipTrigger asChild>
                                        <ShadcnButton
                                            variant="default" // Themed
                                            size="icon"
                                            className="h-9 w-9 flex-shrink-0"
                                            onClick={handleSendMessage}
                                            disabled={isChatLoading || !currentMessage.trim()}
                                            aria-label="Send message"
                                        >
                                            <motion.div whileTap={{ scale: 0.9 }}>
                                                {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                            </motion.div>
                                        </ShadcnButton>
                                     </TooltipTrigger>
                                     <TooltipContent side="top"> Send Query (Enter) </TooltipContent> {/* Themed */}
                                 </Tooltip>
                             </div>
                         </motion.div>
                     </Card>
                 </motion.div>
              )}
          </AnimatePresence>

          {/* ------------------ Floating Buttons ------------------ */}
          {/* Floating Chat Button */}
          <AnimatePresence>
               {showFloatingChatButton && !showChatWindow && uploadedFile && ( // Only show if file is uploaded
                    <motion.div
                        className="fixed bottom-6 right-6 z-30" // Lower z-index than export
                        variants={exportButtonVariants} // Reuse animation
                        initial="hidden" animate="visible" exit="hidden" whileHover="hover"
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ShadcnButton
                                    variant="outline" // Use outline or secondary
                                    size="icon"
                                    className="p-3 rounded-full aspect-square shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-[hsl(var(--background)/0.8)] backdrop-blur-sm border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]"
                                    onClick={() => setShowChatWindow(true)}
                                    aria-label="Open chat console"
                                >
                                    <motion.div variants={exportButtonVariants} whileTap="tap">
                                        <MessageSquare className="w-5 h-5 text-[hsl(var(--primary))]" />
                                    </motion.div>
                                </ShadcnButton>
                             </TooltipTrigger>
                             <TooltipContent side="left">Open Chat Console</TooltipContent>
                         </Tooltip>
                     </motion.div>
               )}
           </AnimatePresence>

          {/* Floating Export Button */}
           <motion.div
               className="fixed bottom-[4.5rem] right-6 z-30" // Position above chat button if both visible
               variants={exportButtonVariants}
               initial="hidden"
               animate={(chatHistory.length > 0 || summary || uploadedFile) ? "visible" : "hidden"} // Show if any data exists
               whileHover="hover"
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span> {/* Span needed for disabled button tooltip */}
                            <ShadcnButton
                                variant="secondary" // Themed
                                size="icon"
                                className="p-3 rounded-full aspect-square shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                                onClick={handleExport}
                                disabled={!chatHistory.length && !summary && !uploadedFile}
                                aria-label="Export chat and summary"
                            >
                                <motion.div variants={exportButtonVariants} whileTap="tap">
                                    <Download className="w-5 h-5" />
                                </motion.div>
                            </ShadcnButton>
                        </span>
                     </TooltipTrigger>
                     <TooltipContent side="left"> {(!chatHistory.length && !summary && !uploadedFile) ? "No data to export" : "Export Analysis & Log"} </TooltipContent> {/* Themed */}
                </Tooltip>
            </motion.div>

          {/* ------------------ Export Modal ------------------ */}
          <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
              <DialogContent className="sm:max-w-md"> {/* Themed */}
                <DialogHeader>
                    <DialogTitle className="text-[hsl(var(--primary))]">Export Configuration</DialogTitle>
                    <DialogDescription className="text-[hsl(var(--muted-foreground))]">Select format for data log export.</DialogDescription>
                 </DialogHeader>
                <div className="grid gap-4 py-4">
                   <div className="space-y-2">
                       <Label htmlFor="export-format" className="text-[hsl(var(--foreground))]">Log Format</Label>
                       <Select value={exportFormat} onValueChange={value => setExportFormat(value as 'txt' | 'md' | 'pdf')}>
                        <SelectTrigger id="export-format"> {/* Themed */}
                            <SelectValue placeholder="Select Format" />
                        </SelectTrigger>
                        <SelectContent> {/* Themed */}
                            <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                            <SelectItem value="md">Markdown (.md)</SelectItem>
                            <SelectItem value="pdf">PDF Document (.pdf)</SelectItem>
                        </SelectContent>
                        </Select>
                        {exportFormat === 'pdf' && ( <p className="text-xs text-[hsl(var(--muted-foreground))] pt-1">Note: PDF export uses basic formatting.</p> )}
                    </div>
                  </div>
                <DialogFooter className="mt-4 sm:justify-end space-x-2">
                    <DialogClose asChild><ShadcnButton variant="outline" size="sm">Cancel</ShadcnButton></DialogClose>
                    <ShadcnButton type="button" onClick={handleConfirmExport} size="sm">Confirm Export</ShadcnButton> {/* Themed */}
                </DialogFooter>
              </DialogContent>
          </Dialog>

          {/* Footer */}
          <Footer /> {/* Ensure Footer adapts to theme text colors */}

        </main>

      </div>
    </TooltipProvider>
  );
}