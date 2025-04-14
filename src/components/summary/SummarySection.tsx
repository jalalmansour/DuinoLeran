// src/components/summary/SummarySection.tsx
import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronsDown, ChevronsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface SummarySectionProps {
  summary: string;
  isSummarizing: boolean;
  uploadedFile: { name: string } | null;
  isSummaryCollapsed: boolean;
  setIsSummaryCollapsed: (collapsed: boolean) => void;
}

const MemoizedMarkdown = React.memo(({ content }: { content: string }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none">
    <ReactMarkdown
      children={content}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h1: ({ node, ...props }) => (
          <h1 className="text-4xl text-purple-400 mb-4" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-3xl text-pink-400 mb-3" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-2xl text-teal-300 mb-2" {...props} />
        ),
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline ? (
            <pre className={cn(className, 'bg-gray-800 dark:bg-gray-900 rounded p-3 my-3 overflow-x-auto')} {...props}>
              <code className={cn("text-sm", match ? `language-${match[1]}` : '')}>{children}</code>
            </pre>
          ) : (
            <code className={cn(className, "bg-gray-700 dark:bg-gray-600 px-1 py-0.5 rounded text-yellow-300 dark:text-yellow-400")} {...props}>
              {children}
            </code>
          );
        },
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto">
            <table className="table-auto border-collapse border border-gray-400 dark:border-gray-600 w-full my-3 text-sm" {...props} />
          </div>
        ),
        th: ({ node, ...props }) => <th className="border border-gray-300 dark:border-gray-700 px-2 py-1 bg-gray-100 dark:bg-gray-800 font-medium" {...props} />,
        td: ({ node, ...props }) => <td className="border border-gray-300 dark:border-gray-700 px-2 py-1" {...props} />,
      }}
    />
  </div>
));
MemoizedMarkdown.displayName = 'MemoizedMarkdown';

const SummarySection: React.FC<SummarySectionProps> = ({
  summary,
  isSummarizing,
  uploadedFile,
  isSummaryCollapsed,
  setIsSummaryCollapsed,
}) => {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Summary
          {uploadedFile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
            >
              {isSummaryCollapsed ? (
                <ChevronsDown className="h-4 w-4" />
              ) : (
                <ChevronsUp className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isSummaryCollapsed ? 'Expand' : 'Collapse'} Summary
              </span>
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          AI-generated summary of the document.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(isSummaryCollapsed ? 'h-0' : 'h-auto', 'overflow-hidden transition-all duration-300')}>
        {isSummarizing ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Summarizing...
            </p>
          </div>
        ) : (
          <>
            {summary ? (
              <>
                <h3 className="text-lg font-semibold mb-2">Document Summary</h3>
                <MemoizedMarkdown content={summary} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {uploadedFile
                  ? 'Summarizing document...'
                  : 'Upload a document to see its summary.'}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SummarySection;