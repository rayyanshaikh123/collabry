/**
 * Authentication Service
 * Handles all auth-related API calls
 */

import { apiClient } from '@/lib/api';
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  RegisterResponse,
  Session,
  User,

} from '@/types/user.types';


export const authService = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<{ user: User; accessToken: string; csrfToken: string }>('/auth/login', credentials);

    if (response.success && response.data) {
      // Backend sends accessToken and csrfToken in JSON body, refreshToken via httpOnly cookie
      return {
        user: response.data.user,
        tokens: {
          accessToken: response.data.accessToken,
          csrfToken: response.data.csrfToken,
          // refreshToken is now an httpOnly cookie — not in JSON
        },
      };
    }

    throw new Error(response.error?.message || 'Login failed');
  },

  /**
   * Register new user — returns message (email verification required)
   */
  async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await apiClient.post<{ message: string }>('/auth/register', data);

    if (response.success) {
      return { message: response.message || 'Registration successful. Please check your email to verify your account.' };
    }

    throw new Error(response.error?.message || 'Registration failed');
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Backend revokes refresh token and clears httpOnly cookie
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Logout errors are non-critical — state will be cleared regardless
      console.warn('Backend logout request failed:', error);
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<{ accessToken: string; csrfToken: string }> {
    // Refresh token is sent automatically via httpOnly cookie (withCredentials: true)
    // Use a short timeout — if the backend is down we shouldn't block the UI for minutes
    const response = await apiClient.post<{ accessToken: string; csrfToken: string }>('/auth/refresh', undefined, {
      timeout: 10000, // 10 seconds
    });

    if (response.success && response.data) {
      return {
        accessToken: response.data.accessToken,
        csrfToken: response.data.csrfToken,
      };
    }

    throw new Error('Token refresh failed');
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<{ user: User }>('/users/me');

    if (response.success && response.data?.user) {
      return response.data.user;
    }

    throw new Error('Failed to fetch user profile');
  },

  /**
   * Update user profile
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.patch<{ user: User }>('/users/me', data);

    if (response.success && response.data?.user) {
      return response.data.user;
    }

    throw new Error('Failed to update profile');
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    const response = await apiClient.post('/auth/forgot-password', { email });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to send reset email');
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to reset password');
    }
  },

  /**
   * Verify email with token
   * TODO: Connect to backend /api/auth/verify-email
   */
  async verifyEmail(token: string): Promise<void> {
    const response = await apiClient.post('/auth/verify-email', { token });

    if (!response.success) {
      throw new Error(response.error?.message || 'Email verification failed');
    }
  },

  /**
   * Change password (authenticated user)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiClient.post('/users/change-password', {
      currentPassword,
      newPassword,
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to change password');
    }
  },

  /**
   * Delete user account
   */
  async deleteAccount(password: string): Promise<void> {
    const response = await apiClient.delete('/users/me', {
      data: { password },
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete account');
    }
  },

  /**
   * Resend email verification
   */
  async resendVerification(email: string): Promise<string> {
    const response = await apiClient.post<{ message: string }>('/auth/resend-verification', { email });

    if (response.success) {
      return response.message || 'Verification email sent. Please check your inbox.';
    }

    throw new Error(response.error?.message || 'Failed to resend verification email');
  },

  /**
   * Get active sessions for current user
   */
  async getActiveSessions(): Promise<Session[]> {
    const response = await apiClient.get<{ sessions: Session[] }>('/auth/sessions');

    if (response.success && response.data) {
      return response.data.sessions;
    }

    throw new Error(response.error?.message || 'Failed to fetch sessions');
  },

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    const response = await apiClient.delete(`/auth/sessions/${sessionId}`);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to revoke session');
    }
  },
};

export default authService;
