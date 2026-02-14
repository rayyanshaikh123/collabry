'use client';

/**
 * Providers Component
 * Wraps app with all necessary providers (React Query, Theme, etc.)
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from './ThemeProvider';
import { DarkModeInit } from './DarkModeInit';
import AlertModal from '@/components/AlertModal';
import { NotificationProvider } from './providers/NotificationProvider';
import { Toaster } from '@/components/ui/toaster';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeInit />
      <ThemeProvider>
        <NotificationProvider>
          {children}
          <AlertModal />
          <Toaster />
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default Providers;
