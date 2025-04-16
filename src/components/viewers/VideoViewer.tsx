// src/components/viewers/VideoViewer.tsx
'use client';

import React from 'react';
// --- ADD Card Imports ---
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
// --- END Card Imports ---
import { ScrollArea } from '@/components/ui/scroll-area'; // Keep if transcript added

// Interface for the file prop (ensure it matches the one in page.tsx)
interface UploadedFile {
    id: string; name: string; type: string; size: number; lastModified: number;
    content: any; // Content can be metadata object or placeholder string
    contentType: 'document' | 'presentation' | 'code' | 'audio' | 'video' | 'book' | 'archive' | 'list' | 'metadata' | 'image' | 'error' | 'other';
}

interface ViewerProps {
  file: UploadedFile;
}

const VideoViewer: React.FC<ViewerProps> = ({ file }) => {
   // Attempt to parse metadata or use placeholder text
   const metadata = (typeof file.content === 'object' && file.content?.metadata)
                    ? file.content.metadata
                    : (typeof file.content === 'string' ? file.content : "No details available.");
   // Check for transcript if structure supports it
   const transcript = (typeof file.content === 'object' && file.content?.transcript)
                    ? file.content.transcript
                    : null;

  return (
    // Card component is now defined via import
    <Card className="w-full glassmorphism">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--primary))]">Video: {file.name}</CardTitle>
         <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
             Type: {file.type} | Content Type: {file.contentType}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <h4 className="font-semibold mb-1 text-[hsl(var(--foreground))]">Media Information:</h4>
         <pre className="text-xs bg-[hsl(var(--muted)/0.3)] p-3 rounded border border-[hsl(var(--border))] mb-4 max-h-40 overflow-auto scrollbar-thin">
             {metadata}
         </pre>

         {/* Placeholder for actual video player */}
         <div className="text-center p-4 border rounded bg-muted/20 text-muted-foreground italic text-sm aspect-video flex items-center justify-center">
            [Video Player Placeholder]
         </div>

         {/* Transcript Section (Optional) */}
         {transcript && (
            <>
                <h4 className="font-semibold mt-4 mb-1 text-[hsl(var(--foreground))]">Transcript:</h4>
                 <ScrollArea className="h-40 border rounded p-3 scrollbar-thin">
                    <pre className="text-sm whitespace-pre-wrap">{transcript}</pre>
                 </ScrollArea>
            </>
         )}
         {/* TODO: Implement AI Breakdown Panel, Visual Board */}
         <div className="mt-4 text-center text-xs text-muted-foreground italic">
            [Interactive video features placeholder]
         </div>
      </CardContent>
    </Card>
  );
};
export default VideoViewer;
