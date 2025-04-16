// src/components/viewers/AudioViewer.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UploadedFile { /* ... same interface ... */ }
interface ViewerProps { file: UploadedFile; }

const AudioViewer: React.FC<ViewerProps> = ({ file }) => {
   // Content might be metadata or placeholder text
   const metadata = file.content?.metadata || file.content || "No details available.";
   const transcript = file.content?.transcript || null; // Assuming transcript might be added

  return (
    <Card className="w-full glassmorphism">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--primary))]">Audio: {file.name}</CardTitle>
         <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
             Type: {file.type} | Content Type: {file.contentType}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <h4 className="font-semibold mb-1 text-[hsl(var(--foreground))]">Media Information:</h4>
         <pre className="text-xs bg-[hsl(var(--muted)/0.3)] p-3 rounded border border-[hsl(var(--border))] mb-4">
             {metadata}
         </pre>

         {/* Placeholder for actual audio player if source available */}
         <div className="text-center p-4 border rounded bg-muted/20 text-muted-foreground italic text-sm">
            [Audio Player Placeholder]
         </div>

         {transcript && (
            <>
                <h4 className="font-semibold mt-4 mb-1 text-[hsl(var(--foreground))]">Transcript:</h4>
                 <ScrollArea className="h-40 border rounded p-3 scrollbar-thin">
                    {/* TODO: Implement clickable transcript viewer */}
                    <pre className="text-sm whitespace-pre-wrap">{transcript}</pre>
                 </ScrollArea>
            </>
         )}
         {/* TODO: Implement Key Moment Extractor, Quiz Builder, Summarization Panel */}
         <div className="mt-4 text-center text-xs text-muted-foreground italic">
            [Interactive audio features placeholder]
         </div>
      </CardContent>
    </Card>
  );
};
export default AudioViewer;