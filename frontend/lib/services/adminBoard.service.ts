/**
 * Admin Board Service
 * Handles admin board management API calls
 */

import { apiClient } from '@/lib/api';

export interface AdminBoard {
  _id: string;
  title: string;
  description?: string;
  owner: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  isPublic: boolean;
  isArchived: boolean;
  createdAt: Date;
  lastActivity: Date;
  elements: any[];
  members: any[];
}

export interface BoardStats {
  total: number;
  public: number;
  private: number;
  archived: number;
  recentlyCreated: AdminBoard[];
  mostActive: AdminBoard[];
}

export interface BoardAnalytics {
  board: {
    id: string;
    title: string;
    owner: any;
    isPublic: boolean;
    isArchived: boolean;
    createdAt: Date;
    lastActivity: Date;
  };
  stats: {
    totalElements: number;
    totalMembers: number;
    elementsByType: Record<string, number>;
    collaborators: any[];
  };
}

export const adminBoardService = {
  /**
   * Get all boards (admin)
   */
  async getAllBoards(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isPublic?: boolean;
    isArchived?: boolean;
  }): Promise<{ boards: AdminBoard[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isPublic !== undefined) queryParams.append('isPublic', params.isPublic.toString());
    if (params?.isArchived !== undefined) queryParams.append('isArchived', params.isArchived.toString());

    const response = await apiClient.get<any>(
      `/admin/boards?${queryParams.toString()}`
    );

    if (response.success) {
      return {
        boards: response.data || [],
        pagination: (response as any).pagination || {}
      };
    }

    throw new Error(response.error?.message || 'Failed to fetch boards');
  },

  /**
   * Get board analytics
   */
  async getBoardAnalytics(id: string): Promise<BoardAnalytics> {
    const response = await apiClient.get<BoardAnalytics>(`/admin/boards/${id}/analytics`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to fetch board analytics');
  },

  /**
   * Suspend board
   */
  async suspendBoard(id: string, reason: string): Promise<AdminBoard> {
    const response = await apiClient.put<AdminBoard>(`/admin/boards/${id}/suspend`, { reason });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to suspend board');
  },

  /**
   * Force delete board
   */
  async forceDeleteBoard(id: string): Promise<void> {
    const response = await apiClient.delete(`/admin/boards/${id}/force`);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete board');
    }
  },

  /**
   * Get board statistics
   */
  async getBoardStats(): Promise<BoardStats> {
    const response = await apiClient.get<BoardStats>('/admin/boards/stats');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to fetch board stats');
  },
};

export default adminBoardService;
