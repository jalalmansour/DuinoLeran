'use client'
import {Geist, Geist_Mono} from 'next/font/google';
import {useEffect} from 'react';
import {v4 as uuidv4} from 'uuid';
import './globals.css';
import { metadata } from './layout-metadata';
  
const geistSans = Geist({  
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({  
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({  
  children,
}: Readonly<{
  children: React.ReactNode;  
}>) {
  useEffect(() => {
    // Check if a user ID already exists in localStorage
    let userId = localStorage.getItem('userId');

    if (!userId) {
      // If not, generate a new one
      userId = uuidv4();

      // Store it in localStorage
      localStorage.setItem('userId', userId);
    }

    console.log('User ID:', userId);
  }, []);
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

