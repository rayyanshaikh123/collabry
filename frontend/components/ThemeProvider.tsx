'use client';

/**
 * Theme Provider
 * Manages theme state and applies CSS variables
 */

import React, { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/ui.store';

const THEMES: Record<string, Record<string, string>> = {
  indigo: {
    '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd', '400': '#a78bfa',
    '500': '#818cf8', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81', '950': '#1e1b4b'
  },
  blue: {
    '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd', '400': '#60a5fa',
    '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af', '900': '#1e3a8a', '950': '#172554'
  },
  amber: {
    '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d', '400': '#fbbf24',
    '500': '#f59e0b', '600': '#d97706', '700': '#b45309', '800': '#92400e', '900': '#78350f', '950': '#451a03'
  },
  emerald: {
    '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7', '400': '#34d399',
    '500': '#10b981', '600': '#059669', '700': '#047857', '800': '#065f46', '900': '#064e3b', '950': '#022c22'
  },
  rose: {
    '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af', '400': '#fb7185',
    '500': '#f43f5e', '600': '#e11d48', '700': '#be123c', '800': '#9f1239', '900': '#881337', '950': '#4c0519'
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  useEffect(() => {
    const themeColors = THEMES[theme];
    const root = document.documentElement;
    
    // Apply theme colors to both --brand-* and --color-brand-* (for Tailwind v4)
    Object.entries(themeColors).forEach(([level, color]) => {
      root.style.setProperty(`--brand-${level}`, color as string);
      root.style.setProperty(`--color-brand-${level}`, color as string);
      root.style.setProperty(`--color-indigo-${level}`, color as string);
    });
  }, [theme]);

  return <>{children}</>;
}
