// src/components/upload/UploadInteract.tsx
import React, { useState, useCallback } from 'react';
import UploadArea from '@/components/upload/UploadArea'; // Assuming this component exists and is imported
// You might need to import SummarySection here if it's separate
// import SummarySection from '@/components/summary/SummarySection';

// Define interfaces needed within this component or import them
interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string;
  contentType: 'text' | 'list' | 'metadata' | 'image' | 'error' | 'other';
}

interface UploadInteractProps {
  uploadedFile: UploadedFile | null;
  setUploadedFile: (file: UploadedFile | null) => void;
  saveUploadHistory: (file: UploadedFile) => void; // Make sure this prop is passed from Home
  xp: number;
  setXp: (updater: number | ((prevXp: number) => number)) => void; // Allow updater function
  toast: any; // Replace 'any' with the correct type for your toast function
  // Remove props that are likely managed in page.tsx unless needed here
  // activeTab: string;
  // uploadHistory: UploadedFile[];
  // setUploadHistory: (history: UploadedFile[]) => void;
  // setActiveTab: (tab: string) => void;
}

const UploadInteract: React.FC<UploadInteractProps> = ({
  uploadedFile,
  setUploadedFile,
  saveUploadHistory, // Receive the save function
  xp,
  setXp,
  toast,
}) => {
  // State related to summary/chat likely belongs here now
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  // ... potentially chat history, etc.

  // Callback to handle the file upload from UploadArea
  const handleFileUploaded = useCallback((file: UploadedFile) => {
    setUploadedFile(file);
    saveUploadHistory(file); // Save to history using the passed function
    // Trigger analysis or other actions needed within this component
    // e.g., call a local summarize function or pass the file up if needed
    toast({ title: 'File Ready in Interact', description: file.name });
  }, [setUploadedFile, saveUploadHistory, toast]); // Add dependencies

  // Placeholder for Summary Section rendering logic
  const renderSummarySection = () => {
      if (!uploadedFile) return null;
      // Replace with actual SummarySection component if available
      return (
         <div className="mt-4 p-4 border rounded bg-[hsl(var(--card)/0.5)]">
            <h3 className="font-semibold text-[hsl(var(--primary))] mb-2">AI Analysis Placeholder</h3>
            {isSummarizing ? (
                <p className='text-sm italic text-[hsl(var(--muted-foreground))]'>Analyzing...</p>
            ) : summary ? (
                 <p className='text-sm'>{summary.substring(0, 100)}...</p> // Show snippet
            ) : (
                 <p className='text-sm italic text-[hsl(var(--muted-foreground))]'>No analysis yet.</p>
            )}
         </div>
      );
  };


  return (
    // Wrap everything in a single root Fragment
    <>
      {/* Add a top margin to position below the header */}
      <div className="mt-24">
        {/* Render the UploadArea component */}
        {/* It calls handleFileUploaded when a file is ready */}
        <UploadArea onFileUploaded={handleFileUploaded} />
      </div>

      {/* Conditionally display info/summary after upload */}
      {uploadedFile && (
        <div className="mt-6 space-y-4"> {/* Add a wrapper div for layout */}
          {/* Display basic file info */}
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Loaded: <span className="font-medium text-[hsl(var(--foreground))]">{uploadedFile.name}</span> ({uploadedFile.contentType})
          </p>

          {/* Render the Summary Section */}
          {renderSummarySection()}

          {/* Placeholder for where the Chat interface would go */}
          <div className="mt-4 p-4 border rounded bg-[hsl(var(--card)/0.5)] text-center text-[hsl(var(--muted-foreground))] italic">
            Chat Interface Placeholder (if applicable within UploadInteract)
          </div>
        </div>
      )}
    </> // Close the root Fragment
  );
};

// Add the export statement
export default UploadInteract;
