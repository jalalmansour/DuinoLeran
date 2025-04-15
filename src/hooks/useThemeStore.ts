// src/hooks/useThemeStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect } from 'react'; // useEffect might still be used elsewhere in the file, keep it if needed for other hooks

export const themes = [
  { id: 'cyberpunk', name: 'Cyberpunk', icon: '🌌' },
  { id: 'glassmorphism', name: 'Glassmorphism', icon: '🧼' },
  { id: 'dark-luxe', name: 'Dark Luxe', icon: '⚫️' },
  { id: 'pastel-dream', name: 'Pastel Dream', icon: '🪄' },
  { id: 'retro-terminal', name: 'Retro Terminal', icon: '🖥️' },
  { id: 'minimal-light', name: 'Minimal Light', icon: '☁️' },
  { id: 'sunset-gradient', name: 'Sunset Gradient', icon: '🌇' },
  { id: 'matrix-code', name: 'Matrix Code', icon: '💾' },
] as const;

export type ThemeId = typeof themes[number]['id'];

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  _hasHydrated: boolean; // Optional: track hydration status
  setHasHydrated: (state: boolean) => void; // Optional
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'cyberpunk', // Default theme before hydration
      _hasHydrated: false, // Optional: hydration status
      setHasHydrated: (state) => set({ _hasHydrated: state }), // Optional
      setTheme: (newTheme) => {
        // Apply theme to HTML element immediately on change
        if (typeof document !== 'undefined') { // Check if document exists (client-side)
            document.documentElement.setAttribute('data-theme', newTheme);
        }
        set({ theme: newTheme });
      },
    }),
    {
      name: 'ui-theme-storage', // Name of the item in localStorage
      storage: createJSONStorage(() => localStorage), // Use localStorage
      // THIS IS THE IMPORTANT PART FOR INITIAL LOAD:
      onRehydrateStorage: () => (state) => {
        // This runs on the client after state is loaded from localStorage
        if (state?.theme && typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', state.theme);
          // console.log('Theme rehydrated and applied:', state.theme); // For debugging
        } else if (typeof document !== 'undefined') {
          // Apply default if nothing was stored or state is invalid
           document.documentElement.setAttribute('data-theme', 'cyberpunk');
        }
        // Optional: Mark hydration as complete
         state?.setHasHydrated(true);
      },
      partialize: (state) => ({ theme: state.theme }), // Only persist the theme itself
    }
  )
);

// Optional Hook to wait for hydration if needed (prevents flash of default theme)
export const useHasHydrated = () => {
    return useThemeStore((state) => state._hasHydrated);
};