// src/components/header.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Added AnimatePresence
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from "@/components/ui/progress"; // Import Progress
import { BookOpen, Settings, UploadCloud, History, HelpCircle, Palette, Star, Menu, X, Loader2 } from 'lucide-react'; // Added Menu, X, Loader2
// Import useHasHydrated along with other theme store items
import { type ThemeId, type themes as themeOptions, useHasHydrated } from '@/hooks/useThemeStore';
import Image from 'next/image';
import Link from 'next/link';

export type ActiveTabValue = "upload" | "history" | "settings" | "faq";

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  xp: number;
  activeTab: ActiveTabValue;
  setActiveTab: (value: ActiveTabValue) => void;
  children?: React.ReactNode;
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  availableThemes: typeof themeOptions;
  // No need to explicitly list className here if it's included in HTMLAttributes
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  (
    {
      // Destructure props ONLY for Header's logic, NOT for the DOM element
      xp,
      activeTab,
      setActiveTab,
      currentTheme,
      setTheme,
      availableThemes,
      children,
      className, // Keep className to apply to the motion.header
      // All OTHER props (like 'id', 'style', etc.) intended for the DOM element
      ...domProps
    },
    ref
  ) => {
    // --- Add Hydration Check ---
    const hasHydrated = useHasHydrated();
    // --- End Hydration Check ---

    const [isMenuOpen, setIsMenuOpen] = React.useState(false); // State for mobile menu

    // XP Level Calculation Logic (moved inside for encapsulation)
    const getLevel = (currentXp: number) => {
      const levels = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000]; // Example thresholds
      let currentLevel = 1;
      let xpForNextLevel = levels[1];
      let xpForCurrentLevel = levels[0];

      for (let i = 1; i < levels.length; i++) {
        if (currentXp >= levels[i]) {
          currentLevel = i + 1;
          xpForCurrentLevel = levels[i];
          xpForNextLevel = levels[i+1] ?? Infinity; // Use Infinity if it's the max level
        } else {
          xpForNextLevel = levels[i];
          break;
        }
      }

      const xpInCurrentLevel = currentXp - xpForCurrentLevel;
      const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
      const progressPercent = (xpNeededForNext === Infinity || xpNeededForNext <= 0) ? 100 : Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));


      return { level: currentLevel, nextLevelXp: xpForNextLevel === Infinity ? currentXp : xpForNextLevel, progress: progressPercent };
    };
    const { level, nextLevelXp, progress } = getLevel(xp);

    // Navigation Tabs Data
    const tabs: { value: ActiveTabValue; label: string; icon: React.ElementType }[] = [
      { value: "upload", label: "Interact", icon: UploadCloud },
      { value: "history", label: "Logs", icon: History },
      { value: "settings", label: "Settings", icon: Settings },
      { value: "faq", label: "FAQ", icon: HelpCircle },
    ];

    // Handler for nav clicks (closes mobile menu)
    const handleNavClick = (tabId: ActiveTabValue) => {
      setActiveTab(tabId);
      setIsMenuOpen(false);
    };

    // --- CORRECTED RETURN STATEMENT ---
    return (
      
        
          
            
              {children}
            
  
              
                {tabs.map((tab) => (
                  
                    
                      
                        
                          {tab.label}
                          
                            {activeTab === tab.value && (
                              
                            )}
                        
                      
                    
                    
                      {tab.label}
                    
                  
                ))}
              
  
              
                
                  {availableThemes.find(t => t.id === currentTheme)?.icon
                    ?  {t.icon} 
                    : }
                
  
                
                  
                    
                      {t.icon} {t.name}
                    
                  
                
              
  
                
                  
                    
                      {xp}
                      XP
                    
                  
                  
                    Level {level} ({xp} / {nextLevelXp === Infinity ? '~' : nextLevelXp})
                    
                  
                
  
                
                  
                    {isMenuOpen ?  : }
                  
                
              
            
  
            
              
                
                  {tabs.map(tab => (
                    
                      
                          {tab.label}
                      
                    
                  ))}
                  
                    
                      
                        
                         {xp} XP
                        (Lvl {level})
                      
                      
                    
                  
                
              
            
  
          
      
    );
  }
);

Header.displayName = 'Header';
export default Header;
