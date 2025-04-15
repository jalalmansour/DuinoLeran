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
      // will be captured in 'domProps'
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
    return ( <TooltipProvider>
          {/* Provider should wrap the highest component using tooltips within it */}
          <motion.header
            ref={ref}
            // Apply className and ONLY the remaining domProps to the actual DOM element
            className={cn(
                "fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300",
                "bg-[hsl(var(--background)/0.8)] backdrop-blur-lg border-[hsl(var(--border)/0.5)]", // Themed background & border
                className // Allow overriding classes
            )}
            initial={{ y: -80 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            {...domProps} // Spread ONLY DOM-valid props
          >
            <div className="container mx-auto flex items-center justify-between h-16 px-4 md:px-6">
                {/* Left Side: Title */}
                <div className="flex items-center flex-shrink-0 mr-4"> {/* Ensure title doesn't get pushed out */}
                  {children} {/* Render the title passed from page.tsx */}
                </div>

                {/* Center: Desktop Navigation Tabs - Themed */}
                <nav className="hidden md:flex items-center space-x-1 bg-[hsl(var(--card)/0.5)] border border-[hsl(var(--border)/0.3)] rounded-full px-2 py-1 shadow-inner">
                  {tabs.map((tab) => (
                    <Tooltip key={tab.value} delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost" // Use themed ghost button
                          size="sm"
                          className={cn(
                            "relative rounded-full px-4 py-1.5 transition-all duration-200 flex items-center space-x-1.5 text-xs", // Added relative for indicator positioning
                            activeTab === tab.value
                              ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm' // Active state with theme color
                              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.1)]' // Inactive state
                          )}
                          onClick={() => handleNavClick(tab.value)} // Use handler
                        >
                          <tab.icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                           {/* Animated underline indicator */}
                            {activeTab === tab.value && (
                                <motion.div
                                    layoutId="activeNavIndicatorHeader" // Unique ID
                                    className="absolute bottom-[-7px] left-2 right-2 h-[2px] bg-[hsl(var(--primary))]" // Positioned below the button
                                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                />
                            )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom"> {/* Tooltip uses theme */}
                        {tab.label}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </nav>

                {/* Right Side: XP, Theme Switcher, Mobile Menu Trigger */}
                <div className="flex items-center space-x-2 md:space-x-4 ml-auto"> {/* Added ml-auto to push right */}

                   {/* Conditionally Render Theme Switcher */}
                   {!hasHydrated ? (
                        // Placeholder: Render a div with similar dimensions to prevent layout shift
                        <div className="w-[36px] h-9 rounded-md bg-[hsl(var(--muted)/0.2)] animate-pulse flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--muted-foreground))]" />
                        </div>
                   ) : (
                        // Actual Select component (only rendered client-side after hydration)
                        <Select value={currentTheme} onValueChange={(value) => setTheme(value as ThemeId)}>
                            <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                                <SelectTrigger
                                    className={cn(
                                        "w-auto h-9 px-2 border bg-[hsl(var(--background)/0.5)] transition-colors",
                                        "border-dashed border-[hsl(var(--border))] hover:border-solid hover:border-[hsl(var(--primary))] focus:ring-0 focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--accent)/0.1)]"
                                    )}
                                    aria-label="Select theme"
                                >
                                    <SelectValue placeholder={<Palette className="h-4 w-4 text-[hsl(var(--foreground))]" />} >
                                        {/* Display selected theme icon */}
                                        {availableThemes.find(t => t.id === currentTheme)?.icon
                                            ? <span className='text-lg leading-none'>{availableThemes.find(t => t.id === currentTheme)?.icon}</span>
                                            : <Palette className="h-4 w-4 text-[hsl(var(--foreground))]" /> /* Fallback */}
                                    </SelectValue>
                                </SelectTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Change Theme</TooltipContent>
                            </Tooltip>
                            <SelectContent align="end" className="min-w-[180px]">
                                <SelectGroup>
                                    <SelectLabel>Select Theme</SelectLabel>
                                    {availableThemes.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            <span className='mr-2'>{t.icon}</span> {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                   )}
                   {/* End Conditional Render */}

                  {/* XP Display - Themed */}
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="hidden sm:flex items-center space-x-2 cursor-default border border-transparent hover:border-[hsl(var(--secondary)/0.4)] px-2 py-1 rounded-full transition-colors">
                        <Star className="h-5 w-5 text-[hsl(var(--secondary))]" /> {/* Use secondary color */}
                        <span className="text-sm font-medium text-[hsl(var(--foreground))]">{xp}</span>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">XP</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="w-32"> {/* Tooltip uses theme */}
                        Level {level} ({xp} / {nextLevelXp === Infinity ? '~' : nextLevelXp})
                        <Progress value={progress} className="h-1 mt-1 [&>div]:bg-[hsl(var(--secondary))]" />
                    </TooltipContent>
                  </Tooltip>

                  {/* Mobile Menu Trigger */}
                  <div className="md:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent)/0.1)]"
                      aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} // Better aria-label
                    >
                      {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
            </div>

            {/* Mobile Menu Panel */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="md:hidden border-t border-[hsl(var(--border)/0.5)] bg-[hsl(var(--background)/0.95)] backdrop-blur-sm shadow-lg" // Added shadow
                >
                  <nav className="flex flex-col px-4 py-3 space-y-1">
                    {tabs.map((tab) => (
                      <Button
                        key={tab.value}
                        variant="ghost"
                        className={cn(
                            "w-full justify-start space-x-3 text-base py-2.5", // Larger text/padding
                            activeTab === tab.value
                              ? 'text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)]' // Active style
                              : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.1)]' // Inactive style
                        )}
                        onClick={() => handleNavClick(tab.value)} // Use handler
                      >
                        <tab.icon className="h-5 w-5" />
                        <span>{tab.label}</span>
                      </Button>
                    ))}
                    {/* XP Display in Mobile Menu */}
                    <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border)/0.3)] mt-2 px-3">
                         <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5 text-[hsl(var(--secondary))]" />
                             <span className="text-sm font-medium text-[hsl(var(--foreground))]">{xp} XP</span>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">(Lvl {level})</span>
                         </div>
                         <Progress value={progress} className="h-1 w-16 [&>div]:bg-[hsl(var(--secondary))]" />
                    </div>
                  </nav>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.header>
      </TooltipProvider> ); // Added closing parenthesis for TooltipProvider
  }
);

Header.displayName = 'Header';
export default Header;