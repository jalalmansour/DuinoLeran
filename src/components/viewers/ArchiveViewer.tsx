// src/components/viewers/ArchiveViewer.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// --- ADDED IMPORT ---
import { Folder, File as FileIcon, Loader2 } from 'lucide-react';
// --- END ADDED IMPORT ---

// Ensure interface matches the main one
interface UploadedFile {
    id: string; name: string; type: string; size: number; lastModified: number;
    content: any; // Expected to be string[] or error string here
    contentType: string;
}
interface ViewerProps { file: UploadedFile; }

const ArchiveViewer: React.FC<ViewerProps> = ({ file }) => {
   // Expect content to be an array of filenames or an error string
   const fileList = Array.isArray(file.content) ? file.content : [];
   const isError = typeof file.content === 'string' && file.content.startsWith('*Error');
   const isNote = typeof file.content === 'string' && file.content.startsWith('*Note'); // Handle placeholder notes

  return (
    <Card className="w-full glassmorphism">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--primary))]">Archive: {file.name}</CardTitle>
         <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
             Type: {file.type || 'Unknown'} | Content Type: {file.contentType}
        </CardDescription>
      </CardHeader>
      <CardContent>
          <h4 className="font-semibold mb-2 text-[hsl(var(--foreground))]">Archive Contents Preview:</h4>
          {isError ? (
             <p className="text-sm text-destructive bg-destructive/10 p-3 rounded border border-destructive/30">{file.content}</p>
          ) : isNote ? (
             <p className="text-sm text-muted-foreground italic bg-muted/20 p-3 rounded border border-border">{file.content}</p>
          ) : fileList.length > 0 ? (
             <ScrollArea className="h-60 border rounded p-3 bg-[hsl(var(--muted)/0.2)] scrollbar-thin">
                 <ul className="space-y-1">
                    {fileList.map((name, index) => (
                        <li key={index} className="text-sm flex items-center text-[hsl(var(--foreground))]">
                            {/* Heuristic for folder vs file based on trailing slash */}
                            {name.endsWith('/')
                               ? <Folder className="w-4 h-4 mr-2 text-muted-foreground shrink-0"/>
                               : <FileIcon className="w-4 h-4 mr-2 text-muted-foreground shrink-0"/>}
                            <span className="truncate">{name}</span>
                        </li>
                    ))}
                 </ul>
             </ScrollArea>
          ) : (
             // Add a loading state check here if needed
             <div className="flex items-center justify-center h-20 text-muted-foreground">
               {/* Example: If loading contents takes time */}
               {/* <Loader2 className="w-5 h-5 animate-spin mr-2" /> */}
               <p className="text-sm italic">Archive appears empty or contents could not be listed.</p>
             </div>
          )}
          <div className="mt-4 text-center text-xs text-muted-foreground italic">
            [Full archive extraction and interaction features coming soon]
         </div>
      </CardContent>
    </Card>
  );
};
export default ArchiveViewer;
