/**
 * Study Buddy Sessions Service
 * Manages chat sessions with MongoDB backend
 */

import { apiClient } from '@/lib/api';

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
  constructor() {
    // Intentionally empty - we use the shared `apiClient` which
    // handles token injection, refresh, and error handling.
  }

  /**
   * Get all sessions for the current user
   */
  async getSessions(): Promise<SessionsListResponse> {
    try {
      // Use absolute URL to call AI engine while still benefiting
      // from the centralized token handling in apiClient.
      const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions`;
      const response = await apiClient.getClient().get<{ success: boolean; data: SessionsListResponse }>(url);
      return response.data.data || { sessions: [], total: 0, limit_reached: false, max_sessions: 50 };
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      return { sessions: [], total: 0, limit_reached: false, max_sessions: 50 };
    }
  }

  /**
   * Create a new session
   */
  async createSession(title: string = 'New Chat Session'): Promise<ChatSession> {
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions`;
    const response = await apiClient.getClient().post<{ success: boolean; data: ChatSession }>(url, { title });
    return response.data.data;
  }

  /**
   * Get messages for a specific session
   */
  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions/${sessionId}/messages`;
    const response = await apiClient.getClient().get<Message[]>(url);
    console.log('[PERSISTENCE DEBUG] API response:', response.data);
    // Backend returns array directly, not wrapped in { success, data }
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Save a message to a session
   */
  async saveMessage(sessionId: string, message: Message): Promise<Message> {
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions/${sessionId}/messages`;
    const response = await apiClient.getClient().post<{ success: boolean; data: Message }>(url, message);
    return response.data.data;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions/${sessionId}`;
    await apiClient.getClient().delete(url);
  }

  /**
   * Clear all messages from a session
   */
  async clearSessionMessages(sessionId: string): Promise<{ message: string; deleted_count: number }> {
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions/${sessionId}/messages`;
    const response = await apiClient.getClient().delete<{ success: boolean; data: { message: string; deleted_count: number } }>(url);
    return response.data.data;
  }
}

export const sessionsService = new SessionsService();
