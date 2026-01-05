/**
 * UI Store (Zustand)
 * Manages global UI state (modals, sidebar, theme, etc.)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeType } from '../types';

interface UIState {
  // State
  theme: ThemeType;
  isSidebarOpen: boolean;
  isMobileSidebarOpen: boolean;
  activeModal: string | null;
  isLoading: boolean;
  notifications: Notification[];

  // Actions
  setTheme: (theme: ThemeType) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setLoading: (isLoading: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'indigo',
      isSidebarOpen: true,
      isMobileSidebarOpen: false,
      activeModal: null,
      isLoading: false,
      notifications: [],

      // Set theme
      setTheme: (theme: ThemeType) => {
        set({ theme });
        
        // Apply theme to DOM
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
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
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
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
