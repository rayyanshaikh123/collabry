/**
 * Study Board Service
 * Handles all study board-related API calls
 */

import { apiClient } from '@/lib/api';
import type {
  StudyBoard,
  BoardElement,
} from '@/types';

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
   */
  async deleteBoard(boardId: string): Promise<void> {
    const response = await apiClient.delete(`/boards/${boardId}`);
    
    if (!response.success) {
      throw new Error('Failed to delete board');
    }
  },

  /**
   * Add element to board
   * NOTE: Use Socket.IO 'element:create' event instead for real-time collaboration.
   * This REST endpoint is not implemented - elements are managed via WebSocket.
   * @deprecated Use Socket.IO boardNamespace.emit('element:create', { boardId, element })
   */
  async addElement(boardId: string, element: Partial<BoardElement>): Promise<BoardElement> {
    throw new Error('Use Socket.IO element:create event instead of REST API');
  },

  /**
   * Update board element
   * NOTE: Use Socket.IO 'element:update' event instead for real-time collaboration.
   * This REST endpoint is not implemented - elements are managed via WebSocket.
   * @deprecated Use Socket.IO boardNamespace.emit('element:update', { boardId, elementId, changes })
   */
  async updateElement(
    boardId: string,
    elementId: string,
    data: Partial<BoardElement>
  ): Promise<BoardElement> {
    throw new Error('Use Socket.IO element:update event instead of REST API');
  },

  /**
   * Delete board element
   * NOTE: Use Socket.IO 'element:delete' event instead for real-time collaboration.
   * This REST endpoint is not implemented - elements are managed via WebSocket.
   * @deprecated Use Socket.IO boardNamespace.emit('element:delete', { boardId, elementId })
   */
  async deleteElement(boardId: string, elementId: string): Promise<void> {
    throw new Error('Use Socket.IO element:delete event instead of REST API');
  },

  /**
   * Invite user to board by email
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
   * Remove member from board
   * Backend uses 'members' terminology, not 'participants'
   */
  async removeMember(boardId: string, userId: string): Promise<void> {
    const response = await apiClient.delete(`/boards/${boardId}/members/${userId}`);
    
    if (!response.success) {
      throw new Error('Failed to remove member');
    }
  },

  /**
   * Get board members/participants
   * Note: Members are included in the board object from getBoard().
   * This is a convenience method that fetches the board and returns just the members.
   */
  async getMembers(boardId: string): Promise<any[]> {
    const board = await this.getBoard(boardId);
    
    // Combine owner and members into a single array
    const members = board.members || [];
    
    // Add owner to the list if not already present
    if (board.owner) {
      const ownerInMembers = members.some((m: any) => 
        m.userId === board.owner._id || m.userId === board.owner
      );
      
      if (!ownerInMembers) {
        members.unshift({
          userId: board.owner._id || board.owner,
          role: 'owner',
          email: board.owner.email,
          name: board.owner.name,
          addedAt: board.createdAt
        });
      }
    }
    
    return members;
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
