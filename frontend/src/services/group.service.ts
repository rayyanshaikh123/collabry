import api from '@/src/lib/api';

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
    if (!data_response.group) {
      throw new Error('Failed to create group');
    }
    return data_response.group as Group;
  }

  // Get user's groups
  async getUserGroups() {
    const data = await api.get('/groups');
    return (data.groups || []) as Group[];
  }

  // Get group by ID
  async getGroup(groupId: string) {
    const data = await api.get(`/groups/${groupId}`);
    if (!data.group) {
      throw new Error('Group not found');
    }
    return data.group as Group;
  }

  // Update group
  async updateGroup(groupId: string, data: Partial<Group>) {
    const result = await api.put(`/groups/${groupId}`, data);
    if (!result.group) {
      throw new Error('Failed to update group');
    }
    return result.group as Group;
  }

  // Delete group
  async deleteGroup(groupId: string) {
    const data = await api.delete(`/groups/${groupId}`);
    return data;
  }

  // Add member
  async addMember(groupId: string, memberId: string) {
    const data = await api.post(`/groups/${groupId}/members`, { memberId });
    if (!data.group) {
      throw new Error('Failed to add member');
    }
    return data.group as Group;
  }

  // Remove member
  async removeMember(groupId: string, memberId: string) {
    const data = await api.delete(`/groups/${groupId}/members/${memberId}`);
    if (!data.group) {
      throw new Error('Failed to remove member');
    }
    return data.group as Group;
  }

  // Leave group
  async leaveGroup(groupId: string) {
    const data = await api.post(`/groups/${groupId}/leave`);
    return data;
  }

  // Make admin
  async makeAdmin(groupId: string, memberId: string) {
    const data = await api.put(`/groups/${groupId}/admins/${memberId}`);
    if (!data.group) {
      throw new Error('Failed to make admin');
    }
    return data.group as Group;
  }

  // Remove admin
  async removeAdmin(groupId: string, memberId: string) {
    const data = await api.delete(`/groups/${groupId}/admins/${memberId}`);
    if (!data.group) {
      throw new Error('Failed to remove admin');
    }
    return data.group as Group;
  }

  // Join with invite code
  async joinWithCode(inviteCode: string) {
    const data = await api.post('/groups/join', { inviteCode });
    if (!data.group) {
      throw new Error('Failed to join group');
    }
    return data.group as Group;
  }

  // Regenerate invite code
  async regenerateInviteCode(groupId: string) {
    const data = await api.post(`/groups/${groupId}/invite-code/regenerate`);
    return data.inviteCode as string;
  }
}

export default new GroupService();
