// src/app/page.tsx
'use client';

// --- Core React & Next.js ---
import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// --- Libraries ---
import { motion, AnimatePresence, useScroll, useTransform, type MotionValue } from 'framer-motion';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

// --- UI Components ---
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button as ShadcnButton } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Loader2, X, HelpCircle, Bot } from 'lucide-react'; // Ensure Bot is imported

// --- Utilities & Hooks ---
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useThemeStore, themes, useHasHydrated, type ThemeId } from '@/hooks/useThemeStore';
import useMediaQuery from '@/hooks/useMediaQuery'; // Import the custom hook

// --- Custom Components & Types ---
import Header, { type ActiveTabValue } from '@/components/header';
import Footer from '@/components/footer';
import FeatureBanner from '@/components/banner/FeatureBanner';
// Renamed for clarity
const FileInteractionManager = dynamic(() => import('@/components/upload/UploadInteract'), {
    loading: () => <ViewerLoading message="Loading Uploader..." />,
    ssr: false,
});
import FAQPage from './faq';
const ChatSection = dynamic(() => import('@/components/chat/ChatSection'), {
    loading: () => <ViewerLoading message="Loading Chat..." />,
    ssr: false
});
import FloatingButton from '@/components/FloatingButton'; // Keep static if small

// --- DYNAMIC IMPORTS FOR FILE VIEWERS ---
const ViewerLoading = ({ message = "Loading..." }: { message?: string }) => (
    <div className="flex items-center justify-center h-40 text-[hsl(var(--muted-foreground))]">
        <Loader2 className="h-6 w-6 animate-spin mr-2 text-[hsl(var(--primary))]" />
        {message}
    </div>
);
// Generic viewer as fallback
const GenericFileViewer = dynamic(() => import('@/components/viewers/GenericFileViewer').catch(err => {
    console.error("Failed to load GenericFileViewer", err);
    return () => <div className='p-4 border rounded bg-destructive/20 text-destructive-foreground'>Error loading file viewer.</div>;
}), { loading: () => <ViewerLoading /> });
// Specific viewers with fallback
const DocumentViewer = dynamic(() => import('@/components/viewers/DocumentViewer').catch(err => { console.error("Failed to load DocumentViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const PresentationViewer = dynamic(() => import('@/components/viewers/PresentationViewer').catch(err => { console.error("Failed to load PresentationViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const CodeViewer = dynamic(() => import('@/components/viewers/CodeViewer').catch(err => { console.error("Failed to load CodeViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const AudioViewer = dynamic(() => import('@/components/viewers/AudioViewer').catch(err => { console.error("Failed to load AudioViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const VideoViewer = dynamic(() => import('@/components/viewers/VideoViewer').catch(err => { console.error("Failed to load VideoViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const BookViewer = dynamic(() => import('@/components/viewers/BookViewer').catch(err => { console.error("Failed to load BookViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const ArchiveViewer = dynamic(() => import('@/components/viewers/ArchiveViewer').catch(err => { console.error("Failed to load ArchiveViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });
const ImageViewer = dynamic(() => import('@/components/viewers/ImageViewer').catch(err => { console.error("Failed to load ImageViewer", err); return GenericFileViewer; }), { loading: () => <ViewerLoading /> });


// --- Interfaces (Ensure consistency) ---
export interface UploadedFile { // Export if needed elsewhere
    id: string; name: string; type: string; size: number; lastModified: number;
    content: any; // string (text), ImageContent, string[] (archive), object (metadata), null
    contentType: 'text' | 'code' | 'document' | 'presentation' | 'book' | 'archive' | 'list' | 'metadata' | 'image' | 'audio' | 'video' | 'error' | 'other';
}
interface ChatMessage { role: 'user' | 'assistant'; content: string; }
interface ImageContent { type: 'image'; data: string; mimeType: string; } // Define if not imported


// --- Framer Motion Variants ---
const tabContentVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } }, exit: { opacity: 0, x: 10, transition: { duration: 0.2, ease: 'easeIn' } } };
const floatingChatVariants = { hidden: { opacity: 0, y: 50, scale: 0.9 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 120, damping: 15, duration: 0.4 } }, exit: { opacity: 0, y: 30, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } } };


// --- Main Page Component ---
export default function Home() {
    const hasHydrated = useHasHydrated();
    // Theme State
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    // Application State
    const [mainUploadedFile, setMainUploadedFile] = useState<UploadedFile | null>(null);
    const [isMainProcessing, setIsMainProcessing] = useState<boolean>(false);
    const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([]);
    const [activeTab, setActiveTab] = useState<ActiveTabValue>("upload");
    const [xp, setXp] = useState<number>(0);
    // Floating Chat State - controlled here for visibility toggle
    const [showChat, setShowChat] = useState(false);
    // Pass chat history state and loading down to FileInteractionManager if needed
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

    // Hooks called at Top Level
    const { scrollY } = useScroll();
    const underlineScaleX = useTransform(scrollY, [0, 50], [0, 1], { clamp: false });
    const isDesktop = useMediaQuery('(min-width: 768px)');

    // Refs
    const { toast } = useToast();
    const headerRef = useRef<HTMLElement>(null);
    const constraintsRef = useRef<HTMLDivElement>(null);

    // --- Effects ---
    useEffect(() => { // Load initial state from localStorage
        try { const storedHistory = localStorage.getItem('uploadHistory'); if (storedHistory) setUploadHistory(JSON.parse(storedHistory)); } catch (e) { console.error('Failed to parse upload history:', e); localStorage.removeItem('uploadHistory'); }
        try { const storedXp = localStorage.getItem('userXp'); if (storedXp) setXp(parseInt(storedXp, 10) || 0); } catch (e) { console.error('Failed to parse user XP:', e); localStorage.removeItem('userXp'); }
    }, []);

    useEffect(() => { // Save XP to localStorage
        if (xp > 0 || localStorage.getItem('userXp')) {
           localStorage.setItem('userXp', xp.toString());
        }
    }, [xp]);

    const [particlesInit, setParticlesInit] = useState(false);
    useEffect(() => { // Initialize background particles
        initParticlesEngine(async (engine) => { await loadSlim(engine); }).then(() => setParticlesInit(true));
    }, []);

    // Effect to reset chat when the main file changes
    useEffect(() => {
        if (!mainUploadedFile) {
            setShowChat(false); // Hide chat when no file
        }
        // Chat history reset can happen inside FileInteractionManager or ChatSection directly
        // setChatHistory([]); // Resetting here might cause flicker if FIM also resets
    }, [mainUploadedFile]);


    // --- Callbacks ---
    const saveUploadHistory = useCallback((file: UploadedFile) => {
      setUploadHistory((prev) => {
        if (prev.some(i => i.name === file.name && i.lastModified === file.lastModified && i.size === file.size)) return prev;
        const newHistory = [file, ...prev].slice(0, 15);
        try { localStorage.setItem('uploadHistory', JSON.stringify(newHistory)); }
        catch (e: any) { toast({ title: 'Error Saving History', description: 'Storage might be full.', variant: 'warning' }); return prev; }
        return newHistory;
      });
    }, [toast]);

    const clearUploadHistory = useCallback(() => {
      setUploadHistory([]); localStorage.removeItem('uploadHistory'); toast({ title: 'History Cleared', variant: 'info' });
    }, [toast]);

     const loadFileFromHistory = useCallback(async (fileId: string) => {
        const fileToLoad = uploadHistory.find(f => f.id === fileId);
        if (fileToLoad) {
          if (!fileToLoad.content && !['image','audio','video','archive','list','metadata'].includes(fileToLoad.contentType)) {
              toast({ title: 'Content Missing', description:`Stored data for ${fileToLoad.name} is incomplete. Please re-upload.`, variant: 'warning' });
              return;
          }
          setIsMainProcessing(true); // Indicate loading from history
          setMainUploadedFile(fileToLoad); // Set the main file state
          // FileInteractionManager's useEffect will trigger processing/summary
          setActiveTab("upload");
          toast({ title: 'File Loaded from History', variant: 'info' });
          // setIsMainProcessing will be set to false by handleFileProcessed callback
        } else { toast({ title: 'Error Loading File', variant: 'destructive' }); }
      }, [uploadHistory, toast, setActiveTab]);

    // Callback received from FileInteractionManager
    const handleFileProcessed = useCallback((processedFile: UploadedFile | null, error?: string) => {
        setIsMainProcessing(false); // Processing finished
        if (error) {
            toast({ title: "File Processing Error", description: error, variant: "destructive" });
            setMainUploadedFile(null);
        } else {
            setMainUploadedFile(processedFile); // Update the main file state
            if (processedFile) {
                saveUploadHistory(processedFile);
                toast({ title: "File Ready", description: `${processedFile.name} processed.`, variant: "success" });
                setShowChat(true); // Auto-open chat after successful processing
            }
        }
    }, [toast, saveUploadHistory]);

    // --- Helper to render the correct file viewer ---
     const renderFileViewer = () => {
        if (isMainProcessing) return <ViewerLoading message="Processing File..." />;
        if (!mainUploadedFile) return <p className="text-center text-muted-foreground italic">No file selected or processed.</p>;

        const commonViewerProps = { file: mainUploadedFile };

        switch (mainUploadedFile.contentType) {
            case 'document': return <DocumentViewer {...commonViewerProps} />;
            case 'presentation': return <PresentationViewer {...commonViewerProps} />;
            case 'code': return <CodeViewer {...commonViewerProps} />;
            case 'audio': return <AudioViewer {...commonViewerProps} />;
            case 'video': return <VideoViewer {...commonViewerProps} />;
            case 'book': return <BookViewer {...commonViewerProps} />;
            case 'archive': case 'list': return <ArchiveViewer {...commonViewerProps} />;
            case 'image': return <ImageViewer {...commonViewerProps} />;
            case 'text': return <DocumentViewer {...commonViewerProps} />;
            case 'metadata': case 'other': case 'error':
            default: return <GenericFileViewer {...commonViewerProps} />;
        }
    };

    // --- Particle Config ---
    const particleOptions = React.useMemo(() => {
        const baseConfig = { fpsLimit: 60, interactivity: { events: { onClick: { enable: false }, onHover: { enable: true, mode: "repulse" }, resize: true }, modes: { repulse: { distance: 80, duration: 0.4 } } }, particles: { links: { distance: 100, enable: true, width: 1 }, move: { direction: "none", enable: true, outModes: { default: "out" }, random: true, speed: 0.5, straight: false }, number: { density: { enable: true, area: 900 }, value: 40 }, shape: { type: "circle" }, size: { value: { min: 1, max: 2.5 } } }, detectRetina: true, background: { color: "transparent" } };
        switch(theme) {
            case 'cyberpunk': case 'matrix-code': return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#0ff", "#f0f", "#0f0"] }, links: { ...baseConfig.particles.links, color: "#0ff", opacity: 0.15 }, opacity: { value: { min: 0.2, max: 0.6 } } } };
            case 'dark-luxe': return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#D4AF37", "#C0C0C0", "#A0A0A0"] }, links: { ...baseConfig.particles.links, color: "#B0B0C0", opacity: 0.08 }, opacity: { value: { min: 0.1, max: 0.4 } } } };
            case 'glassmorphism': case 'minimal-light': return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#a0a0ff", "#a0d0ff", "#c0c0ff"] }, links: { ...baseConfig.particles.links, color: "#c0c0c0", opacity: 0.2 }, opacity: { value: { min: 0.3, max: 0.7 } } } };
            case 'pastel-dream': return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#FFB6C1", "#ADD8E6", "#98FB98"] }, links: { ...baseConfig.particles.links, color: "#DDA0DD", opacity: 0.15 }, opacity: { value: { min: 0.2, max: 0.6 } } } };
            case 'sunset-gradient': return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#FFA07A", "#FF6347", "#FF4500"] }, links: { ...baseConfig.particles.links, color: "#FF7F50", opacity: 0.1 }, opacity: { value: { min: 0.2, max: 0.5 } } } };
            case 'retro-terminal': return { ...baseConfig, interactivity: { ...baseConfig.interactivity, onHover: { enable: false }}, particles: { ...baseConfig.particles, number: { value: 20 }, color: { value: ["#00FF00"] }, links: { enable: false }, opacity: { value: 0.7 }, size: { value: 1.5 } } };
            default: return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: "#ffffff" }, links: { color: "#ffffff", opacity: 0.1 }, opacity: { value: { min: 0.1, max: 0.4 } } } };
        }
    }, [theme]);


    // --- Render ---
    return (
        <TooltipProvider delayDuration={200}>
            <div ref={constraintsRef} className={cn('flex flex-col min-h-screen font-sans transition-colors duration-300 overflow-x-hidden relative')}>
                {/* Background Elements */}
                 <div className="fixed inset-0 -z-20 overflow-hidden">
                    <motion.div className={cn("absolute inset-0 transition-opacity duration-1000", { /* theme backgrounds */ }[theme] ?? "bg-[hsl(var(--background))]")} style={{ backgroundSize: '200% 200%' }} animate={['cyberpunk', 'sunset-gradient', 'dark-luxe'].includes(theme) ? { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] } : {}} transition={['cyberpunk', 'sunset-gradient', 'dark-luxe'].includes(theme) ? { duration: 25, repeat: Infinity, ease: "linear" } : {}} />
                    <div className={cn("absolute inset-0 bg-grid opacity-20", { /* theme grid opacity */ })} style={{ /* grid styles */ }}></div>
                    {particlesInit && <Particles id="tsparticles" options={particleOptions as any} className="absolute inset-0 pointer-events-none" />}
                </div>

                {/* Header */}
                <Header
                    ref={headerRef} xp={xp} activeTab={activeTab} setActiveTab={setActiveTab}
                    currentTheme={theme} setTheme={setTheme} availableThemes={themes}
                />

                {/* Main Content Area */}
                <main className="container mx-auto flex flex-col flex-grow p-4 md:p-6 space-y-6 relative z-10 pt-20 md:pt-24"> {/* Increased top padding */}
                    {/* Feature Banner */}
                     {!mainUploadedFile && activeTab === "upload" && !isMainProcessing && <FeatureBanner />}

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {/* --- Upload Tab --- */}
                        {activeTab === "upload" && (
                            <motion.div key="upload-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none mt-4 space-y-6">
                                {/* Renders UploadArea OR Viewer+Accordion based on mainUploadedFile */}
                                <FileInteractionManager
                                    setIsProcessing={setIsMainProcessing} // Renamed prop for clarity
                                    onFileProcessed={handleFileProcessed}
                                    saveUploadHistory={saveUploadHistory}
                                    xp={xp}
                                    setXp={setXp}
                                    toast={toast}
                                    // FileInteractionManager now uses its own internal state for the current file
                                    // This setup allows FIM to manage its view (upload vs interaction)
                                    // based on its internal `internalUploadedFile` state.
                                    // We pass the initial `mainUploadedFile` only if needed for loading from history.
                                    // initialFile={mainUploadedFile} // Optional prop if needed
                                />
                            </motion.div>
                        )}

                        {/* --- History Tab --- */}
                        {activeTab === "history" && (
                            <motion.div key="history-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none mt-4">
                                <Card className="glassmorphism h-full flex flex-col">
                                    <CardHeader> <CardTitle className="text-[hsl(var(--primary))]">Access Logs</CardTitle> <CardDescription className="text-[hsl(var(--muted-foreground))]">Review and reload previous uploads.</CardDescription> </CardHeader>
                                    <CardContent className="flex-grow p-4">
                                        {uploadHistory.length === 0 ? ( <p className="text-center text-[hsl(var(--muted-foreground))] italic">No history records found.</p> )
                                         : ( <ScrollArea className="h-[calc(60vh-100px)] pr-3 scrollbar-thin"> <ul className="space-y-3"> {uploadHistory.map(file => {
                                             const FileIconComponent = getFileIcon(file.name);
                                             return ( <li key={file.id} className="flex items-center justify-between p-3 border border-[hsl(var(--border)/0.3)] rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] hover:bg-[hsl(var(--accent)/0.1)] transition-colors"> <div className="flex items-center space-x-2 overflow-hidden mr-2"><FileIconComponent className="w-4 h-4 shrink-0 text-muted-foreground"/> <span className="truncate text-sm" title={file.name}>{file.name}</span> </div> <ShadcnButton variant="outline" size="sm" onClick={() => loadFileFromHistory(file.id)}>Load</ShadcnButton> </li>)
                                            })} </ul> </ScrollArea> )}
                                        {uploadHistory.length > 0 && ( <div className="mt-4 pt-4 border-t border-[hsl(var(--border)/0.5)] text-center"> <ShadcnButton variant="destructive" size="sm" onClick={clearUploadHistory}>Clear All History</ShadcnButton> </div> )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                         {/* --- Settings Tab --- */}
                         {activeTab === "settings" && (
                              <motion.div key="settings-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none mt-4">
                                  <Card className="glassmorphism h-full">
                                     <CardHeader> <CardTitle className="text-[hsl(var(--primary))]">Preferences</CardTitle> <CardDescription className="text-[hsl(var(--muted-foreground))]">Configure interface appearance.</CardDescription> </CardHeader>
                                     <CardContent className="grid gap-6 p-6">
                                         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4 border border-[hsl(var(--border))] p-4 rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] backdrop-blur-sm">
                                             <div className="space-y-0.5 flex-shrink-0"> <Label htmlFor="theme-select" className="text-base font-medium text-[hsl(var(--foreground))]">Visual Theme</Label> <p className="text-sm text-[hsl(var(--muted-foreground))]">Select the interface appearance.</p> </div>
                                              <Select value={theme} onValueChange={(value) => setTheme(value as ThemeId)} disabled={!hasHydrated}> <SelectTrigger id="theme-select" className="w-full sm:w-[220px]"> <SelectValue placeholder={!hasHydrated ? "Loading..." : "Select Theme"} /> </SelectTrigger> <SelectContent> <SelectGroup> <SelectLabel>Select Theme</SelectLabel> {themes.map((t) => ( <SelectItem key={t.id} value={t.id}><span className='mr-2 text-lg leading-none'>{t.icon}</span> {t.name}</SelectItem> ))} </SelectGroup> </SelectContent> </Select>
                                         </div>
                                          {/* Add other settings here */}
                                     </CardContent>
                                 </Card>
                             </motion.div>
                         )}

                        {/* --- FAQ Tab --- */}
                        {activeTab === "faq" && (
                            <motion.div key="faq-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none mt-4">
                                <Card className="glassmorphism h-full flex flex-col">
                                    <CardHeader> <CardTitle className="text-[hsl(var(--primary))]">Knowledge Base</CardTitle> <CardDescription className="text-[hsl(var(--muted-foreground))]">Frequently Asked Questions.</CardDescription> </CardHeader>
                                    <CardContent className="flex-grow p-0"> <ScrollArea className="h-full max-h-[65vh] p-6 scrollbar-thin"> <FAQPage /> </ScrollArea> </CardContent>
                                 </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>

                {/* Footer */}
                <Footer />

                 {/* --- Floating Chat Button --- */}
                 {/* Only show button if a file is loaded and chat isn't already open */}
                 {mainUploadedFile && (
                     <div className="fixed bottom-6 right-6 z-50">
                       <FloatingButton onClick={() => setShowChat(true)} isVisible={!showChat}>
                             <Bot className="h-5 w-5" />
                         </FloatingButton>
                     </div>
                 )}

                  {/* --- Chat Window Modal --- */}
                  {/* This is conditionally rendered by showChat state */}
                 <AnimatePresence>
                   {showChat && mainUploadedFile && ( // Ensure file exists before rendering chat
                     <motion.div
                       key="chat-window"
                       variants={floatingChatVariants}
                       initial="hidden" animate="visible" exit="exit"
                       className={cn(
                         "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40", // Centered at bottom
                         "w-[90vw] max-w-lg",
                         "h-[65vh] max-h-[550px]"
                       )}
                       drag={isDesktop} // Only draggable on desktop
                       dragConstraints={constraintsRef}
                       dragElastic={0.1}
                       dragMomentum={false}
                       style={{ cursor: isDesktop ? 'grab' : 'default' }}
                       whileDrag={{ cursor: 'grabbing' }}
                     >
                       <Card className={cn(
                           "h-full w-full flex flex-col",
                           "p-0 overflow-hidden shadow-2xl border border-[hsl(var(--border)/0.7)] relative",
                           "bg-[hsl(var(--background)/0.9)] backdrop-blur-md"
                         )}
                       >
                         {/* ChatSection managed internally by FileInteractionManager */}
                          {/* Pass necessary props IF ChatSection is rendered here */}
                          {/* Example - needs state management lift-up if used here */}
                          {/* <ChatSection
                              chatHistory={chatHistory}
                              isChatLoading={isChatLoading}
                              uploadedFile={mainUploadedFile}
                              onSendMessage={handleSendMessageFromPage} // Need separate handler if chat state is here
                          /> */}
                           <p className="p-4 text-center text-muted-foreground">Chat is managed within the Upload/Interact area.</p>
                          <ShadcnButton
                              variant="ghost" size="icon"
                              className="absolute top-2 right-2 h-7 w-7 text-[hsl(var(--muted-foreground))] hover:bg-destructive/10 hover:text-destructive z-10"
                              onClick={() => setShowChat(false)}
                              aria-label="Close chat"
                          >
                              <X className="h-4 w-4"/>
                          </ShadcnButton>
                       </Card>
                     </motion.div>
                   )}
                 </AnimatePresence>

            </div> {/* Closing outermost div */}
        </TooltipProvider> // Closing TooltipProvider
    ); // Closing return statement parenthesis
} // <<<<< Closing brace for the Home component function
