// src/app/layout.tsx
'use client';
import { Geist, Geist_Mono } from 'next/font/google';
import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './globals.css';
// Remove metadata export from Client Component
// import { metadata } from './layout-metadata';
import { useThemeStore } from '@/hooks/useThemeStore'; // Import the store hook

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
  // Initialize the theme store hook. This triggers the rehydration logic
  // within the store, which will apply the theme attribute via effects.
  // We don't necessarily need to *read* the theme state here unless
  // other logic in this component depends on it.
  useThemeStore();

  useEffect(() => {
    // User ID logic - This is fine, it's client-side only
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('userId', userId);
    }
    console.log('User ID:', userId);

    // Theme application is handled by useThemeStore's persistence logic.
    // No need to manually set documentElement.setAttribute here.

  }, []); // Run only on mount

  // Render the <html> tag.
  // DO NOT set data-theme directly here based on the initial store state.
  // Add suppressHydrationWarning to tell React that the difference
  // in the 'data-theme' attribute between server/client is expected
  // and should be ignored during the initial hydration.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}