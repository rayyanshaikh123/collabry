/**
 * Study Board Service
 * Handles all study board-related API calls
 */

import { apiClient } from '../lib/api';
import type {
  StudyBoard,
  BoardElement,
  BoardUpdate,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const studyBoardService = {
  /**
   * Get all boards for current user
   */
  async getBoards(): Promise<StudyBoard[]> {
    const response = await apiClient.get<any>('/boards');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch boards');
  },

  /**
   * Get single board by ID
   */
  async getBoard(boardId: string): Promise<StudyBoard> {
    const response = await apiClient.get<any>(`/boards/${boardId}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch board');
  },

  /**
   * Create new board
   */
  async createBoard(data: Partial<StudyBoard>): Promise<StudyBoard> {
    const response = await apiClient.post<any>('/boards', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to create board');
  },

  /**
   * Update board
   * TODO: Connect to backend /api/boards/:id
   */
  async updateBoard(boardId: string, data: Partial<StudyBoard>): Promise<StudyBoard> {
    const response = await apiClient.patch<StudyBoard>(`/boards/${boardId}`, data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to update board');
  },

  /**
   * Delete board
   * TODO: Connect to backend /api/boards/:id
   */
  async deleteBoard(boardId: string): Promise<void> {
    const response = await apiClient.delete(`/boards/${boardId}`);
    
    if (!response.success) {
      throw new Error('Failed to delete board');
    }
  },

  /**
   * Add element to board
   * TODO: Connect to backend /api/boards/:id/elements
   */
  async addElement(boardId: string, element: Partial<BoardElement>): Promise<BoardElement> {
    const response = await apiClient.post<BoardElement>(
      `/boards/${boardId}/elements`,
      element
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to add element');
  },

  /**
   * Update board element
   * TODO: Connect to backend /api/boards/:id/elements/:elementId
   */
  async updateElement(
    boardId: string,
    elementId: string,
    data: Partial<BoardElement>
  ): Promise<BoardElement> {
    const response = await apiClient.patch<BoardElement>(
      `/boards/${boardId}/elements/${elementId}`,
      data
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to update element');
  },

  /**
   * Delete board element
   * TODO: Connect to backend /api/boards/:id/elements/:elementId
   */
  async deleteElement(boardId: string, elementId: string): Promise<void> {
    const response = await apiClient.delete(`/boards/${boardId}/elements/${elementId}`);
    
    if (!response.success) {
      throw new Error('Failed to delete element');
    }
  },

  /**
   * Invite user to board
   * TODO: Connect to backend /api/boards/:id/invite
   */
  async inviteUser(boardId: string, email: string, role: 'editor' | 'viewer'): Promise<void> {
    const response = await apiClient.post(`/boards/${boardId}/invite`, {
      email,
      role,
    });
    
    if (!response.success) {
      throw new Error('Failed to invite user');
    }
  },

  /**
   * Remove user from board
   * TODO: Connect to backend /api/boards/:id/participants/:userId
   */
  async removeParticipant(boardId: string, userId: string): Promise<void> {
    const response = await apiClient.delete(`/boards/${boardId}/participants/${userId}`);
    
    if (!response.success) {
      throw new Error('Failed to remove participant');
    }
  },

  /**
   * Get board participants
   * TODO: Connect to backend /api/boards/:id/participants
   */
  async getParticipants(boardId: string): Promise<any[]> {
    const response = await apiClient.get<any[]>(`/boards/${boardId}/participants`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch participants');
  },

  /**
   * Invite member by email
   */
  async inviteMember(boardId: string, email: string, role: string = 'editor'): Promise<any> {
    try {
      const response = await apiClient.post<any>(`/boards/${boardId}/invite`, { email, role });
      
      if (response.success) {
        return response.data || response;
      }
      
      throw new Error(response.message || 'Failed to send invitation');
    } catch (error: any) {
      // Re-throw with better error message
      const message = error.response?.data?.message || error.message || 'Failed to send invitation';
      throw new Error(message);
    }
  },
};

export default studyBoardService;
