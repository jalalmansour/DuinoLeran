'use client';

// --- Core React & Next.js ---
import React, { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

// --- Utilities & Hooks ---
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast'; // Import UseToast type if passing toast func
import { useThemeStore, themes, useHasHydrated, type ThemeId } from '@/hooks/useThemeStore';

// --- Custom Components & Types ---
import Header, { type ActiveTabValue } from '@/components/header';
import Footer from '../components/footer';

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

// Dynamically import the components
const UploadInteract = dynamic(() => import('@/components/upload/UploadInteract'), {
  loading: () => <p>Loading...</p>,
  ssr: false, // Disable server-side rendering for this component
});

interface HomeProps {
}

// --- Main Component ---
export default function Home(props: HomeProps) {
  const hasHydrated = useHasHydrated();
  // --- Theme State ---
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  // --- Other State ---
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadedFile[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTabValue>("upload");
  const [xp, setXp] = useState<number>(0);

  // --- Refs ---
  const { toast } = useToast();

  // --- Effects ---
  useEffect(() => { // Load initial state (history, XP)
    try { const storedHistory = localStorage.getItem('uploadHistory'); if (storedHistory) setUploadHistory(JSON.parse(storedHistory)); } catch (e) { console.error('Failed to parse upload history:', e); localStorage.removeItem('uploadHistory'); }
    try { const storedXp = localStorage.getItem('userXp'); if (storedXp) setXp(parseInt(storedXp, 10) || 0); } catch (e) { console.error('Failed to parse user XP:', e); localStorage.removeItem('userXp'); }
  }, []);

  useEffect(() => { localStorage.setItem('userXp', xp.toString()); }, [xp]); // Save XP

  // --- Handlers ---
  const handleFileUploaded = useCallback((file: UploadedFile) => {
    setUploadedFile(file);
  }, []);

  return (
    
      
       

        {/* Header */}
        <Header
          xp={xp},
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentTheme={theme}
          setTheme={setTheme}
          availableThemes={themes}
        >
          {/* Title - Themed */}
          
            DuinoCourse AI
            
          
        </Header>

        {/* Main Content Area */}
        <main className="container mx-auto flex flex-col flex-grow p-4 md:p-6 space-y-6 relative z-10 pt-24">

          {/* Content Area with Conditional Rendering & Animation */}
          
            {activeTab === "upload" && (
              
                <UploadInteract uploadedFile={uploadedFile} setUploadedFile={setUploadedFile} xp={xp} setXp={setXp} activeTab={activeTab} uploadHistory={uploadHistory} setUploadHistory={setUploadHistory} toast={toast} setActiveTab={setActiveTab} />
              
            )}
            {activeTab === "history" && (
              
                History
              
            )}
            {activeTab === "settings" && (
              
                Settings
              
            )}
            {activeTab === "faq" && (
              
                FAQ
              
            )}
          
        
        {/* Footer */}
        <Footer />

      
    
  );
}
