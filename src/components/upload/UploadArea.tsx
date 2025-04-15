// src/components/upload/UploadArea.tsx
import React, { useCallback, useState } from 'react'; // Removed useEffect as it's not used
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react'; // Only Upload icon needed here
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
// Removed Card imports as we're styling the div directly
import { cn } from '@/lib/utils';

// Simplified UploadedFile stub - parent handles the real one
interface BasicFileInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  // Content is not handled here anymore
}

interface UploadAreaProps {
  // Expecting a function that likely takes the basic info or the File object
  onFileUploaded: (fileInfo: BasicFileInfo) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_FILE_SIZE_MB = 50;

const UploadArea: React.FC<UploadAreaProps> = ({ onFileUploaded }) => {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { toast } = useToast();

  // Simplified readFile - just gets basic info, parent does heavy lifting
  const readFileInfo = async (file: File): Promise<BasicFileInfo | null> => {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: 'File Too Large', description: `File size exceeds ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
        return reject(new Error('File too large'));
      }

      // Simulate minimal progress for selection/basic read
      setUploadProgress(5); // Indicate something happened

      // Resolve immediately with basic info
      resolve({
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      });
    });
  };

  // traverseFileTree remains similar but calls readFileInfo
  const traverseFileTree = async (item: any, path = '') => {
    if (item.isFile) {
      item.file(async (file: File) => {
        try {
          const fileInfo = await readFileInfo(file);
          if (fileInfo) {
            onFileUploaded(fileInfo); // Pass basic info up
            setUploadProgress(null); // Clear progress after passing up
          }
        } catch (error: any) {
          console.error('Error processing file entry:', error);
          toast({ title: 'Error Processing File', variant: 'destructive' });
          setUploadProgress(null);
        }
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      dirReader.readEntries(async (entries: any[]) => {
        for (let i = 0; i < entries.length; i++) {
          await traverseFileTree(entries[i], path + item.name + '/');
        }
        setUploadProgress(null); // Clear progress when directory scan finishes
      });
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles?.length) {
        // For simplicity, handle only the first item if multiple selected/dropped
        // To handle multiple, you'd loop and call onFileUploaded for each.
        const fileOrEntry = acceptedFiles[0];
        setUploadProgress(0); // Reset progress

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
            console.error('Error processing file:', error);
             // readFileInfo should handle its own toast
          } finally {
              setUploadProgress(null); // Clear progress after attempt
          }
        }
      }
    },
    [toast, onFileUploaded] // Dependencies
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true, // Still allow dropping multiple/folders
  });

  return (
    // Removed the Card wrapper, styling the main div directly
    <div
      {...getRootProps()}
      // Apply styles to match the image's dropzone
      className={cn(
        "flex flex-col items-center justify-center p-12", // Padding and alignment
        "rounded-lg cursor-pointer transition-all duration-300", // Base styles
        "border-2 border-dashed", // Dashed border
        // Theme-specific styles (assuming Cyberpunk theme vars)
        "bg-[hsl(var(--secondary)/0.15)]", // Light purple background (adjust var/opacity)
        "border-[hsl(var(--primary))] ", // Cyan dashed border
        "text-[hsl(var(--muted-foreground))]", // Muted text color
        isDragActive
          ? "border-solid ring-2 ring-offset-1 ring-[hsl(var(--primary))] bg-[hsl(var(--secondary)/0.25)]" // Active state: solid border, ring, slightly darker bg
          : "hover:border-solid hover:bg-[hsl(var(--secondary)/0.20)]" // Hover state: solid border, slightly darker bg
      )}
      style={{ minHeight: '250px' }} // Set a minimum height like in the image
    >
      <input {...getInputProps()} />
      <div className="text-center">
        {/* Use Upload icon from lucide-react */}
        <Upload
            className={cn(
                "h-12 w-12 mx-auto mb-4 transition-transform duration-200",
                isDragActive ? "scale-110 text-[hsl(var(--primary))]" : "text-[hsl(var(--primary)/0.7)]" // Make icon cyan, brighter on drag
            )}
        />
        {/* Text matching the image */}
        <p className={cn(
            "text-lg font-semibold",
             isDragActive ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))/0.9]" // Text slightly brighter on drag
             )}>
          Drag & drop files or folders here
        </p>
        <p className="text-sm text-muted-foreground mt-1">
           or click to select items
        </p>
      </div>
      {/* Display minimal progress indicator */}
      {uploadProgress !== null && uploadProgress >= 0 && uploadProgress <= 10 && (
        <div className="w-full max-w-xs mx-auto mt-6">
          <Progress value={uploadProgress * 10} className="h-1 [&>div]:bg-[hsl(var(--primary))]" />
          {/* Optional: <p className="text-xs text-muted-foreground mt-1 text-center">Selecting...</p> */}
        </div>
      )}
    </div>
  );
};

export default UploadArea;