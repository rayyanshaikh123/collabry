/**
 * Authentication Service
 * Handles all auth-related API calls
 */

import { apiClient } from '../lib/api';
import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
  ApiResponse,
} from '../types';

export const authService = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', credentials);
    
    if (response.success && response.data) {
      // Backend returns { user, accessToken, refreshToken }
      // Transform to match AuthResponse type
      const authResponse: AuthResponse = {
        user: response.data.user,
        tokens: {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresIn: 900 // 15 minutes in seconds
        }
      };
      
      // Store tokens and user
      localStorage.setItem('accessToken', authResponse.tokens.accessToken);
      localStorage.setItem('refreshToken', authResponse.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      return authResponse;
    }
    
    throw new Error(response.error?.message || 'Login failed');
  },

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', data);
    
    if (response.success && response.data) {
      // Backend returns { user, accessToken, refreshToken }
      // Transform to match AuthResponse type
      const authResponse: AuthResponse = {
        user: response.data.user,
        tokens: {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresIn: 900 // 15 minutes in seconds
        }
      };
      
      // Store tokens and user
      localStorage.setItem('accessToken', authResponse.tokens.accessToken);
      localStorage.setItem('refreshToken', authResponse.tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      return authResponse;
    }
    
    throw new Error(response.error?.message || 'Registration failed');
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      // Try to call backend logout endpoint
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Silently handle logout errors - still clear local storage
      console.log('Backend logout skipped (not connected)');
    } finally {
      // Clear local storage regardless of backend response
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    const response = await apiClient.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken,
    });
    
    if (response.success && response.data) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      return response.data.accessToken;
    }
    
    throw new Error('Token refresh failed');
  },

  /**
   * Get current user profile
   * TODO: Connect to backend /api/auth/me
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch user profile');
  },

  /**
   * Update user profile
   * TODO: Connect to backend /api/auth/profile
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.patch<User>('/auth/profile', data);
    
    if (response.success && response.data) {
      return response.data;
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
};

export default authService;
