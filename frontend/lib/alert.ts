/**
 * Alert utility function
 * Replaces native alert() with themed modal
 */

import { useUIStore } from '@/lib/stores/ui.store';

export const showAlert = (
  message: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info',
  title?: string,
  onConfirm?: () => void,
  confirmText?: string
) => {
  const store = useUIStore.getState();
  store.showAlert({
    message,
    type,
    title,
    onConfirm,
    confirmText,
  });
};

// Convenience functions
export const showSuccess = (message: string, title?: string) => {
  showAlert(message, 'success', title);
};

export const showError = (message: string, title?: string) => {
  showAlert(message, 'error', title || 'Error');
};

export const showWarning = (message: string, title?: string) => {
  showAlert(message, 'warning', title || 'Warning');
};

export const showInfo = (message: string, title?: string) => {
  showAlert(message, 'info', title || 'Information');
};

// Confirmation dialog
export const showConfirm = (
  message: string,
  onConfirm: () => void,
  title: string = 'Confirm',
  confirmText: string = 'Confirm',
  cancelText: string = 'Cancel'
): void => {
  const store = useUIStore.getState();
  store.showAlert({
    message,
    type: 'warning',
    title,
    confirmText,
    onConfirm,
  });
};

