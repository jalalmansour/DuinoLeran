import React, { useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { UploadedFile } from '@/app/page'; // Assuming the interface is in page.tsx
import { getFileIcon } from '@/app/page';
import { toast } from '@/hooks/use-toast';

interface HistorySectionProps {
  uploadHistory: UploadedFile[];
  onFileSelected: (fileId: string) => void;
}

async function fetchUploadHistory(userId: string): Promise<UploadedFile[]> {
  try {
    const response = await fetch('/api/upload-history', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId, // Include the user ID in the headers
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to fetch upload history: ${response.status} - ${errorData.error || 'Unknown error'}`
      );
    }

    const data = await response.json();
    return data.history;
  } catch (error: any) {
    console.error('Error fetching upload history:', error);
    toast({
      title: 'Error Fetching History',
      description: error.message || 'Could not load upload history.',
      variant: 'destructive',
    });
    return [];
  }
}

async function clearHistory(userId: string) {
  await fetch('/api/clear-upload-history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId, // Include the user ID in the headers
    },
  });
}


function retrieveUserId(): string | null {
  return localStorage.getItem('userId');
}

const HistorySection: React.FC<HistorySectionProps> = ({
  uploadHistory,
  onFileSelected,
}) => {
  const clearUploadHistory = useCallback(() => {
    const userId = retrieveUserId();
    if (userId) {
      clearHistory(userId)
      .then(() => {
        toast({
          title: 'History Cleared',
          description: 'Upload history has been removed.',
        });
      })
      .catch((error) => {
        console.error('Error clearing history:', error);
        toast({
          title: 'Error Clearing History',
          description: 'Could not clear upload history.',
          variant: 'destructive',
        });
      });
    }

  }, []);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload History</CardTitle>
        <CardDescription>
          View and reload recently uploaded files.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {uploadHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upload history found. Upload a file to get started.
          </p>
        ) : (
          <div className="grid gap-4">
            {uploadHistory.map((file) => {
              const FileIconComponent = getFileIcon(file.name);
              return (
                <div
                  key={file.id}
                  className="border rounded-md p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    {React.createElement(FileIconComponent, {
                      className: 'inline-block h-4 w-4 mr-2',
                    })}
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB - Uploaded:{' '}
                        {new Date(file.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
        )}
        {uploadHistory.length > 0 ? (
          <div className="grid gap-4">
            {uploadHistory.map((file) => {
              const FileIconComponent = getFileIcon(file.name);
              return (
                <div
                  key={file.id}
                  className="border rounded-md p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    {React.createElement(FileIconComponent, {
                      className: 'inline-block h-4 w-4 mr-2',
                    })}
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB - Uploaded:{' '}
                        {new Date(file.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      onFileSelected(file.id);
                    }}
                  >
                    Load
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No upload history found. Upload a file to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default HistorySection;