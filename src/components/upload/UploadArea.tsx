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

interface BasicFileInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
}

interface UploadAreaProps {
  onFileUploaded: (fileInfo: BasicFileInfo) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const MAX_FILE_SIZE_MB = 50;

const UploadArea: React.FC<UploadAreaProps> = ({ onFileUploaded }) => {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { toast } = useToast();

  const readFileInfo = async (file: File): Promise<BasicFileInfo | null> => {
    return new Promise((resolve, reject) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: 'File Too Large', description: `File size exceeds ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
        return reject(new Error('File too large'));
      }
      setUploadProgress(5);

      resolve({
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      });
    });
  };


  const traverseFileTree = async (item: any, path = '') => {
    if (item.isFile) {
      item.file(async (file: File) => {
        try {
          const fileInfo = await readFileInfo(file);
          if (fileInfo) {
            onFileUploaded(fileInfo);
          }
        } catch (error: any) {
          console.error('Error processing file entry:', error);
          toast({ title: 'Error Processing File', variant: 'destructive' });
        } finally {
            setUploadProgress(null);
        }
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      dirReader.readEntries(async (entries: any[]) => {
        for (let i = 0; i < entries.length; i++) {
          await traverseFileTree(entries[i], path + item.name + '/');
        }
      }, (error: any) => {
          console.error("Error reading directory entries:", error);
          toast({ title: "Directory Read Error", variant: "warning" });
          setUploadProgress(null);
      });
    }
  };


  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles?.length) {
        const fileOrEntry = acceptedFiles[0];
        setUploadProgress(0);

        const entry = fileOrEntry.webkitGetAsEntry ? fileOrEntry.webkitGetAsEntry() : null;

        if (entry && entry.isDirectory) {
          await traverseFileTree(entry);
        } else {
          try {
            const fileInfo = await readFileInfo(fileOrEntry);
            if (fileInfo) {
              onFileUploaded(fileInfo);
            }
          } catch (error: any) {
            console.error('Error processing dropped file:', error);
          } finally {
              setUploadProgress(null);
          }
        }
      }
    },
    [toast, onFileUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center p-12",
        "rounded-lg cursor-pointer transition-all duration-300",
        "border-2 border-dashed",
        "bg-[hsl(var(--secondary)/0.15)]",
        "border-[hsl(var(--primary))]",
        "text-[hsl(var(--muted-foreground))]",
        isDragActive
          ? "border-solid ring-2 ring-offset-1 ring-[hsl(var(--primary))] bg-[hsl(var(--secondary)/0.25)]"
          : "hover:border-solid hover:bg-[hsl(var(--secondary)/0.20)]"
      )}
      style={{ minHeight: '250px' }}
    >
      <input {...getInputProps()} />

      <div className="text-center">
        <Upload
          className={cn(
            "h-12 w-12 mx-auto mb-4 transition-transform duration-200",
            isDragActive ? "scale-110 text-[hsl(var(--primary))]" : "text-[hsl(var(--primary)/0.7)]"
          )}
        />
        <p className={cn(
          "text-lg font-semibold",
          isDragActive ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))/0.9]"
        )}>
          Drag & drop files or folders here
        </p>
        <p className="text-sm text-muted-foreground mt-1">
           or click to select items
        </p>
      </div>

      {uploadProgress !== null && uploadProgress >= 0 && uploadProgress <= 10 && (
        <div className="w-full max-w-xs mx-auto mt-6">
          <Progress value={uploadProgress * 10} className="h-1 [&>div]:bg-[hsl(var(--primary))]" />
        </div>
      )}
    </div>
  );
};

export default UploadArea;


export function getFileIcon(filename: string): React.FC<React.SVGProps<SVGSVGElement>> {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return FileText;
    case 'doc':
    case 'docx':
      return FileText;
    case 'txt':
      return FileText;
    case 'rtf':
      return FileText;
    case 'odt':
      return FileText;
    case 'md':
      return FileText;
    case 'epub':
    case 'mobi':
      return Book;
    case 'ppt':
    case 'pptx':
    case 'odp':
      return Presentation;
    case 'xls':
    case 'xlsx':
    case 'ods':
    case 'csv':
      return FileSpreadsheet;
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
    case 'scss':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'cs':
    case 'h':
    case 'swift':
    case 'php':
    case 'rb':
    case 'go':
    case 'rs':
    case 'sql':
    case 'xml':
    case 'yaml':
    case 'yml':
    case 'sh':
    case 'bat':
    case 'ps1':
    case 'log':
    case 'cfg':
    case 'ini':
      return FileCode;
    case 'json':
      return FileJson;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'bmp':
    case 'ico':
    case 'tif':
    case 'tiff':
      return FileImage;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'aac':
    case 'flac':
    case 'm4a':
    case 'wma':
      return FileAudio;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'wmv':
    case 'flv':
    case 'webm':
      return FileVideo;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
    case 'bz2':
    case 'iso':
      return FileArchive;
    default:
      return FileIcon;
  }
}
