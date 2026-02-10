'use client';

/**
 * Dark Mode Toggle Component
 * Toggle button for switching between light and dark mode
 */

'use client';

import React, { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/ui.store';
import { Moon, Sun } from 'lucide-react';

export const DarkModeToggle: React.FC = () => {
  const { darkMode, toggleDarkMode } = useUIStore();

  // Initialize dark mode on mount
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 rounded-2xl transition-all bouncy-hover relative"
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? (
        <Sun size={22} strokeWidth={2.5} className="text-amber-500" />
      ) : (
        <Moon size={22} strokeWidth={2.5} />
      )}
    </button>
  );
};

export default DarkModeToggle;

