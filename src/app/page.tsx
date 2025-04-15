// src/app/page.tsx
'use client';

// --- Core React & Next.js ---
import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// --- Libraries ---
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

// --- UI Components ---
import { TooltipProvider } from '@/components/ui/tooltip'; // Import TooltipProvider
import { Button as ShadcnButton } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// --- Icons ---
import { Download, MessageSquare, Upload, Rocket, Loader2 } from 'lucide-react'; // Add necessary icons

// --- Utilities & Hooks ---
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useThemeStore, themes, useHasHydrated, type ThemeId } from '@/hooks/useThemeStore';

// --- Custom Components & Types ---
import Header, { type ActiveTabValue } from '@/components/header';
import Footer from '@/components/footer';
// Dynamically import the main interaction component
const UploadInteract = dynamic(() => import('@/components/upload/UploadInteract'), {
    loading: () => ( // Basic loading indicator
        <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
            <p className="ml-2 text-[hsl(var(--muted-foreground))]">Loading Interface...</p>
        </div>
    ),
    ssr: false, // Important: Disable server-side rendering
});
// Dynamically import FAQ page if it's large or uses client-only features extensively
const FAQPage = dynamic(() => import('./faq'), { ssr: true }); // Can be SSR if simple

// --- Interfaces ---
interface UploadedFile {
    id: string;
    name: string;
    type: string;
    size: number;
    lastModified: number;
    content: string;
    contentType: 'text' | 'list' | 'metadata' | 'image' | 'error' | 'other';
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// --- Constants & Helpers ---
const MAX_FILE_SIZE_MB = 50; // Define if needed by UploadInteract or here

// --- Framer Motion Variants ---
const tabContentVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } }, exit: { opacity: 0, x: 10, transition: { duration: 0.2, ease: 'easeIn' } } };

