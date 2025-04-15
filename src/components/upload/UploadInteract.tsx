// src/components/upload/UploadInteract.tsx
import React, { useState, useCallback } from 'react';
import UploadArea from '@/components/upload/UploadArea';
import SummarySection from '@/components/summary/SummarySection';
import { cn } from '@/lib/utils';

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

interface UploadInteractProps {
  uploadedFile: UploadedFile | null;
  setUploadedFile: (file: UploadedFile | null) => void;
  xp: number;
  setXp: (xp: number) => void;
  activeTab: string;
  uploadHistory: UploadedFile[];
  setUploadHistory: (history: UploadedFile[]) => void;
  toast: any; // Replace 'any' with the correct type for your toast function
  setActiveTab: (tab: string) => void;
}

const UploadInteract: React.FC<UploadInteractProps> = ({ uploadedFile, setUploadedFile, xp, setXp, activeTab, uploadHistory, setUploadHistory, toast, setActiveTab }) => {
  const [summary, setSummary] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false); // Used for AI analysis indicator
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('Idle'); // More descriptive status
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);

  // --- Handlers ---
  const handleFileUploaded = useCallback((file: UploadedFile) => {
    setUploadedFile(file);
    setActiveTab("upload"); // Switch to upload tab
  }, [setUploadedFile, setActiveTab]);


  return (
    
      
        <UploadArea onFileUploaded={handleFileUploaded} />
      
      
        
          Uploaded File: {uploadedFile?.name}
          Summary Section
        
      
    
  );
};

export default UploadInteract;
