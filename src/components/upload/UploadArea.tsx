// src/components/upload/UploadArea.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  File as FileIconLucide,
  Upload,
  Code,
  BookOpen,
  ImageIcon,
  FileZip,
  Music,
  VideoIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string;
}

interface UploadAreaProps {
  onFileUploaded: (file: UploadedFile) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const getFileIcon = (fileName: string): React.ElementType => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  switch (fileExtension) {
    case 'pdf': return BookOpen;
    case 'docx': case 'doc': return FileIconLucide;
    case 'pptx': case 'ppt': return FileIconLucide;
    case 'txt': return FileIconLucide;
    case 'py': case 'js': case 'jsx': case 'ts': case 'tsx': case 'html': case 'css': case 'json': case 'md': case 'c': case 'cpp': case 'java': case 'go': return Code;
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': return ImageIcon;
    case 'zip': return FileZip;
    case 'mp3': case 'wav': case 'ogg': return Music;
    case 'mp4': case 'avi': case 'mov': case 'webm': return VideoIcon;
    default: return FileIconLucide;
  }
};
const MAX_FILE_SIZE_MB = 50;
const UploadArea: React.FC<UploadAreaProps> = ({ onFileUploaded }) => {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const { toast } = useToast();

  const processFile = async (file: File, path?: string) => {
    return new Promise<UploadedFile | null>((resolve, reject) => {
      const reader = new FileReader();

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      }
      reader.onloadstart = () => {
        setUploadProgress(0);
      };

      reader.onload = async (e) => {
        try {
          let content: string;

          if (file.type.startsWith('text/')) {
            content = e.target?.result as string;

          } else if (file.type === 'application/pdf' || file.type === 'application/json' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/vnd.oasis.opendocument.text' || file.type === 'application/rtf') {
            content = e.target?.result as string;
          } else {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            content = `data:${file.type};base64,${base64String}`;
           }

          const newFile: UploadedFile = {
            id: generateId(),
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            content: content,
          };

          resolve(newFile);

        } catch (error: any) {
          console.error('Error processing file:', error);
          toast({
            title: 'Error Processing File',
            description: error.message || 'Could not process the uploaded file.',
            variant: 'destructive',
          });
          setUploadProgress(null);
          reject(null)
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader Error:', error);
        toast({
          title: 'Error Reading File',
          description: 'Could not read the selected file.',
          variant: 'destructive',
        });
        setUploadProgress(null);
        reject(null);
      };

      if (file.type.startsWith('text/') || file.type === 'application/json' || file.type ==='application/pdf' || file.type ==='application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type ==='application/vnd.oasis.opendocument.text' || file.type === 'application/rtf') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file); }
    })
  }
  const traverseFileTree = async (item: any, path?: string) => {
    path = path || '';
    if (item.isFile) {
      // Get file
      item.file((file: File) => {        

        processFile(file, path).then(async newFile => {
          if (newFile) {

            const userId = localStorage.getItem('userId');
            if (!userId) {
              toast({
                title: 'Error: User ID Not Found',
                description: 'Could not retrieve user ID from browser storage.',
                variant: 'destructive',
              });
              console.error('Error: User ID not found in localStorage');
              return;
            }

            fetch('/api/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
              },
            }).then(() => {
              onFileUploaded(newFile);
              toast({
                title: 'File Uploaded',
                description: `Successfully uploaded ${file.name}.`,
              });
              body: JSON.stringify(newFile),
            }).catch((error) => {
              console.error('Error sending file to server:', error);
            });
          }
        });
      });
    } else if (item.isDirectory) {
      // Get folder contents
      const dirReader = item.createReader();
      dirReader.readEntries(async (entries: any[]) => {
        for (let i = 0; i < entries.length; i++) {
          await traverseFileTree(entries[i], path + item.name + '/');
        }


      });
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: any) => {

      if (acceptedFiles && acceptedFiles.length) {

        for (let i = 0; i < acceptedFiles.length; i++) {
          const file = acceptedFiles[i];

          const entry = file.webkitGetAsEntry();
          if (entry) {
            traverseFileTree(entry)
          } else {

            const userId = localStorage.getItem('userId');
            if (!userId) {
              toast({ title: 'Error: User ID Not Found', description: 'Could not retrieve user ID from browser storage.', variant: 'destructive' });
              console.error('Error: User ID not found in localStorage'); return;
            }
            if (file) {
              if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                toast({ title: 'File Too Large', description: `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`, variant: 'destructive' });
                continue;
              }
              processFile(file).then(newFile => {
                if (newFile) {
                  fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-user-id': userId,
                    },

                    body: JSON.stringify(newFile),
                  }).then(() => {
                    onFileUploaded(newFile);
                    toast({ title: 'File Uploaded', description: `Successfully uploaded ${file.name}.`, });
                  }).catch((error) => {
                    console.error('Error sending file to server:', error);
                  });
                }
              });
            }
          }
        }
      }

    },
    [toast, onFileUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true, accept: undefined
  });
  return (
    <Card className="flex-1 overflow-hidden">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          isDragActive
            ? "bg-accent"
            : "border-muted hover:bg-secondary"
        )}
      >
        <input {...getInputProps()} />
        <CardHeader className="text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          {isDragActive ? (
            <CardTitle className="text-lg">Drop the file here...</CardTitle>
          ) : (
            <div className="text-center">
              <CardTitle className="text-lg">
                Drag &amp; drop file here, or click to select
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                You can drag and drop any type of files here or click to select.
              </p>
            </div>
          )}
        {uploadProgress !== null && uploadProgress >= 0 && (
          <div className="w-full mt-4">
            <Progress value={uploadProgress} />
            <p className="text-sm text-muted-foreground mt-1 text-right">
              {uploadProgress}%
            </p>
          </div>
        )}
        </CardHeader>
      </div>
    </Card>
  );
};

export default UploadArea;
