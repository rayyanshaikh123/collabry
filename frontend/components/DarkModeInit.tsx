'use client';

/**
 * Dark Mode Initializer
 * Initializes dark mode on mount based on stored preference
 */

import React, { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/ui.store';

export const DarkModeInit: React.FC = () => {
  const { darkMode, setDarkMode } = useUIStore();

  useEffect(() => {
    // Apply dark mode class on mount
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  return null;
};

