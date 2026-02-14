/**
 * Authentication Store (Zustand)
 * Manages authentication state and user session
 *
 * Security:
 * - accessToken is kept in memory only (NOT persisted to localStorage)
 * - refreshToken lives in an httpOnly cookie (never touched by JS)
 * - Only `user` and `isAuthenticated` are persisted for UX continuity
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, RegisterData } from '@/types/user.types';
import { authService } from '@/lib/services/auth.service';
import { socketClient } from '@/lib/socket';

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null; // in-memory only — NOT persisted
  csrfToken: string | null; // in-memory only — needed for cross-origin requests
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean; // tracks Zustand persist hydration

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<string>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  setCsrfToken: (token: string) => void;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      csrfToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      // Login action
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.login(credentials);

          set({
            user: response.user,
            accessToken: response.tokens.accessToken,
            csrfToken: response.tokens.csrfToken,
            isAuthenticated: true,
            isLoading: false,
          });

          // Connect socket with auth token
          socketClient.connect(response.tokens.accessToken);
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      // Register action — returns message (email verification required, no auto-login)
      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.register(data);

          set({ isLoading: false });

          // Return the message so UI can display "check your email"
          return response.message;
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      // Logout action
      logout: async () => {
        try {
          // Disconnect socket first
          socketClient.disconnect();

          // Call backend logout (revokes token + clears cookie)
          await authService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear in-memory state
          set({
            user: null,
            accessToken: null,
            csrfToken: null,
            isAuthenticated: false,
            error: null,
            isLoading: false,
          });
        }
      },

      // Set user
      setUser: (user: User) => {
        set({ user });
      },

      // Set access token (called by api.ts after refresh)
      setAccessToken: (token: string) => {
        set({ accessToken: token });
      },

      // Set CSRF token (called by api.ts after refresh)
      setCsrfToken: (token: string) => {
        set({ csrfToken: token });
      },

      // Refresh session — uses httpOnly cookie automatically
      refreshSession: async () => {
        try {
          const response = await authService.refreshToken();

          set({ 
            accessToken: response.accessToken,
            csrfToken: response.csrfToken,
          });
        } catch (error) {
          // Refresh failed — clear state directly (don't call logout() which
          // makes another API call that could also fail and loop)
          socketClient.disconnect();
          set({
            user: null,
            accessToken: null,
            csrfToken: null,
            isAuthenticated: false,
            error: null,
            isLoading: false,
          });
          throw error;
        }
      },

      // Check authentication status
      checkAuth: async () => {
        const { accessToken, isAuthenticated } = get();
        console.log('[AuthStore] checkAuth started. isAuthenticated:', isAuthenticated, 'hasToken:', !!accessToken);

        set({ isLoading: true });

        // If persisted state says authenticated but no in-memory token,
        // proactively refresh before calling /auth/me
        if (isAuthenticated && !accessToken) {
          console.log('[AuthStore] Authenticated but no token. Attempting refresh...');
          try {
            await get().refreshSession();
            console.log('[AuthStore] Refresh successful.');
          } catch (err) {
            console.error('[AuthStore] Refresh failed during checkAuth:', err);
            set({ isAuthenticated: false, user: null, accessToken: null, isLoading: false });
            return;
          }
        }

        const currentToken = get().accessToken;
        if (!currentToken) {
          console.log('[AuthStore] No token after refresh check. Auth failed.');
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        try {
          console.log('[AuthStore] Fetching current user...');
          const user = await authService.getCurrentUser();
          console.log('[AuthStore] Fetch success. User:', user.name);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });

          // Reconnect socket if disconnected
          if (!socketClient.isConnected()) {
            socketClient.connect(currentToken);
          }
        } catch {
          // Token invalid, clear auth
          set({
            user: null,
            accessToken: null,
            csrfToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Called by onRehydrateStorage when Zustand finishes reading localStorage
      setHasHydrated: (v: boolean) => {
        set({ _hasHydrated: v });
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user identity — tokens stay in memory for XSS protection
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return () => {
          // Called once Zustand has finished reading from localStorage
          useAuthStore.getState().setHasHydrated(true);
        };
      },
    }
  )
);

// Selectors (for optimized re-renders)
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectUserRole = (state: AuthState) => state.user?.role;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;
