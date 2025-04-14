import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Sun, Moon, Menu, X, Trophy, BookOpen, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,

} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "next-themes";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname } from 'next/navigation';
import { Orbitron } from 'next/font/google';
import { cn } from "@/lib/utils";

const orbitron = Orbitron({ subsets: ['latin'] });

interface NavLinkProps {
  href: string;
  label: string;
  active?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ href, label, active }) => {
  return (
    <Link
      href={href}
      className={`${orbitron.className} relative px-3 py-2 text-yellow-200 transition-colors duration-200 hover:text-yellow-300 ${active ? 'underline' : ''}`}
    >
      {label}
    </Link>
  );
};

const MobileNavLink: React.FC<NavLinkProps> = ({ href, label, active }) => {
  return (
  <Link
    href={href}
    className={` ${orbitron.className} flex w-full items-center gap-2 px-3 py-2 text-gray-100 hover:bg-gray-700 ${active ? 'underline' : ''}`}
  >
    {label}
  </Link>
  );
};

const MobileMenuContent: React.FC<{isOpen:boolean; setIsOpen: (isOpen:boolean) => void}> = ({isOpen, setIsOpen}) => {
  const pathname = usePathname();
  const [xp, setXp] = useState<number>(0);

  useEffect(() => {
    const storedXp = localStorage.getItem('userXp');
    if (storedXp) {
      setXp(parseInt(storedXp, 10) || 0);
    }
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="absolute top-16 left-0 w-full bg-gray-900 rounded-md p-4">
      <div className="flex flex-col space-y-4 items-center">
      <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className={`${orbitron.className} text-lg font-bold text-yellow-500`}>XP: {xp}</span>
          <div className="w-32">
              <Progress value={(xp % 100)} className="h-2 bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-sm" aria-label={`Level progress: ${xp % 100}%`} />
          </div>
        </div>
        <MobileNavLink href="/" label="Home" active={pathname === '/'} />
        <MobileNavLink href="/history" label="History" active={pathname === '/history'}/>
        <MobileNavLink href="/faq" label="FAQ" active={pathname === '/faq'}/>
      </div>
    </motion.div>
  )
}

const Header: React.FC = () => {
  const pathname = usePathname();
  const [xp, setXp] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const storedXp = localStorage.getItem('userXp');
    if (storedXp) {
      setXp(parseInt(storedXp, 10) || 0);
    }
  }, []);

  return (
    <nav className="fixed top-0 z-50 w-full shadow-md bg-gray-900/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/duino.png"
            alt="DuinoCourse AI Logo"
            width={150}
            height={50}
            priority
          />
        </Link>
        <div className="flex-grow" />
        <div className="hidden md:flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className={`${orbitron.className} text-lg font-bold text-yellow-500`}>XP: {xp}</span>
            <div className="w-32">
              <Progress value={(xp % 100)} className="h-2 bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-sm" aria-label={`Level progress: ${xp % 100}%`} />
            </div>
          </div>
          <NavLink href="/" label="Home" active={pathname === '/'} />
          <NavLink href="/history" label="History" active={pathname === '/history'} />
          <NavLink href="/faq" label="FAQ" active={pathname === '/faq'}/>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setTheme(theme === "light" ? "dark" : "light")
                  }
                  className="hover:bg-secondary"
                >
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                Toggle theme
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="md:hidden">
          <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className='bg-gray-900 hover:bg-gray-800 text-white'>
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {isOpen && <MobileMenuContent isOpen={isOpen} setIsOpen={setIsOpen}/>}
        </div>
      </div>
    </nav>
  );
};

export default Header;
