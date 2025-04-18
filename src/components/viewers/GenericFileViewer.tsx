// src/components/viewers/GenericFileViewer.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
// --- ADDED IMPORT ---
import { AlertTriangle, Loader2 } from 'lucide-react';
// --- END ADDED IMPORT ---

interface UploadedFile {
    id: string; name: string; type: string; size: number; lastModified: number;
    content: any;
    contentType: string;
}

interface ViewerProps {
  file: UploadedFile;
}

const GenericFileViewer: React.FC<ViewerProps> = ({ file }) => {
  // Determine if content is still being processed (might be redundant if parent handles it)
  const isLoading = file.content === null || typeof file.content === 'undefined'; // Example loading check

  return (
    <Card className="w-full glassmorphism">
      <CardHeader>
        <CardTitle className="flex items-center text-[hsl(var(--primary))]">
          <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
          File Viewer: {file.name}
        </CardTitle>
        <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
          Type: {file.type || 'Unknown'} | Content Type: {file.contentType} | Size: {(file.size / 1024).toFixed(1)} KB
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Loading content...</span>
            </div>
        ) : (
            <>
                <p className="text-sm mb-2 text-[hsl(var(--foreground))]">
                    A specific viewer for this file type ({file.contentType}) is not available or an error occurred. Displaying basic information or raw content.
                </p>
                <h4 className="font-semibold mt-4 mb-1 text-[hsl(var(--foreground))]">Processed Content Preview:</h4>
                <pre className="text-xs bg-[hsl(var(--muted)/0.3)] p-3 rounded border border-[hsl(var(--border))] max-h-60 overflow-auto scrollbar-thin">
                    {typeof file.content === 'object' ? JSON.stringify(file.content, null, 2) : String(file.content).substring(0, 1000)}
                    {String(file.content).length > 1000 && '... (truncated)'}
                </pre>
            </>
        )}
      </CardContent>
    </Card>
  );
};

export default GenericFileViewer;
