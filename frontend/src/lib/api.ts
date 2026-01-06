/**
 * Axios API Client
 * Handles all HTTP requests with automatic token injection and refresh
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '../types';

// Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

class ApiClient {
  private client: AxiosInstance;
  private refreshing: boolean = false;
  private failedQueue: any[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 300000, // 5 minutes for large quiz generation
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable CORS credentials
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - attach access token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
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

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
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
    // TODO: Get from Zustand auth store
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    // TODO: Get from Zustand auth store
    return localStorage.getItem('refreshToken');
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // TODO: Replace with actual refresh endpoint
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    const { accessToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    
    return accessToken;
  }

  private handleAuthError() {
    // Clear tokens and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // TODO: Dispatch to auth store logout action
    window.location.href = '/login';
  }

  // Public API methods
  async get<T = any>(url: string, config = {}): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config = {}): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config = {}): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config = {}): Promise<ApiResponse<T>> {
    const response = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config = {}): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Get the underlying axios instance for advanced usage
  getClient(): AxiosInstance {
    return this.client;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
