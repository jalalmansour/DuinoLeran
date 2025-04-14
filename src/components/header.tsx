'use client';

// --- Core React & Next.js ---
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';

// --- Libraries ---
import { useDropzone, FileRejection } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
// Note: pdfjs-dist is imported dynamically later

// --- UI Components (Shadcn/ui & Custom) ---
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
//import Header from '@/components/header'; // Import the corrected Header
import Footer from '../components/footer';
// import FAQPage from './faq';

// --- Icons ---
import {
  File as FileIconLucide, Upload, ImageIcon, Code, BookOpen, Loader2, Send, Lightbulb, ChevronsDown, ChevronsUp, Trophy, Download, Wand2, Rocket, Home, HelpCircle, Settings, BookOpenCheck
} from 'lucide-react';

// --- Utilities & Hooks ---
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// --- AI Flows ---
import { summarizeDocument } from '@/ai/flows/summarize-document';
import { chatWithDocument } from '@/ai/flows/chat-with-document';

// --- Interfaces ---
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string; // Stores extracted text content
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// --- Helper Functions ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const getFileIcon = (fileName: string): React.ElementType => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  switch (fileExtension) {
    case 'pdf': return BookOpen;
    case 'docx': case 'doc': return FileIconLucide;
    case 'pptx': case 'ppt': return FileIconLucide;
    case 'txt': case 'md': return FileIconLucide;
    case 'py': case 'js': case 'jsx': case 'ts': case 'tsx': case 'html': case 'css': case 'json': case 'xml': case 'java': case 'c': case 'cpp': return Code;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': return ImageIcon;
    default: return FileIconLucide;
  }
};

interface HeaderProps {
    xp: number;
}

const Header: React.FC<HeaderProps> = ({ xp }) => {
    const [darkMode, setDarkMode] = useState<boolean>(true);

    useEffect(() => {
        const storedDarkMode = localStorage.getItem('darkMode');
        if (storedDarkMode) {
            setDarkMode(JSON.parse(storedDarkMode));
        } else {
            setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
    }, []);

    useEffect(() => {
        document.body.classList.toggle('dark', darkMode);
        document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
        localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }, [darkMode]);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <header className="sticky top-0 z-20 glass p-4 border-b border-white/10">
            <div className="container mx-auto flex items-center justify-between">
                {/* Logo and Title */}
                <Link href="/" className="flex items-center space-x-2">
                    <img src="/duino.png" alt="DuinoLearn Logo" className="h-8 w-auto rounded-full shadow-md" />
                    <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-lg font-bold text-transparent tracking-tight">
                        DuinoCourse AI
                    </span>
                </Link>

                {/* Navigation Links */}
                <nav className="flex items-center space-x-4">
                    <Link href="/" className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <Home className="h-4 w-4" />
                        <span>Home</span>
                    </Link>
                    <Link href="/history" className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <BookOpenCheck className="h-4 w-4" />
                        <span>History</span>
                    </Link>
                    <Link href="/faq" className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <HelpCircle className="h-4 w-4" />
                        <span>FAQ</span>
                    </Link>

                    {/* Theme Toggle Button */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={toggleDarkMode} aria-label="Toggle dark mode">
                                    {darkMode ? <Lightbulb className="h-4 w-4" /> : <Code className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                Toggle theme
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </nav>

                {/* XP Display */}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>XP: {xp}</span>
                    <Trophy className="h-4 w-4 text-yellow-500" />
                </div>
            </div>
        </header>
    );
};

export default Header;
