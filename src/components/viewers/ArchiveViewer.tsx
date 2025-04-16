// src/components/viewers/ArchiveViewer.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, File as FileIcon } from 'lucide-react'; // Icons for file list

interface UploadedFile { /* ... same interface ... */ }
interface ViewerProps { file: UploadedFile; }

const ArchiveViewer: React.FC<ViewerProps> = ({ file }) => {
   // Expect content to be an array of filenames or an error string
   const fileList = Array.isArray(file.content) ? file.content : [];
   const isError = typeof file.content === 'string' && file.content.startsWith('*Error');

  return (
    <Card className="w-full glassmorphism">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--primary))]">Archive: {file.name}</CardTitle>
         <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
             Type: {file.type} | Content Type: {file.contentType}
        </CardDescription>
      </CardHeader>
      <CardContent>
          <h4 className="font-semibold mb-2 text-[hsl(var(--foreground))]">Archive Contents:</h4>
          {isError ? (
             <p className="text-sm text-red-500">{file.content}</p>
          ) : fileList.length > 0 ? (
             <ScrollArea className="h-60 border rounded p-3 bg-[hsl(var(--muted)/0.2)] scrollbar-thin">
                 <ul className="space-y-1">
                    {fileList.map((name, index) => (
                        <li key={index} className="text-sm flex items-center text-[hsl(var(--foreground))]">
                            <FileIcon className="w-4 h-4 mr-2 text-muted-foreground shrink-0"/>
                            <span className="truncate">{name}</span>
                        </li>
                    ))}
                 </ul>
             </ScrollArea>
          ) : (
             <p className="text-sm text-muted-foreground italic">Could not list archive contents or archive is empty.</p>
          )}
          {/* TODO: Implement Content Map UI, Batch Explainer, Grouped Summary */}
          <div className="mt-4 text-center text-xs text-muted-foreground italic">
            [Interactive archive features placeholder]
         </div>
      </CardContent>
    </Card>
  );
};
export default ArchiveViewer;