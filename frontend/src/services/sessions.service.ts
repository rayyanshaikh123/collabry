/**
 * Study Buddy Sessions Service
 * Manages chat sessions with MongoDB backend
 */

import axios, { AxiosInstance } from 'axios';

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isLoading?: boolean;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  last_message: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface SessionsListResponse {
  sessions: ChatSession[];
  total: number;
  limit_reached: boolean;
  max_sessions: number;
}

class SessionsService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: AI_ENGINE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - attach JWT token from Zustand in-memory state
    this.client.interceptors.request.use(
      (config) => {
        // Lazy import to avoid circular dependency
        const { useAuthStore } = require('../stores/auth.store');
        const token = useAuthStore.getState().accessToken;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log('✅ [Sessions Service] Response:', response.status, response.config.url);
        console.log('📦 [Sessions Service] Response data:', response.data);
        return response.data;
      },
      (error) => {
        let errorMessage = 'Request failed';
        
        if (error.response) {
          errorMessage = error.response.data?.detail 
            || error.response.data?.message 
            || `Server error: ${error.response.status}`;
          console.error('❌ [Sessions Service] Error response:', error.response.status, errorMessage);
        } else if (error.request) {
          errorMessage = 'No response from server';
          console.error('❌ [Sessions Service] No response from server');
        } else if (error.message) {
          errorMessage = error.message;
          console.error('❌ [Sessions Service] Error:', error.message);
        }
        
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  /**
   * Get all sessions for the current user
   */
  async getSessions(): Promise<SessionsListResponse> {
    return this.client.get('/ai/sessions');
  }

  /**
   * Create a new session
   */
  async createSession(title: string = 'New Chat Session'): Promise<ChatSession> {
    return this.client.post('/ai/sessions', { title });
  }

  /**
   * Get messages for a specific session
   */
  async getSessionMessages(sessionId: string): Promise<Message[]> {
    return this.client.get(`/ai/sessions/${sessionId}/messages`);
  }

  /**
   * Save a message to a session
   */
  async saveMessage(sessionId: string, message: Message): Promise<Message> {
    return this.client.post(`/ai/sessions/${sessionId}/messages`, message);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    return this.client.delete(`/ai/sessions/${sessionId}`);
  }
}

export const sessionsService = new SessionsService();
