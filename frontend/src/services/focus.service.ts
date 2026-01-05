/**
 * Focus Mode Service
 * Handles all focus session-related API calls
 */

import { apiClient } from '../lib/api';
import type {
  FocusSession,
  FocusSettings,
  FocusStats,
  ApiResponse,
} from '../types';

export const focusService = {
  /**
   * Get all focus sessions for current user
   * TODO: Connect to backend /api/focus/sessions
   */
  async getSessions(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<FocusSession[]> {
    const response = await apiClient.get<FocusSession[]>('/focus/sessions', {
      params: filters,
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch sessions');
  },

  /**
   * Get single focus session by ID
   * TODO: Connect to backend /api/focus/sessions/:id
   */
  async getSession(sessionId: string): Promise<FocusSession> {
    const response = await apiClient.get<FocusSession>(`/focus/sessions/${sessionId}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch session');
  },

  /**
   * Start new focus session
   * TODO: Connect to backend /api/focus/sessions
   */
  async startSession(data: Partial<FocusSession>): Promise<FocusSession> {
    const response = await apiClient.post<FocusSession>('/focus/sessions', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to start session');
  },

  /**
   * Update focus session
   * TODO: Connect to backend /api/focus/sessions/:id
   */
  async updateSession(sessionId: string, data: Partial<FocusSession>): Promise<FocusSession> {
    const response = await apiClient.patch<FocusSession>(
      `/focus/sessions/${sessionId}`,
      data
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to update session');
  },

  /**
   * Pause focus session
   * TODO: Connect to backend /api/focus/sessions/:id/pause
   */
  async pauseSession(sessionId: string): Promise<FocusSession> {
    const response = await apiClient.post<FocusSession>(`/focus/sessions/${sessionId}/pause`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to pause session');
  },

  /**
   * Resume focus session
   * TODO: Connect to backend /api/focus/sessions/:id/resume
   */
  async resumeSession(sessionId: string): Promise<FocusSession> {
    const response = await apiClient.post<FocusSession>(`/focus/sessions/${sessionId}/resume`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to resume session');
  },

  /**
   * Complete focus session
   * TODO: Connect to backend /api/focus/sessions/:id/complete
   */
  async completeSession(
    sessionId: string,
    productivity?: number,
    notes?: string
  ): Promise<FocusSession> {
    const response = await apiClient.post<FocusSession>(
      `/focus/sessions/${sessionId}/complete`,
      { productivity, notes }
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to complete session');
  },

  /**
   * Cancel focus session
   * TODO: Connect to backend /api/focus/sessions/:id/cancel
   */
  async cancelSession(sessionId: string): Promise<void> {
    const response = await apiClient.post(`/focus/sessions/${sessionId}/cancel`);
    
    if (!response.success) {
      throw new Error('Failed to cancel session');
    }
  },

  /**
   * Get focus settings
   * TODO: Connect to backend /api/focus/settings
   */
  async getSettings(): Promise<FocusSettings> {
    const response = await apiClient.get<FocusSettings>('/focus/settings');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch settings');
  },

  /**
   * Update focus settings
   * TODO: Connect to backend /api/focus/settings
   */
  async updateSettings(data: Partial<FocusSettings>): Promise<FocusSettings> {
    const response = await apiClient.patch<FocusSettings>('/focus/settings', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to update settings');
  },

  /**
   * Get focus statistics
   * TODO: Connect to backend /api/focus/stats
   */
  async getStats(period?: 'day' | 'week' | 'month' | 'year'): Promise<FocusStats> {
    const response = await apiClient.get<FocusStats>('/focus/stats', {
      params: { period },
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch statistics');
  },
};

export default focusService;
