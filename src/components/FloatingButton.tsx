"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FloatingButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  isVisible?: boolean;
}

const FloatingButton: React.FC<FloatingButtonProps> = ({ onClick, children, isVisible }) => {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center",
        "hover:scale-110 transition-transform duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg" // Set the theme colors + shadow
      )}
      aria-label="Toggle Chat"
    >
      {children}
    </motion.button>
  );
};

export default FloatingButton;