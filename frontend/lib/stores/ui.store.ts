/**
 * UI Store (Zustand)
 * Manages global UI state (modals, sidebar, theme, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeType } from '@/types';

interface UIState {
  // State
  theme: ThemeType;
  darkMode: boolean;
  isSidebarOpen: boolean;
  isMobileSidebarOpen: boolean;
  activeModal: string | null;
  isLoading: boolean;
  notifications: Notification[];
  alert: AlertState;

  // Actions
  setTheme: (theme: ThemeType) => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setLoading: (isLoading: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  showAlert: (alert: Omit<AlertState, 'isOpen'>) => void;
  hideAlert: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface AlertState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  onCancel?: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'indigo',
      darkMode: false,
      isSidebarOpen: true,
      isMobileSidebarOpen: false,
      activeModal: null,
      isLoading: false,
      notifications: [],
      alert: {
        isOpen: false,
        message: '',
        type: 'info',
      },

      // Set theme
      setTheme: (theme: ThemeType) => {
        set({ theme });
        
        // Apply theme to DOM
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
      },

      // Toggle dark mode
      toggleDarkMode: () => {
        const newDarkMode = !get().darkMode;
        set({ darkMode: newDarkMode });
        
        // Apply dark mode to DOM
        const root = document.documentElement;
        if (newDarkMode) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },

      // Set dark mode
      setDarkMode: (enabled: boolean) => {
        set({ darkMode: enabled });
        
        // Apply dark mode to DOM
        const root = document.documentElement;
        if (enabled) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },

      // Toggle sidebar
      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
      },

      // Toggle mobile sidebar
      toggleMobileSidebar: () => {
        set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen }));
      },

      // Open modal
      openModal: (modalId: string) => {
        set({ activeModal: modalId });
      },

      // Close modal
      closeModal: () => {
        set({ activeModal: null });
      },

      // Set loading
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      // Add notification
      addNotification: (notification: Omit<Notification, 'id'>) => {
        const id = `notif-${Date.now()}-${Math.random()}`;
        const newNotif: Notification = {
          id,
          ...notification,
        };

        set((state) => ({
          notifications: [...state.notifications, newNotif],
        }));

        // Auto-remove after duration
        if (notification.duration) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration);
        }
      },

      // Remove notification
      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      // Clear all notifications
      clearNotifications: () => {
        set({ notifications: [] });
      },

      // Show alert
      showAlert: (alertData) => {
        set({
          alert: {
            ...alertData,
            isOpen: true,
            cancelText: alertData.cancelText || 'Cancel',
          },
        });
      },

      // Hide alert
      hideAlert: () => {
        set((state) => ({
          alert: {
            ...state.alert,
            isOpen: false,
          },
        }));
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        darkMode: state.darkMode,
        isSidebarOpen: state.isSidebarOpen,
      }),
    }
  )
);

// Selectors
export const selectTheme = (state: UIState) => state.theme;
export const selectIsSidebarOpen = (state: UIState) => state.isSidebarOpen;
export const selectActiveModal = (state: UIState) => state.activeModal;
export const selectNotifications = (state: UIState) => state.notifications;
