// src/components/viewers/GenericFileViewer.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface UploadedFile {
    id: string; name: string; type: string; size: number; lastModified: number;
    content: any; // Can be anything
    contentType: string; // Original detected type
}

interface ViewerProps {
  file: UploadedFile;
}

const GenericFileViewer: React.FC<ViewerProps> = ({ file }) => {
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
        <p className="text-sm mb-2 text-[hsl(var(--foreground))]">
          A specific viewer for this file type ({file.contentType}) is not available or an error occurred. Displaying basic information.
        </p>
        <h4 className="font-semibold mt-4 mb-1 text-[hsl(var(--foreground))]">Processed Content Preview:</h4>
        <pre className="text-xs bg-[hsl(var(--muted)/0.3)] p-3 rounded border border-[hsl(var(--border))] max-h-60 overflow-auto scrollbar-thin">
          {/* Attempt to stringify content safely */}
          {typeof file.content === 'object' ? JSON.stringify(file.content, null, 2) : String(file.content).substring(0, 1000)}
          {String(file.content).length > 1000 && '... (truncated)'}
        </pre>
      </CardContent>
    </Card>
  );
};

// Exporting default for dynamic import
export default GenericFileViewer;