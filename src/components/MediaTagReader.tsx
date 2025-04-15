'use client';

import React, { useEffect, useState } from 'react';

interface MediaTagReaderProps {
  file: File | null;
  onSuccess: (tags: any) => void;
  onError: (error: any) => void;
}

const MediaTagReader: React.FC<MediaTagReaderProps> = ({ file, onSuccess, onError }) => {
  const [jsmediatags, setJsmediatags] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('jsmediatags')
        .then((module) => {
          setJsmediatags(module);
        })
        .catch((err) => {
          console.error('Failed to load jsmediatags:', err);
          onError(err);
        });
    }
  }, [onError]);

  useEffect(() => {
    if (!file || !jsmediatags) {
      return;
    }

    let isMounted = true;

    jsmediatags.read(file, {
      onSuccess: (tag: any) => {
        if (isMounted) {
          onSuccess(tag.tags);
        }
      },
      onError: (error: any) => {
        if (isMounted) {
          onError(error);
        }
      },
    });

    return () => {
      isMounted = false;
    };
  }, [file, jsmediatags, onSuccess, onError]);

  return null;
};

export default MediaTagReader;
