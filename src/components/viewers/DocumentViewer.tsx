// src/components/viewers/DocumentViewer.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// Import Markdown renderer if needed (assuming MemoizedMarkdown exists)
// import MemoizedMarkdown from '@/components/MemoizedMarkdown'; // Adjust path

interface UploadedFile { /* ... same interface ... */ }
interface ViewerProps { file: UploadedFile; }

const DocumentViewer: React.FC<ViewerProps> = ({ file }) => {
  return (
    <Card className="w-full glassmorphism">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--primary))]">Document: {file.name}</CardTitle>
        <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
             Type: {file.type} | Content Type: {file.contentType}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <h4 className="font-semibold mb-2 text-[hsl(var(--foreground))]">Extracted Text:</h4>
        <ScrollArea className="h-[50vh] border rounded p-4 bg-[hsl(var(--background))] scrollbar-thin">
           {/* Render extracted text. Use Markdown if applicable, otherwise pre */}
          <pre className="text-sm whitespace-pre-wrap font-sans">
            {file.content || '*No text content extracted*'}
          </pre>
           {/* TODO: Implement Summary Container, Explainers, Quote Highlighter, Glossary etc. */}
        </ScrollArea>
         <div className="mt-4 text-center text-xs text-muted-foreground italic">
            [Interactive document features placeholder]
         </div>
      </CardContent>
    </Card>
  );
};
export default DocumentViewer;