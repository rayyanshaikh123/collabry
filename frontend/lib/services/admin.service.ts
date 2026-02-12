/**
 * Admin Service
 * Handles all admin-related API calls
 */

import { apiClient } from '@/lib/api';
import type { User, ApiResponse } from '@/types';

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: 'student' | 'admin' | 'mentor';
  isActive?: boolean;
  avatar?: string;
}

export interface UsersResponse {
  users: User[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export interface UserUsageData {
  today: {
    aiQuestions: number;
    fileUploads: number;
  };
  totals: {
    boards: number;
    notebooks: number;
  };
  limits: {
    aiQuestionsPerDay: number;
    boards: number;
    notebooks: number;
    groupMembers: number;
    storageGB: number;
    fileUploadsPerDay: number;
  };
}

export const adminService = {
  /**
   * Get all users with pagination and filters
   */
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<UsersResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.get<UsersResponse>(
      `/admin/users?${queryParams.toString()}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to fetch users');
  },

  /**
   * Get single user by ID
   */
  async getUser(id: string): Promise<{ user: User; usage?: UserUsageData }> {
    const response = await apiClient.get<{ user: User; usage?: UserUsageData }>(`/admin/users/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to fetch user');
  },

  /**
   * Create new user
   */
  async createUser(data: UserFormData): Promise<User> {
    const response = await apiClient.post<{ user: User }>('/admin/users', data);

    if (response.success && response.data) {
      return response.data.user;
    }

    throw new Error(response.error?.message || 'Failed to create user');
  },

  /**
   * Update user
   */
  async updateUser(id: string, data: Partial<UserFormData>): Promise<User> {
    const response = await apiClient.put<{ user: User }>(`/admin/users/${id}`, data);

    if (response.success && response.data) {
      return response.data.user;
    }

    throw new Error(response.error?.message || 'Failed to update user');
  },

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    const response = await apiClient.delete(`/admin/users/${id}`);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete user');
    }
  },

  /**
   * Bulk enable/disable users
   */
  async bulkUpdateUserStatus(userIds: string[], isActive: boolean): Promise<{ modifiedCount: number }> {
    const response = await apiClient.patch('/admin/users/bulk-status', { userIds, isActive });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to update users');
  },

  /**
   * Bulk delete users
   */
  async bulkDeleteUsers(userIds: string[]): Promise<{ deletedCount: number }> {
    const response = await apiClient.delete('/admin/users/bulk', { data: { userIds } });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to delete users');
  },

  /**
   * Get dashboard stats
   */
  async getDashboard(): Promise<any> {
    const response = await apiClient.get('/admin/dashboard');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error?.message || 'Failed to fetch dashboard');
  },
};

export default adminService;
