// src/components/upload/UploadArea.tsx
'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
// --- Import ALL necessary icons for getFileIcon ---
import {
  Upload,        // The icon for the dropzone itself
  FileArchive,   // For Zip, Rar, etc.
  FileAudio,     // For MP3, WAV, etc.
  FileCode2 as FileCode, // Using FileCode2 for better representation
  FileText,      // For TXT, PDF, DOC, ODT, RTF etc.
  FileImage,     // For JPG, PNG, etc.
  FileVideo,     // For MP4, AVI, etc.
  File as FileIcon, // Default fallback
  FileJson,      // Specific for JSON
  FileSpreadsheet, // For XLS, XLSX, CSV
  Presentation,  // For PPT, PPTX
  Book,          // For EPUB, MOBI
} from 'lucide-react';
// --- End Icon Imports ---
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Interface for the basic info this component passes up
interface BasicFileInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

interface UploadAreaProps {
  // Callback function to notify the parent component
  onFileUploaded: (fileInfo: BasicFileInfo) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_FILE_SIZE_MB = 50;

const UploadArea: React.FC<UploadAreaProps> = ({ onFileUploaded }) => {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { toast } = useToast();

  // Simplified function to get basic file info and check size
  const readFileInfo = async (file: File): Promise<BasicFileInfo | null> => {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: 'File Too Large', description: `File size exceeds ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
        return reject(new Error('File too large'));
      }
      // Indicate activity briefly
      setUploadProgress(5);
      // Resolve immediately with basic info - no actual reading needed here
      resolve({
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      });
    });
  };

  // Handles iterating through dropped directories
  const traverseFileTree = async (item: any, path = '') => {
    if (item.isFile) {
      item.file(async (file: File) => {
        try {
          const fileInfo = await readFileInfo(file);
          if (fileInfo) {
            onFileUploaded(fileInfo); // Pass basic info up
          }
        } catch (error: any) {
          console.error('Error processing file entry:', error);
          toast({ title: 'Error Processing File', variant: 'destructive' });
        } finally {
            setUploadProgress(null); // Clear progress after handling file/error
        }
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      dirReader.readEntries(async (entries: any[]) => {
        for (let i = 0; i < entries.length; i++) {
          // Recursively traverse
          await traverseFileTree(entries[i], path + item.name + '/');
        }
        // Consider clearing progress after directory scan is initiated or completed
        // setUploadProgress(null);
      }, (error: any) => {
          console.error("Error reading directory entries:", error);
          toast({ title: "Directory Read Error", variant: "warning" });
          setUploadProgress(null);
      });
    }
  };

  // Handles the drop event
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles?.length) {
        // Handle only the first file/folder for simplicity in this example
        const fileOrEntry = acceptedFiles[0];
        setUploadProgress(0); // Show progress indicator briefly

        const entry = fileOrEntry.webkitGetAsEntry ? fileOrEntry.webkitGetAsEntry() : null;

        if (entry && entry.isDirectory) {
          await traverseFileTree(entry);
        } else {
          // Handle single file
          try {
            const fileInfo = await readFileInfo(fileOrEntry);
            if (fileInfo) {
              onFileUploaded(fileInfo); // Pass basic info up
            }
          } catch (error: any) {
            // readFileInfo handles its own toast
            console.error('Error processing dropped file:', error);
          } finally {
              setUploadProgress(null); // Clear progress after processing attempt
          }
        }
      }
    },
    [toast, onFileUploaded] // Include dependencies for useCallback
  );

  // Setup react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true, // Allow selecting/dropping multiple files/folders
  });

  // --- Component Return ---
  return (
    // Single root div element
    <div
      {...getRootProps()}
      // Styling for the dropzone area
      className={cn(
        "flex flex-col items-center justify-center p-12", // Layout and padding
        "rounded-lg cursor-pointer transition-all duration-300", // Base styles
        "border-2 border-dashed", // Border style
        // Theme-dependent colors using CSS variables
        "bg-[hsl(var(--secondary)/0.15)]", // Background (adjust opacity/variable as needed)
        "border-[hsl(var(--primary))]",    // Border color
        "text-[hsl(var(--muted-foreground))]", // Default text color
        // Styles for when a file is being dragged over
        isDragActive
          ? "border-solid ring-2 ring-offset-1 ring-[hsl(var(--primary))] bg-[hsl(var(--secondary)/0.25)]"
          // Styles for hovering when not dragging
          : "hover:border-solid hover:bg-[hsl(var(--secondary)/0.20)]"
      )}
      style={{ minHeight: '250px' }} // Ensure a minimum height
    >
      {/* Hidden file input */}
      <input {...getInputProps()} />

      {/* Content inside the dropzone */}
      <div className="text-center">
        <Upload
            className={cn(
                "h-12 w-12 mx-auto mb-4 transition-transform duration-200",
                // Icon color changes on drag over
                isDragActive ? "scale-110 text-[hsl(var(--primary))]" : "text-[hsl(var(--primary)/0.7)]"
            )}
        />
        <p className={cn(
             "text-lg font-semibold",
             // Text color changes slightly on drag over
             isDragActive ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))/0.9]"
             )}>
          Drag & drop files or folders here
        </p>
        <p className="text-sm text-muted-foreground mt-1">
           or click to select items
        </p>
      </div>

      {/* Progress indicator (only shown briefly during file selection/read) */}
      {uploadProgress !== null && uploadProgress >= 0 && uploadProgress <= 10 && (
        <div className="w-full max-w-xs mx-auto mt-6">
          {/* Ensure className syntax for Progress is correct */}
          <Progress value={uploadProgress * 10} className="h-1 [&>div]:bg-[hsl(var(--primary))]" />
        </div>
      )}
    </div> // End of the single root div
  );
};

export default UploadArea;

// --- Expanded getFileIcon Helper Function ---
// (Keep outside component if reused, or move inside if only needed here)
export function getFileIcon(filename: string): React.FC<React.SVGProps<SVGSVGElement>> {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    // Documents
    case 'pdf': case 'doc': case 'docx': case 'txt': case 'rtf': case 'odt': case 'md':
      return FileText;
    // Ebooks
    case 'epub': case 'mobi':
      return Book;
    // Presentations
    case 'ppt': case 'pptx': case 'odp':
      return Presentation;
    // Spreadsheets
    case 'xls': case 'xlsx': case 'ods': case 'csv':
      return FileSpreadsheet;
    // Code
    case 'js': case 'jsx': case 'ts': case 'tsx': case 'html': case 'css': case 'scss': case 'py': case 'java': case 'c': case 'cpp': case 'cs': case 'h': case 'swift': case 'php': case 'rb': case 'go': case 'rs': case 'sql': case 'xml': case 'yaml': case 'yml': case 'sh': case 'bat': case 'ps1': case 'log': case 'cfg': case 'ini':
      return FileCode;
    case 'json':
      return FileJson;
    // Images
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'svg': case 'bmp': case 'ico': case 'tif': case 'tiff':
      return FileImage;
    // Audio
    case 'mp3': case 'wav': case 'ogg': case 'aac': case 'flac': case 'm4a': case 'wma':
      return FileAudio;
    // Video
    case 'mp4': case 'mov': case 'avi': case 'mkv': case 'wmv': case 'flv': case 'webm':
      return FileVideo;
    // Archives
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz': case 'bz2': case 'iso':
      return FileArchive;
    // Default
    default:
      return FileIcon;
  }
}