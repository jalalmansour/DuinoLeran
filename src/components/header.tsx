import React from 'react';
// --- ADD THIS IMPORT ---
import { motion, AnimatePresence } from 'framer-motion';
// --- END ADDITION ---
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from "@/components/ui/progress";
import { BookOpen, Settings, UploadCloud, History, HelpCircle, Palette, Star, Menu, X, Loader2 } from 'lucide-react';
import { type ThemeId, type themes as themeOptions, useHasHydrated } from '@/hooks/useThemeStore';
import Image from 'next/image';

export type ActiveTabValue = "upload" | "history" | "settings" | "faq";

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  xp: number;
  activeTab: ActiveTabValue;
  setActiveTab: (value: ActiveTabValue) => void;
  children?: React.ReactNode;
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
      children,
      className,
      ...domProps
    },
    ref
  ) => {
    const hasHydrated = useHasHydrated();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    // XP Level Calculation Logic (moved inside for encapsulation)
    const getLevel = (currentXp: number) => {
      const level = Math.floor(Math.sqrt(currentXp) / 10);
      const nextLevelXp = Math.pow((level + 1) * 10, 2);
      const progress = (currentXp - Math.pow(level * 10, 2)) / (nextLevelXp - Math.pow(level * 10, 2));
      return { level, nextLevelXp, progress };
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
        setIsMenuOpen(false);
    };

    // --- RETURN STATEMENT ---
    return (
      <TooltipProvider>
          {/* Now motion.header is recognized */}
          <motion.header
            ref={ref}
            className={cn(
                "fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300",
                "bg-[hsl(var(--background)/0.8)] backdrop-blur-lg border-[hsl(var(--border)/0.5)]",
                className
            )}
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            {...domProps}
          >
            <div className="container mx-auto flex items-center justify-between h-16 px-4 md:px-6">
                {/* Left Side: Title */}
                <div className="flex items-center flex-shrink-0 mr-4">
                  <Image
                    src="/duino.png"
                    alt="DuinoLearn Logo"
                    width={40}
                    height={40}
                    className="mr-2"
                  />
                  <motion.h1 className="text-2xl md:text-3xl font-bold tracking-tighter gradient-text filter drop-shadow-[0_0_5px_hsla(var(--primary),0.4)] py-1 relative" style={{ fontFamily: 'var(--font-display, var(--font-sans))' }}>
                      DuinoCourse AI
                  </motion.h1>
                </div>

                {/* Center: Desktop Navigation Tabs */}
                <nav className="hidden md:flex items-center space-x-1 bg-[hsl(var(--card)/0.5)] border border-[hsl(var(--border)/0.3)] rounded-full px-2 py-1 shadow-inner">
                  {tabs.map((tab) => (
                    <Tooltip key={tab.value} delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            activeTab === tab.value ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                          )}
                          onClick={() => handleNavClick(tab.value)}
                        >
                          <tab.icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                           {activeTab === tab.value && (
                                <motion.div
                                    layoutId="activeNavIndicatorHeader"
                                    className="absolute bottom-[-7px] left-2 right-2 h-[2px] bg-[hsl(var(--primary))]"
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                            )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{tab.label}</TooltipContent>
                    </Tooltip>
                  ))}
                </nav>

                {/* Right Side: XP, Theme Switcher, Mobile Menu Trigger */}
                <div className="flex items-center space-x-2 md:space-x-4 ml-auto">
                   {/* Conditionally Render Theme Switcher */}
                   {!hasHydrated ? (
                        <span className="text-muted-foreground">Loading Themes...</span>
                    ) : (
                        <Select value={currentTheme} onValueChange={(value) => setTheme(value as ThemeId)}>
                            <SelectTrigger className="w-[140px] sm:w-[180px]">
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
                   {/* XP Display */}
                   <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="px-3 font-medium">
                                XP: {xp}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            Level {level} - {progress * 100}% to Level Up
                            <Progress value={progress * 100} className="mt-1" />
                        </TooltipContent>
                    </Tooltip>
                   {/* Mobile Menu Trigger */}
                   <div className="md:hidden">
                        <Button variant="outline" size="icon" onClick={() => setIsMenuOpen(true)}>
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Open Mobile Menu</span>
                        </Button>
                   </div>
                </div>
            </div>

            {/* Mobile Menu Panel */}
            <AnimatePresence>
              {isMenuOpen && ( <motion.div
                    className="fixed inset-0 top-[theme(spacing.16)] left-0 z-50 bg-[hsl(var(--background)/0.9)] backdrop-blur-md p-6 shadow-lg md:hidden"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="flex flex-col space-y-4">
                        {tabs.map((tab) => (
                            <Button
                                key={tab.value}
                                variant="ghost"
                                className="justify-start"
                                onClick={() => handleNavClick(tab.value)}
                            >
                                <tab.icon className="mr-2 h-4 w-4" />
                                {tab.label}
                            </Button>
                        ))}
                        {!hasHydrated ? (
                            <span className="text-muted-foreground">Loading Themes...</span>
                        ) : (
                            <Select value={currentTheme} onValueChange={(value) => setTheme(value as ThemeId)}>
                                <SelectTrigger className="w-full">
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
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setIsMenuOpen(false)}>
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close Menu</span>
                    </Button>
                </motion.div> )}
            </AnimatePresence>

          </motion.header>
      </TooltipProvider>
    );
  }
);

Header.displayName = 'Header';
export default Header;
