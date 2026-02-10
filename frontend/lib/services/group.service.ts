import api from '@/lib/api';

export interface GroupMember {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  joinedAt: string;
  role: 'admin' | 'member';
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  creator: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  admins: string[];
  members: GroupMember[];
  isPrivate: boolean;
  inviteCode?: string;
  settings: {
    allowMemberInvite: boolean;
    allowMemberPost: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

class GroupService {
  // Create group
  async createGroup(data: {
    name: string;
    description?: string;
    avatar?: string;
    isPrivate?: boolean;
  }) {
    const data_response = await api.post('/groups', data);
    const group = (data_response as any).group || (data_response as any).data?.group;
    if (!group) {
      throw new Error('Failed to create group');
    }
    return group as Group;
  }

  // Get user's groups
  async getUserGroups() {
    const data = await api.get('/groups');
    return ((data as any).groups || (data as any).data?.groups || []) as Group[];
  }

  // Get group by ID
  async getGroup(groupId: string) {
    const data = await api.get(`/groups/${groupId}`);
    const group = (data as any).group || (data as any).data?.group;
    if (!group) {
      throw new Error('Group not found');
    }
    return group as Group;
  }

  // Update group
  async updateGroup(groupId: string, data: Partial<Group>) {
    const result = await api.put(`/groups/${groupId}`, data);
    const updated = (result as any).group || (result as any).data?.group;
    if (!updated) {
      throw new Error('Failed to update group');
    }
    return updated as Group;
  }

  // Delete group
  async deleteGroup(groupId: string) {
    const data = await api.delete(`/groups/${groupId}`);
    return data;
  }

  // Add member
  async addMember(groupId: string, memberId: string) {
    const data = await api.post(`/groups/${groupId}/members`, { memberId });
    const updated = (data as any).group || (data as any).data?.group;
    if (!updated) {
      throw new Error('Failed to add member');
    }
    return updated as Group;
  }

  // Remove member
  async removeMember(groupId: string, memberId: string) {
    const data = await api.delete(`/groups/${groupId}/members/${memberId}`);
    const updated = (data as any).group || (data as any).data?.group;
    if (!updated) {
      throw new Error('Failed to remove member');
    }
    return updated as Group;
  }

  // Leave group
  async leaveGroup(groupId: string) {
    const data = await api.post(`/groups/${groupId}/leave`);
    return data;
  }

  // Make admin
  async makeAdmin(groupId: string, memberId: string) {
    const data = await api.put(`/groups/${groupId}/admins/${memberId}`);
    const updated = (data as any).group || (data as any).data?.group;
    if (!updated) {
      throw new Error('Failed to make admin');
    }
    return updated as Group;
  }

  // Remove admin
  async removeAdmin(groupId: string, memberId: string) {
    const data = await api.delete(`/groups/${groupId}/admins/${memberId}`);
    const updated = (data as any).group || (data as any).data?.group;
    if (!updated) {
      throw new Error('Failed to remove admin');
    }
    return updated as Group;
  }

  // Join with invite code
  async joinWithCode(inviteCode: string) {
    const data = await api.post('/groups/join', { inviteCode });
    const group = (data as any).group || (data as any).data?.group;
    if (!group) {
      throw new Error('Failed to join group');
    }
    return group as Group;
  }

  // Regenerate invite code
  async regenerateInviteCode(groupId: string) {
    const data = await api.post(`/groups/${groupId}/invite-code/regenerate`);
    return ((data as any).inviteCode || (data as any).data?.inviteCode) as string;
  }
}

export default new GroupService();
