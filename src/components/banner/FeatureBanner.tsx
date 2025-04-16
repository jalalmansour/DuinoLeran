'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react'; // Or any other icon library you prefer

const FeatureBanner = () => {
  // Animation variants for the banner
  const bannerVariants = {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeIn' } },
  };

  return (
    
      
        <Sparkles className="w-6 h-6 mr-2 text-yellow-400" />
        Discover the Power of DuinoCourse AI
      
      Turn documents into interactive learning experiences. Upload a file to get started!
    
  );
};

export default FeatureBanner;