// --- Main Component ---
export default function Home() {
    const hasHydrated = useHasHydrated();
    // --- Theme State ---
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    // --- Application State ---
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null); // Managed here, passed to UploadInteract
    const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([]);      // Managed here, passed to UploadInteract
    const [activeTab, setActiveTab] = useState<ActiveTabValue>("upload");
    const [xp, setXp] = useState<number>(0); // Managed here, passed to UploadInteract for updates

    // --- Refs ---
    const { toast } = useToast(); // Toast can be passed down
    const headerRef = useRef<HTMLElement>(null); // Ref for header animations

    // --- Effects ---
    useEffect(() => { // Load initial state (history, XP)
        try { const storedHistory = localStorage.getItem('uploadHistory'); if (storedHistory) setUploadHistory(JSON.parse(storedHistory)); } catch (e) { console.error('Failed to parse upload history:', e); localStorage.removeItem('uploadHistory'); }
        try { const storedXp = localStorage.getItem('userXp'); if (storedXp) setXp(parseInt(storedXp, 10) || 0); } catch (e) { console.error('Failed to parse user XP:', e); localStorage.removeItem('userXp'); }
    }, []);

    useEffect(() => { // Save XP when it changes
        // Ensure we only save *after* hydration to avoid overwriting initial load
        if (xp > 0 || localStorage.getItem('userXp')) { // Check if XP has been set or was loaded
           localStorage.setItem('userXp', xp.toString());
        }
    }, [xp]);

    // Particle initialization effect
    const [particlesInit, setParticlesInit] = useState(false);
    useEffect(() => {
        initParticlesEngine(async (engine) => { await loadSlim(engine); }).then(() => setParticlesInit(true));
    }, []);

    // Header scroll animation effect
    const { scrollY } = useScroll();
    const underlineScaleX = useTransform(scrollY, [0, 50], [0, 1], { clamp: false });

    // --- Callbacks (Centralized Here, Pass Down if Needed) ---
    const saveUploadHistory = useCallback((file: UploadedFile) => {
      setUploadHistory((prev) => {
        if (prev.some(i => i.name === file.name && i.lastModified === file.lastModified)) return prev;
        const newHistory = [file, ...prev].slice(0, 15);
        try { localStorage.setItem('uploadHistory', JSON.stringify(newHistory)); }
        catch (e: any) { toast({ title: 'Error Saving History', variant: 'warning' }); return prev; }
        return newHistory;
      });
    }, [toast]);

    const clearUploadHistory = useCallback(() => {
      setUploadHistory([]); localStorage.removeItem('uploadHistory'); toast({ title: 'History Cleared', variant: 'info' });
    }, [toast]);

     const loadFileFromHistory = useCallback(async (fileId: string) => {
        const fileToLoad = uploadHistory.find(f => f.id === fileId);
        if (fileToLoad) {
          if (!fileToLoad.content) { toast({ title: 'Content Missing', variant: 'warning' }); return; }
          setUploadedFile(fileToLoad); // Set the file
          setActiveTab("upload");      // Switch to the upload tab
          toast({ title: 'File Loaded from History', description: `Loading ${fileToLoad.name}...`, variant: 'info' });
          // UploadInteract component will likely handle triggering summary/analysis when uploadedFile changes
        } else { toast({ title: 'Error Loading File', variant: 'destructive' }); }
      }, [uploadHistory, toast, setActiveTab]);


    // --- Particle Config (Themeable) ---
    const particleOptions = React.useMemo(() => {
        const baseConfig = { fpsLimit: 60, interactivity: { events: { onClick: { enable: false }, onHover: { enable: true, mode: "repulse" }, resize: true }, modes: { repulse: { distance: 80, duration: 0.4 } } }, particles: { links: { distance: 100, enable: true, width: 1 }, move: { direction: "none", enable: true, outModes: { default: "out" }, random: true, speed: 0.5, straight: false }, number: { density: { enable: true, area: 900 }, value: 40 }, shape: { type: "circle" }, size: { value: { min: 1, max: 2.5 } } }, detectRetina: true, background: { color: "transparent" } };
        switch(theme) {
            case 'cyberpunk': case 'matrix-code': return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#0ff", "#f0f", "#0f0"] }, links: { ...baseConfig.particles.links, color: "#0ff", opacity: 0.15 }, opacity: { value: { min: 0.2, max: 0.6 } } } };
            case 'dark-luxe': return { ...baseConfig, particles: { ...baseConfig.particles, color: { value: ["#D4AF37", "#C0C0C0", "#A0A0A0"] }, links: { ...baseConfig.particles.links, color: "#B0B0B0", opacity: 0.08 }, opacity: { value: { min: 0.1, max: 0.4 } } } };
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
            <div className={cn('flex flex-col min-h-screen font-sans transition-colors duration-300')}>
                {/* Background Elements */}
                 <div className="fixed inset-0 -z-20 overflow-hidden">
                    <motion.div className={cn("absolute inset-0 transition-opacity duration-1000", { /* ... theme backgrounds ... */ }[theme] ?? "bg-[hsl(var(--background))]")} /* ... animation ... */ />
                    <div className={cn("absolute inset-0 bg-grid opacity-20", { /* ... theme grid opacity ... */ })} style={{ /* grid styles in globals.css */ }}></div>
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
                    {/* Title */}
                    <motion.h1 className="text-2xl md:text-3xl font-bold tracking-tighter gradient-text filter drop-shadow-[0_0_5px_hsla(var(--primary),0.4)] py-1 relative" style={{ fontFamily: 'var(--font-display, var(--font-sans))' }}>
                        DuinoCourse AI
                        <motion.div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[hsl(var(--primary))] to-transparent shadow-[0_0_8px_hsl(var(--primary))]" style={{ scaleX: underlineScaleX, originX: 0.5 }}/>
                    </motion.h1>
                </Header>

                {/* Main Content Area */}
                <main className="container mx-auto flex flex-col flex-grow p-4 md:p-6 space-y-6 relative z-10 pt-60">
                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {activeTab === "upload" && (
                            <motion.div key="upload-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none">
                                {/* Pass necessary props down to the UploadInteract component */}
                                <UploadInteract
                                    uploadedFile={uploadedFile}
                                    setUploadedFile={setUploadedFile}
                                    saveUploadHistory={saveUploadHistory} // Pass save function down
                                    xp={xp}
                                    setXp={setXp} // Pass XP setter down
                                    toast={toast} // Pass toast function
                                />
                            </motion.div>
                        )}

                        {activeTab === "history" && (
                            <motion.div key="history-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none">
                                {/* History Component Placeholder/Implementation */}
                                <Card className="glassmorphism h-full flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="text-[hsl(var(--primary))]">Access Logs</CardTitle>
                                        <CardDescription className="text-[hsl(var(--muted-foreground))]">Review and reload previous uploads.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow p-4">
                                        {uploadHistory.length === 0 ? (
                                            <p className="text-center text-[hsl(var(--muted-foreground))] italic">No history records found.</p>
                                        ) : (
                                            <ul className="space-y-3">
                                                {uploadHistory.map(file => (
                                                    <li key={file.id} className="flex items-center justify-between p-3 border border-[hsl(var(--border))] rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)]">
                                                        <span className="truncate text-sm" title={file.name}>{file.name}</span>
                                                        <ShadcnButton variant="outline" size="sm" onClick={() => loadFileFromHistory(file.id)}>Load</ShadcnButton>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {uploadHistory.length > 0 && (
                                           <div className="mt-4 text-center">
                                              <ShadcnButton variant="destructive" size="sm" onClick={clearUploadHistory}>Clear All History</ShadcnButton>
                                           </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === "settings" && (
                             <motion.div key="settings-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none">
                                 <Card className="glassmorphism h-full">
                                    <CardHeader>
                                        <CardTitle className="text-[hsl(var(--primary))]">Preferences</CardTitle>
                                        <CardDescription className="text-[hsl(var(--muted-foreground))]">Configure interface appearance.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6 p-6">
                                        {/* Theme Selector */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4 border border-[hsl(var(--border))] p-4 rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] backdrop-blur-sm">
                                            <div className="space-y-0.5 flex-shrink-0">
                                                 <Label htmlFor="theme-select" className="text-base font-medium text-[hsl(var(--foreground))]">Visual Theme</Label>
                                                 <p className="text-sm text-[hsl(var(--muted-foreground))]">Select the interface appearance.</p>
                                             </div>
                                             <Select value={theme} onValueChange={(value) => setTheme(value as ThemeId)} disabled={!hasHydrated}>
                                                 <SelectTrigger id="theme-select" className="w-full sm:w-[220px]">
                                                     <SelectValue placeholder={!hasHydrated ? "Loading..." : "Select Theme"} />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                     <SelectGroup>
                                                        <SelectLabel>Select Theme</SelectLabel>
                                                        {themes.map((t) => ( <SelectItem key={t.id} value={t.id}><span className='mr-2 text-lg leading-none'>{t.icon}</span> {t.name}</SelectItem> ))}
                                                     </SelectGroup>
                                                 </SelectContent>
                                             </Select>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === "faq" && (
                            <motion.div key="faq-content" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit" className="flex-grow flex flex-col outline-none">
                                <Card className="glassmorphism h-full flex flex-col">
                                    <CardHeader>
                                        <CardTitle className="text-[hsl(var(--primary))]">Knowledge Base</CardTitle>
                                        <CardDescription className="text-[hsl(var(--muted-foreground))]">Frequently Asked Questions.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow p-0">
                                       <ScrollArea className="h-full max-h-[65vh] p-6 scrollbar-thin">
                                           <FAQPage /> {/* Render the FAQ component */}
                                       </ScrollArea>
                                    </CardContent>
                                 </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </main>

                {/* Footer */}
                <Footer />
            </div>
        </TooltipProvider>
    );
}