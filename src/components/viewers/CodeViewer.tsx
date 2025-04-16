// src/components/viewers/CodeViewer.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// Import a syntax highlighter component or use CodeBlock defined earlier
// Example: import SyntaxHighlighter from 'react-syntax-highlighter';
// Example: import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
// OR import your CodeBlock component
// import CodeBlock from '@/components/CodeBlock';

interface UploadedFile { /* ... same interface ... */ }
interface ViewerProps { file: UploadedFile; }

const CodeViewer: React.FC<ViewerProps> = ({ file }) => {
  const language = file.name.split('.').pop() || 'plaintext';

  return (
    <Card className="w-full glassmorphism">
      <CardHeader>
        <CardTitle className="text-[hsl(var(--primary))]">Code: {file.name}</CardTitle>
        <CardDescription className="text-xs text-[hsl(var(--muted-foreground))]">
             Language detected: {language} | Content Type: {file.contentType}
        </CardDescription>
      </CardHeader>
      <CardContent>
         <ScrollArea className="h-[60vh] border rounded scrollbar-thin bg-[hsl(var(--muted)/0.2)]">
             {/* Use CodeBlock or SyntaxHighlighter */}
             <pre className="text-sm p-4 font-mono whitespace-pre-wrap">
                <code>{file.content || '*No code content available*'}</code>
             </pre>
             {/* <CodeBlock className={`language-${language}`}>{file.content}</CodeBlock> */}
             {/* TODO: Implement Explanation Tabs, Logic Flow Visualizer, Debug Helper */}
         </ScrollArea>
          <div className="mt-4 text-center text-xs text-muted-foreground italic">
            [Interactive code features placeholder]
         </div>
      </CardContent>
    </Card>
  );
};
export default CodeViewer;