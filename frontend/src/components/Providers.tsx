'use client';

/**
 * Providers Component
 * Wraps app with all necessary providers (React Query, Theme, etc.)
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '../lib/queryClient';
import { ThemeProvider } from './ThemeProvider';
import { DarkModeInit } from './DarkModeInit';
import AlertModal from '../../components/AlertModal';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeInit />
      <ThemeProvider>
        {children}
        <AlertModal />
      </ThemeProvider>
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default Providers;
