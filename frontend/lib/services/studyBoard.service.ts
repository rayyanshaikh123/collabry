/**
 * Study Board Service
 * Handles all study board REST API calls.
 * Element sync is handled via Yjs (see useYjsSync hook).
 */

import { apiClient } from '@/lib/api';
import type { StudyBoard, BoardMember } from '@/types';

export const studyBoardService = {
  // ── CRUD ────────────────────────────────────────────

  async getBoards(params?: { includeArchived?: boolean }): Promise<StudyBoard[]> {
    const query = params?.includeArchived ? '?includeArchived=true' : '';
    const response = await apiClient.get<StudyBoard[]>(`/boards${query}`);
    if (response.success && response.data) return response.data;
    throw new Error('Failed to fetch boards');
  },

  async getBoard(boardId: string): Promise<StudyBoard> {
    const response = await apiClient.get<StudyBoard>(`/boards/${boardId}`);
    if (response.success && response.data) return response.data;
    throw new Error('Failed to fetch board');
  },

  async createBoard(data: Partial<StudyBoard>): Promise<StudyBoard> {
    const response = await apiClient.post<StudyBoard>('/boards', data);
    if (response.success && response.data) return response.data;
    throw new Error('Failed to create board');
  },

  async updateBoard(boardId: string, data: Partial<StudyBoard>): Promise<StudyBoard> {
    const response = await apiClient.patch<StudyBoard>(`/boards/${boardId}`, data);
    if (response.success && response.data) return response.data;
    throw new Error('Failed to update board');
  },

  async deleteBoard(boardId: string): Promise<void> {
    const response = await apiClient.delete(`/boards/${boardId}`);
    if (!response.success) throw new Error('Failed to delete board');
  },

  // ── Search ──────────────────────────────────────────

  async searchBoards(query: string): Promise<StudyBoard[]> {
    const response = await apiClient.get<StudyBoard[]>(`/boards/search?q=${encodeURIComponent(query)}`);
    if (response.success && response.data) return response.data;
    throw new Error('Failed to search boards');
  },

  // ── Members ─────────────────────────────────────────

  async inviteMember(boardId: string, email: string, role: string = 'editor'): Promise<void> {
    const response = await apiClient.post(`/boards/${boardId}/invite`, { email, role });
    if (!response.success) {
      throw new Error((response as any).message || 'Failed to send invitation');
    }
  },

  async removeMember(boardId: string, userId: string): Promise<void> {
    const response = await apiClient.delete(`/boards/${boardId}/members/${userId}`);
    if (!response.success) throw new Error('Failed to remove member');
  },

  async updateMemberRole(boardId: string, userId: string, role: string): Promise<void> {
    const response = await apiClient.patch(`/boards/${boardId}/members/${userId}`, { role });
    if (!response.success) throw new Error('Failed to update member role');
  },

  /** Convenience — getBoard() already includes members */
  async getMembers(boardId: string): Promise<BoardMember[]> {
    const board = await this.getBoard(boardId);
    return board.members || [];
  },

  // ── Board actions ───────────────────────────────────

  async duplicateBoard(boardId: string): Promise<StudyBoard> {
    const response = await apiClient.post<StudyBoard>(`/boards/${boardId}/duplicate`, {});
    if (response.success && response.data) return response.data;
    throw new Error('Failed to duplicate board');
  },

  async archiveBoard(boardId: string, archive: boolean = true): Promise<StudyBoard> {
    const response = await apiClient.patch<StudyBoard>(`/boards/${boardId}/archive`, { archive });
    if (response.success && response.data) return response.data;
    throw new Error('Failed to archive board');
  },

  // ── Thumbnail ───────────────────────────────────────

  async saveThumbnail(boardId: string, thumbnailDataUrl: string): Promise<void> {
    const response = await apiClient.patch(`/boards/${boardId}`, { thumbnail: thumbnailDataUrl });
    if (!response.success) throw new Error('Failed to save thumbnail');
  },
};

export default studyBoardService;
