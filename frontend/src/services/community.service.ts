import api from '@/src/lib/api';

export interface CommunityMember {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  joinedAt: string;
  role: 'moderator' | 'member';
}

export interface Community {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  banner?: string;
  creator: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  moderators: string[];
  members: CommunityMember[];
  category: 'education' | 'technology' | 'science' | 'arts' | 'health' | 'business' | 'entertainment' | 'sports' | 'other';
  tags: string[];
  isPrivate: boolean;
  requiresApproval: boolean;
  rules?: Array<{
    title: string;
    description: string;
  }>;
  settings: {
    allowPosts: boolean;
    allowComments: boolean;
    allowPolls: boolean;
  };
  stats: {
    memberCount: number;
    postCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

class CommunityService {
  // Create community
  async createCommunity(data: {
    name: string;
    description?: string;
    avatar?: string;
    banner?: string;
    category: string;
    tags?: string[];
    isPrivate?: boolean;
    requiresApproval?: boolean;
    rules?: Array<{ title: string; description: string }>;
  }) {
    const result = await api.post('/communities', data);
    if (!result.community) {
      throw new Error('Failed to create community');
    }
    return result.community as Community;
  }

  // Get all communities (with filters)
  async getCommunities(filters?: {
    category?: string;
    search?: string;
    isPrivate?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isPrivate !== undefined) params.append('isPrivate', String(filters.isPrivate));

    const response = await api.get(`/communities/all?${params.toString()}`);
    return (response.communities || []) as Community[];
  }

  // Get community by ID or slug
  async getCommunity(identifier: string) {
    const data = await api.get(`/communities/${identifier}`);
    if (!data.community) {
      throw new Error('Community not found');
    }
    return data.community as Community;
  }

  // Get user's communities
  async getUserCommunities() {
    const data = await api.get('/communities/my/communities');
    return (data.communities || []) as Community[];
  }

  // Update community
  async updateCommunity(communityId: string, data: Partial<Community>) {
    const result = await api.put(`/communities/${communityId}`, data);
    if (!result.community) {
      throw new Error('Failed to update community');
    }
    return result.community as Community;
  }

  // Delete community
  async deleteCommunity(communityId: string) {
    const data = await api.delete(`/communities/${communityId}`);
    return data;
  }

  // Join community
  async joinCommunity(communityId: string) {
    const data = await api.post(`/communities/${communityId}/join`);
    if (!data.community) {
      throw new Error('Failed to join community');
    }
    return data.community as Community;
  }

  // Leave community
  async leaveCommunity(communityId: string) {
    const data = await api.post(`/communities/${communityId}/leave`);
    return data;
  }

  // Add moderator
  async addModerator(communityId: string, memberId: string) {
    const data = await api.put(`/communities/${communityId}/moderators/${memberId}`);
    if (!data.community) {
      throw new Error('Failed to add moderator');
    }
    return data.community as Community;
  }

  // Remove moderator
  async removeModerator(communityId: string, memberId: string) {
    const data = await api.delete(`/communities/${communityId}/moderators/${memberId}`);
    if (!data.community) {
      throw new Error('Failed to remove moderator');
    }
    return data.community as Community;
  }

  // Remove member
  async removeMember(communityId: string, memberId: string) {
    const data = await api.delete(`/communities/${communityId}/members/${memberId}`);
    if (!data.community) {
      throw new Error('Failed to remove member');
    }
    return data.community as Community;
  }

  // Search communities
  async searchCommunities(query: string) {
    const data = await api.get(`/communities/search?q=${encodeURIComponent(query)}`);
    return (data.communities || []) as Community[];
  }
}

export default new CommunityService();
