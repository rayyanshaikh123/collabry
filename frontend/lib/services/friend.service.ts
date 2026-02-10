import api from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface FriendRequest {
  _id: string;
  from: User;
  to: User;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: string;
}

export interface Friendship {
  _id: string;
  user: User;
  since: string;
}

class FriendService {
  // Send friend request
  async sendRequest(toUserId: string, message?: string) {
    const data = await api.post('/friends/requests', { toUserId, message });
    return data;
  }

  // Get pending requests (received)
  async getPendingRequests() {
    const data = await api.get('/friends/requests/pending');
    return ((data as any).requests || (data as any).data?.requests || []) as FriendRequest[];
  }

  // Get sent requests
  async getSentRequests() {
    const data = await api.get('/friends/requests/sent');
    return ((data as any).requests || (data as any).data?.requests || []) as FriendRequest[];
  }

  // Accept friend request
  async acceptRequest(requestId: string) {
    const data = await api.put(`/friends/requests/${requestId}/accept`);
    return data;
  }

  // Reject friend request
  async rejectRequest(requestId: string) {
    const data = await api.put(`/friends/requests/${requestId}/reject`);
    return data;
  }

  // Cancel sent request
  async cancelRequest(requestId: string) {
    const data = await api.delete(`/friends/requests/${requestId}`);
    return data;
  }

  // Get friends list
  async getFriends() {
    const data = await api.get('/friends');
    return ((data as any).friends || (data as any).data?.friends || []) as Friendship[];
  }

  // Remove friend
  async removeFriend(friendshipId: string) {
    const data = await api.delete(`/friends/${friendshipId}`);
    return data;
  }

  // Search users
  async searchUsers(query: string) {
    const url = `/friends/search?q=${encodeURIComponent(query)}`;
    const data = await api.get(url);
    return ((data as any).users || (data as any).data?.users || []) as User[];
  }

  // Block friend
  async blockFriend(friendshipId: string) {
    const data = await api.put(`/friends/${friendshipId}/block`);
    return data;
  }

  // Unblock friend
  async unblockFriend(friendshipId: string) {
    const data = await api.put(`/friends/${friendshipId}/unblock`);
    return data;
  }
}

export default new FriendService();
