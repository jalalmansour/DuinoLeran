// src/components/viewers/ImageViewer.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface UploadedFile { /* ... same interface ... */ }
interface ViewerProps { file: UploadedFile; }

const ImageViewer: React.FC<ViewerProps> = ({ file }) => {
  // TODO: Implement actual image display if a URL or data URI is available
  // For now, just displays the placeholder text

  return (
    <Card className="w-full glassmorphism">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--primary))]">Image: {file.name}</CardTitle>
         <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
             Type: {file.type} | Content Type: {file.contentType}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-4 border rounded bg-muted/20 text-center text-muted-foreground italic min-h-[200px] flex items-center justify-center">
           [Image Preview Placeholder - {file.name}]
           {/* <img src={file.content.url} alt={file.name} /> // If URL available */}
        </div>
         <p className="text-sm mt-2">{file.content || "*No image description available*"}</p>
         {/* TODO: Implement Image Annotator, Diagram Explainer, Interactive Hotspots */}
         <div className="mt-4 text-center text-xs text-muted-foreground italic">
            [Interactive image features placeholder]
         </div>
      </CardContent>
    </Card>
  );
};
export default ImageViewer;