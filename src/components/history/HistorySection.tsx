import React, { useCallback } from 'react';
import {
  Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { type UploadedFile } from '@/app/page'; // Assuming the interface is in page.tsx
import { getFileIcon } from '@/components/upload/UploadArea'; // Import from correct location
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area'; // Import ScrollArea

interface HistorySectionProps {
  uploadHistory: UploadedFile[];
  onFileSelected: (fileId: string) => void; // Callback when a file is clicked to load
  onClearHistory: () => void; // Callback to clear history
}

const HistorySection: React.FC<HistorySectionProps> = ({
  uploadHistory,
  onFileSelected,
  onClearHistory,
}) => {
  const { toast } = useToast();

  // Confirmation dialog logic could be added here if desired before clearing

  return (
    <Card className="h-full flex flex-col glassmorphism"> {/* Ensure full height and flex */}
      <CardHeader>
        <CardTitle className="text-[hsl(var(--primary))]">Access Logs</CardTitle>
        <CardDescription className="text-[hsl(var(--muted-foreground))]">
          Review and reload recently uploaded files.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0"> {/* Allow content to grow and hide overflow */}
        {uploadHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
             <p className="text-sm text-muted-foreground italic">
                No upload history found. Upload a file to get started.
             </p>
          </div>
        ) : (
          // Make ScrollArea take remaining space
          <ScrollArea className="h-full p-4 scrollbar-thin">
              <ul className="space-y-3">
                 {uploadHistory.map((file) => {
                   const FileIconComponent = getFileIcon(file.name);
                   return (
                     <li
                       key={file.id}
                       className="flex items-center justify-between p-3 border border-[hsl(var(--border)/0.3)] rounded-[var(--radius)] bg-[hsl(var(--card)/0.5)] hover:bg-[hsl(var(--accent)/0.1)] transition-colors"
                     >
                       <div className="flex items-center space-x-2 overflow-hidden mr-2">
                          {React.createElement(FileIconComponent, { className: 'h-4 w-4 shrink-0 text-muted-foreground' })}
                          <div className="overflow-hidden">
                              <p className="text-sm font-medium leading-none truncate" title={file.name}>
                                 {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                 {(file.size / 1024).toFixed(1)} KB - {new Date(file.lastModified).toLocaleDateString()}
                              </p>
                           </div>
                       </div>
                       <Button
                         variant="outline" // Changed for better visual separation
                         size="sm"
                         onClick={() => onFileSelected(file.id)}
                       >
                         Load
                       </Button>
                     </li>
                   );
                 })}
              </ul>
           </ScrollArea>
        )}
      </CardContent>
      {uploadHistory.length > 0 && (
        <CardFooter className="p-4 border-t border-[hsl(var(--border)/0.5)] justify-center">
           {/* Add confirmation dialog here if needed */}
          <Button variant="destructive" size="sm" onClick={onClearHistory}>
            Clear All History
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default HistorySection;
