/**
 * Study Buddy Sessions Service
 * Manages chat sessions with MongoDB backend
 */

import { apiClient } from '../lib/api';

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
    // Use absolute URL to call AI engine while still benefiting
    // from the centralized token handling in apiClient.
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions`;
    return apiClient.get(url);
  }

  /**
   * Create a new session
   */
  async createSession(title: string = 'New Chat Session'): Promise<ChatSession> {
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions`;
    return apiClient.post(url, { title });
  }

  /**
   * Get messages for a specific session
   */
  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions/${sessionId}/messages`;
    return apiClient.get(url);
  }

  /**
   * Save a message to a session
   */
  async saveMessage(sessionId: string, message: Message): Promise<Message> {
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions/${sessionId}/messages`;
    return apiClient.post(url, message);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const url = `${AI_ENGINE_URL.replace(/\/+$/, '')}/ai/sessions/${sessionId}`;
    return apiClient.delete(url);
  }
}

export const sessionsService = new SessionsService();
