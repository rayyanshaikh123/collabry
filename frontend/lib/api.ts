/**
 * Axios API Client
 * Handles all HTTP requests with automatic token injection and refresh
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';
import { useAuthStore } from '@/lib/stores/auth.store';

// Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://colab-back.onrender.com/api';

class ApiClient {
  private client: AxiosInstance;
  private refreshing: boolean = false;
  private failedQueue: any[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds default (individual routes can override)
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable CORS credentials
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - attach access token and CSRF token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Attach CSRF token from store for state-mutating requests
        // In cross-origin setups, we can't read the backend's cookie from JS
        const csrfToken = this.getCsrfToken();
        if (csrfToken && config.headers) {
          config.headers['x-csrf-token'] = csrfToken;
        }
        
        // If data is FormData, remove Content-Type to let browser set it
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle 401 and refresh token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Log network errors for debugging
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          console.error('Network Error Details:', {
            code: error.code,
            message: error.message,
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            method: error.config?.method
          });
        }

        // Handle 401 Unauthorized — skip for auth endpoints to prevent refresh loops
        const requestUrl = originalRequest.url || '';
        const isAuthEndpoint = requestUrl.includes('/auth/');
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          if (this.refreshing) {
            // Queue requests while refreshing
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.refreshing = true;

          try {
            const newToken = await this.refreshAccessToken();
            this.processQueue(null, newToken);
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.handleAuthError();
            return Promise.reject(refreshError);
          } finally {
            this.refreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  }

  /**
   * Get the CSRF token from Zustand store.
   * In cross-origin setups, we can't read the backend's cookie from document.cookie,
   * so the backend includes it in login/refresh response bodies.
   */
  private getCsrfToken(): string | null {
    return useAuthStore.getState().csrfToken;
  }

  private async refreshAccessToken(): Promise<string> {
    try {
      // POST /auth/refresh — refresh token is sent automatically via httpOnly cookie
      const csrfToken = this.getCsrfToken();
      const headers: Record<string, string> = {};
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers,
          timeout: 10000, // 10s timeout for token refresh
        }
      );

      const { accessToken, csrfToken: newCsrfToken } = response.data.data;

      // Update tokens in Zustand store (memory only)
      useAuthStore.getState().setAccessToken(accessToken);
      if (newCsrfToken) {
        useAuthStore.getState().setCsrfToken(newCsrfToken);
      }

      return accessToken;
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      
      // Clear auth state and redirect to login
      this.handleAuthError();
      
      // Throw user-friendly error
      const errorMessage = error.response?.status === 401 
        ? '🔒 Your session has expired. Please log in again.'
        : 'Failed to refresh authentication. Please log in again.';
      
      throw new Error(errorMessage);
    }
  }

  private handleAuthError() {
    // Clear auth state directly — do NOT call logout() which would make another
    // API call that could 401 and re-trigger this handler (infinite loop).
    const store = useAuthStore.getState();
    store.setUser(null as any);
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }

  // Public API methods
  async get<T = any>(url: string, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async post<T = any>(url: string, data?: any, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async put<T = any>(url: string, data?: any, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async patch<T = any>(url: string, data?: any, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch(url, data, config);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async delete<T = any>(url: string, config = {}): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  private formatError(error: any): Error {
    if (axios.isAxiosError(error)) {
      // Extract error message from response with proper handling
      let message = error.response?.data?.message 
        || error.response?.data?.error;
      
      // Handle array of validation errors
      if (Array.isArray(error.response?.data?.errors)) {
        message = error.response.data.errors.map((e: any) => {
          // Handle different error formats
          if (typeof e === 'string') return e;
          if (typeof e === 'object') {
            return e.message || e.msg || e.error || e.detail || JSON.stringify(e);
          }
          return String(e);
        }).join('; ');
      }
      
      // Handle express-validator format: { errors: [{ msg, param, value }] }
      if (!message && error.response?.data?.errors) {
        try {
          const errors = error.response.data.errors;
          if (Array.isArray(errors)) {
            message = errors.map((err: any) => 
              `${err.param || 'field'}: ${err.msg || err.message || 'Invalid value'}`
            ).join('; ');
          }
        } catch {}
      }
      
      // Fallback to stringified data if message not found
      if (!message && error.response?.data) {
        try {
          const data = error.response.data;
          // If data is object with specific keys, extract them
          if (typeof data === 'object') {
            message = data.detail || data.hint || JSON.stringify(data, null, 2);
          } else {
            message = String(data);
          }
        } catch {
          message = 'Server returned invalid response';
        }
      }
      
      message = message || error.message || 'An unexpected error occurred';
      
      const formattedError = new Error(message);
      (formattedError as any).status = error.response?.status;
      (formattedError as any).data = error.response?.data;
      return formattedError;
    }
    
    return error instanceof Error ? error : new Error(String(error));
  }

  // Get the underlying axios instance for advanced usage
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
