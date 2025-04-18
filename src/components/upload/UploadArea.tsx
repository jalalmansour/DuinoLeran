// src/components/upload/UploadArea.tsx
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileArchive,
  FileAudio,
  FileCode,
  FileText,
  FileImage,
  FileVideo,
  File as FileIcon,
  FileJson,
  FileSpreadsheet,
  Presentation,
  Book,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Combine basic info with the actual File object
interface FileUploadInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  file: File; // Add the actual File object
}

interface UploadAreaProps {
  // Update the prop to expect the richer FileUploadInfo
  onFileSelected: (fileInfo: FileUploadInfo) => void; // Renamed for clarity
  className?: string; // Allow additional styling
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_FILE_SIZE_MB = 100; // Increased limit slightly

// Icon mapping function (remains the same)
export function getFileIcon(filename: string): React.FC<React.SVGProps<SVGSVGElement>> {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf': return FileText;
    case 'doc': case 'docx': return FileText;
    case 'txt': return FileText;
    case 'rtf': return FileText;
    case 'odt': return FileText;
    case 'md': return FileText;
    case 'epub': case 'mobi': return Book;
    case 'ppt': case 'pptx': case 'odp': return Presentation;
    case 'xls': case 'xlsx': case 'ods': case 'csv': return FileSpreadsheet;
    case 'js': case 'jsx': case 'ts': case 'tsx': case 'html': case 'css': case 'scss': case 'py': case 'java': case 'c': case 'cpp': case 'h': case 'cs': case 'swift': case 'php': case 'rb': case 'go': case 'rs': case 'sql': case 'xml': case 'yaml': case 'yml': case 'sh': case 'bat': case 'ps1': case 'log': case 'cfg': case 'ini': return FileCode;
    case 'json': return FileJson;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'svg': case 'bmp': case 'ico': case 'tif': case 'tiff': return FileImage;
    case 'mp3': case 'wav': case 'ogg': case 'aac': case 'flac': case 'm4a': case 'wma': return FileAudio;
    case 'mp4': case 'mov': case 'avi': case 'mkv': case 'wmv': case 'flv': case 'webm': return FileVideo;
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz': case 'bz2': case 'iso': return FileArchive;
    default: return FileIcon;
  }
}


const UploadArea: React.FC<UploadAreaProps> = ({ onFileSelected, className }) => {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false); // To show loading state
  const { toast } = useToast();

  const handleFileProcessing = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: 'File Too Large', description: `File size exceeds ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
        return; // Don't proceed
      }

      // Simulate quick progress for selection feedback
      setUploadProgress(5);
      await new Promise(res => setTimeout(res, 50)); // Short delay for UI update

      const fileInfo: FileUploadInfo = {
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        file: file, // Include the File object
      };

      onFileSelected(fileInfo); // Pass the full info up

      // Reset progress after parent likely starts its own processing
      await new Promise(res => setTimeout(res, 200));
      setUploadProgress(null);

    }, [onFileSelected, toast]);


  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsProcessingDrop(true);
      setUploadProgress(0);

      if (acceptedFiles?.length) {
         // Process only the first file for simplicity in this component's scope
         // The parent (UploadInteract) can handle multiple if needed based on its logic
         await handleFileProcessing(acceptedFiles[0]);
      } else {
        toast({ title: 'No Valid Files', description: 'No accepted files were dropped.', variant: 'warning' });
      }

      setIsProcessingDrop(false);
      setUploadProgress(null); // Ensure progress is cleared after drop finishes
    },
    [handleFileProcessing, toast] // Dependencies for onDrop
  );


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false, // Allow only one file at a time via dropzone for simplicity here
    // Consider adding accept prop for specific file types if needed
    // accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'], ... }
    disabled: isProcessingDrop, // Disable dropzone while processing a drop
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center p-12 min-h-[250px]", // Consistent min-height
        "rounded-lg cursor-pointer transition-all duration-300",
        "border-2 border-dashed",
        // Use theme variables correctly
        "bg-[hsla(var(--card),0.5)]", // Use card with opacity
        isDragActive
          ? "border-solid border-[hsl(var(--primary))] ring-2 ring-offset-2 ring-[hsl(var(--primary))] bg-[hsla(var(--primary),0.1)]"
          : "border-[hsl(var(--border)/0.5)] hover:border-[hsl(var(--primary)/0.8)] hover:bg-[hsla(var(--primary),0.05)]",
        isProcessingDrop && "opacity-70 cursor-not-allowed", // Visual feedback during processing
        className // Allow parent to pass additional classes
      )}
    >
      <input {...getInputProps()} disabled={isProcessingDrop} />

      <div className="text-center">
        {isProcessingDrop ? (
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-[hsl(var(--primary))]" />
        ) : (
          <Upload
            className={cn(
              "h-12 w-12 mx-auto mb-4 transition-transform duration-200",
              isDragActive ? "scale-110 text-[hsl(var(--primary))]" : "text-[hsl(var(--primary)/0.7)]"
            )}
          />
        )}

        <p className={cn(
          "text-lg font-semibold",
          isDragActive ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))/0.9]"
        )}>
          {isProcessingDrop ? 'Processing...' : isDragActive ? 'Drop the file here!' : 'Drag & drop a file here'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {isProcessingDrop ? 'Please wait.' : 'or click to select a file'}
        </p>
        <p className="text-xs text-muted-foreground mt-2">(Max {MAX_FILE_SIZE_MB}MB)</p>
      </div>

      {uploadProgress !== null && uploadProgress >= 0 && (
        <div className="w-full max-w-xs mx-auto mt-6">
          <Progress value={uploadProgress * 10} className="h-1 [&>div]:bg-[hsl(var(--primary))]" />
           <p className="text-xs text-center mt-1 text-muted-foreground">Reading file...</p>
        </div>
      )}
    </div>
  );
};

export default UploadArea;
