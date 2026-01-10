import { useState, useCallback } from 'react';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = useCallback(({ title, description, variant }: ToastProps) => {
    const message = `${title ? title + ': ' : ''}${description || ''}`;
    
    // Log to console for debugging
    const style = variant === 'destructive' ? 'color: red; font-weight: bold' : 'color: green; font-weight: bold';
    console.log(`%c[TOAST] ${message}`, style);
    
    // Show browser notification for better visibility
    if (variant === 'destructive') {
      // Use a more visible approach for errors
      setTimeout(() => alert(message), 100);
    } else {
      // Success messages in console only to avoid spam
      console.info('✓', message);
    }
  }, []);

  return { toast };
}
