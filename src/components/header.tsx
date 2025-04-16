'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image'; // Import next/image
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from "@/components/ui/progress";
import { Settings, UploadCloud, History, HelpCircle, Palette, Star, Menu, X, Loader2 } from 'lucide-react';
import { type ThemeId, type themes as themeOptions, useHasHydrated } from '@/hooks/useThemeStore';
import { Label } from "@/components/ui/label";

export type ActiveTabValue = "upload" | "history" | "settings" | "faq";

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  xp: number;
  activeTab: ActiveTabValue;
  setActiveTab: (value: ActiveTabValue) => void;
  children?: React.ReactNode; // Keep children for flexibility if needed later, though logo/title is now internal
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  availableThemes: typeof themeOptions;
}

const Header = React.forwardRef<HTMLElement, HeaderProps>(
  (
    {
      xp,
      activeTab,
      setActiveTab,
      currentTheme,
      setTheme,
      availableThemes,
      className,
      ...domProps
    },
    ref
  ) => {
    const hasHydrated = useHasHydrated();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    // Simplified XP Level Calculation
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

        return { level: currentLevel, nextLevelXp: xpForNextLevel === Infinity ? 'MAX' : xpForNextLevel, progress: progressPercent }; // Return 'MAX' for clarity
    };
    const { level, nextLevelXp, progress } = getLevel(xp);

    const tabs: { value: ActiveTabValue; label: string; icon: React.ElementType }[] = [
        { value: "upload", label: "Interact", icon: UploadCloud },
        { value: "history", label: "Logs", icon: History },
        { value: "settings", label: "Settings", icon: Settings },
        { value: "faq", label: "FAQ", icon: HelpCircle },
    ];

     const handleNavClick = (tabId: ActiveTabValue) => {
        setActiveTab(tabId);
        setIsMenuOpen(false); // Close menu on navigation
    };

    return (
      <TooltipProvider>
          <motion.header
            ref={ref}
            className={cn(
                "fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300",
                // Consistent background/blur for the header bar itself
                "bg-[hsl(var(--background)/0.8)] backdrop-blur-lg border-[hsl(var(--border)/0.5)]",
                className
            )}
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            {...domProps}
          >
            {/* Main Header Content Container */}
            <div className="container mx-auto flex items-center justify-between h-16 px-4 sm:px-6"> {/* Adjusted padding */}

                {/* Left Side: Logo + Title */}
                <div className="flex items-center flex-shrink-0 mr-4">
                    <Image
                        src="/duino.png" // Ensure this path is correct in your public folder
                        alt="DuinoCourse Logo"
                        width={32} // Slightly smaller logo
                        height={32}
                        className="h-8 w-8 mr-2" // Explicit height/width class
                        priority // Prioritize loading the logo
                    />
                    {/* Title is now part of the header component */}
                    <motion.h1
                        className="text-xl sm:text-2xl font-bold tracking-tighter gradient-text filter drop-shadow-[0_0_5px_hsla(var(--primary),0.4)]"
                        style={{ fontFamily: 'var(--font-display, var(--font-sans))' }}
                    >
                        DuinoCourse AI
                    </motion.h1>
                </div>

                {/* Center: Desktop Navigation Tabs */}
                <nav className="hidden md:flex items-center space-x-1 bg-[hsl(var(--card)/0.5)] border border-[hsl(var(--border)/0.3)] rounded-full px-2 py-1 shadow-inner">
                  {tabs.map((tab) => (
                    <Tooltip key={tab.value} delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost" // Use themed ghost button
                          size="sm"
                          className={cn(
                            "relative rounded-full px-4 py-1.5 transition-all duration-200 flex items-center space-x-1.5 text-xs", // Relative for indicator
                            activeTab === tab.value
                              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm' // Active state
                              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.1)]' // Inactive state
                          )}
                          onClick={() => handleNavClick(tab.value)}
                        >
                          <tab.icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                           {/* Animated underline indicator */}
                            {activeTab === tab.value && (
                                <motion.div
                                    layoutId="activeNavIndicatorHeader" // Unique ID
                                    className="absolute bottom-[-7px] left-2 right-2 h-[2px] bg-[hsl(var(--primary))]" // Positioned below
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                            )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{tab.label}</TooltipContent>
                    </Tooltip>
                  ))}
                </nav>

                {/* Right Side: Theme Switcher (Desktop), Mobile Menu Trigger */}
                <div className="flex items-center space-x-2 sm:space-x-3"> {/* Adjusted spacing */}

                   {/* Theme Switcher - DESKTOP ONLY */}
                   <div className="hidden md:block"> {/* Hide on mobile */}
                       {!hasHydrated ? (
                            // Placeholder to prevent layout shift
                            <div className="w-[44px] h-9 rounded-md bg-[hsl(var(--muted)/0.2)] animate-pulse flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />
                            </div>
                       ) : (
                            <Select value={currentTheme} onValueChange={(value) => setTheme(value as ThemeId)}>
                                <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                    <SelectTrigger
                                        className={cn(
                                            "w-auto h-9 px-2 border bg-transparent", // Transparent bg
                                            "hover:bg-[hsl(var(--accent)/0.1)] focus:ring-ring focus:ring-1" // Standard focus
                                        )}
                                        aria-label="Select theme"
                                    >
                                        <SelectValue placeholder={<Palette className="h-4 w-4" />}>
                                            {availableThemes.find(t => t.id === currentTheme)?.icon
                                                ? <span className='text-lg leading-none'>{availableThemes.find(t => t.id === currentTheme)?.icon}</span>
                                                : <Palette className="h-4 w-4" />
                                            }
                                        </SelectValue>
                                    </SelectTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Change Theme</TooltipContent>
                                </Tooltip>
                                <SelectContent align="end" className="min-w-[180px]">
                                    <SelectGroup>
                                        <SelectLabel>Available Themes</SelectLabel>
                                        {availableThemes.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                <span className='mr-2 text-lg leading-none'>{t.icon}</span> {t.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                       )}
                   </div>

                  {/* Mobile Menu Trigger - MOBILE ONLY */}
                  <div className="md:hidden">
                    <Button
                      variant="ghost" // Use ghost for less visual weight
                      size="icon"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent)/0.1)]"
                      aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                    >
                      {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
            </div>

            {/* Mobile Menu Panel - ADDED BLUR */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  // --- Positioning & Styling ---
                  // Covers viewport below header, hidden on desktop
                  className="fixed inset-0 top-16 left-0 right-0 z-40 md:hidden p-6 border-t border-[hsl(var(--border)/0.5)] shadow-lg"
                  // Apply background color with opacity AND backdrop blur
                  style={{
                      backgroundColor: `hsla(var(--background), 0.95)`, // Increased opacity
                      backdropFilter: 'blur(12px)', // Adjust blur amount as needed (e.g., 8px, 16px)
                      WebkitBackdropFilter: 'blur(12px)' // For Safari compatibility
                  }}
                  // --- Animation ---
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} // Faster exit
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                >
                  {/* Menu Content */}
                  <nav className="flex flex-col space-y-2"> {/* Reduced spacing slightly */}
                    {/* Navigation Tabs */}
                    {tabs.map((tab) => (
                      <Button
                        key={tab.value}
                        variant={activeTab === tab.value ? "secondary" : "ghost"} // Highlight active tab
                        className={cn(
                            "w-full justify-start space-x-3 text-base py-3", // Increased padding/size
                            activeTab === tab.value
                              ? 'text-[hsl(var(--secondary-foreground))]' // Use secondary colors for active
                              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.1)]'
                        )}
                        onClick={() => handleNavClick(tab.value)}
                      >
                        <tab.icon className="h-5 w-5" />
                        <span>{tab.label}</span>
                      </Button>
                    ))}

                    {/* Separator */}
                    <div className="pt-4 !mt-5 border-t border-[hsl(var(--border)/0.3)]"></div>

                    {/* Theme Selector (Mobile) */}
                    <div className="pt-2">
                        <Label className="text-xs text-[hsl(var(--muted-foreground))] px-3 pb-1 block">Theme</Label>
                        {!hasHydrated ? (
                             <div className="flex items-center justify-center h-10 rounded-md bg-[hsl(var(--muted)/0.2)] animate-pulse">
                                <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />
                            </div>
                        ) : (
                            <Select value={currentTheme} onValueChange={(value) => setTheme(value as ThemeId)}>
                                <SelectTrigger className="w-full h-11"> {/* Slightly larger trigger */}
                                    <SelectValue placeholder="Select a theme" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Available Themes</SelectLabel>
                                        {availableThemes.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                <span className='mr-2 text-lg leading-none'>{t.icon}</span> {t.name}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    {/* XP Display (Mobile) */}
                    <div className="flex items-center justify-between pt-4 px-3">
                         <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5 text-[hsl(var(--secondary))]" />
                             <span className="text-sm font-medium text-[hsl(var(--foreground))]">{xp} XP</span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">(Lvl {level})</span>
                         </div>
                         <div className='flex flex-col items-end w-20'>
                              <Progress value={progress} className="h-1 w-full [&>div]:bg-[hsl(var(--secondary))]" />
                              <span className='text-xs text-[hsl(var(--muted-foreground))] mt-0.5'>{nextLevelXp} XP</span>
                         </div>
                    </div>
                  </nav>

                  {/* Close Button (Positioned within the blurred panel) */}
                   <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]"
                        onClick={() => setIsMenuOpen(false)}
                        aria-label="Close menu"
                   >
                        <X className="h-5 w-5" />
                   </Button>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.header>
      </TooltipProvider>
    );
  }
);

Header.displayName = 'Header';
export default Header;
