import api from '@/lib/api';

export interface Message {
  _id: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  conversationType: 'direct' | 'group';
  participants?: string[];
  group?: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video' | 'link';
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size: number;
  }>;
  replyTo?: Message;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  readBy: Array<{
    user: string;
    readAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  type: 'direct' | 'group';
  // For direct messages
  friend?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  // For group messages
  group?: {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
}

class ChatService {
  // Send message
  async sendMessage(data: {
    conversationType: 'direct' | 'group';
    content: string;
    messageType?: string;
    recipientId?: string;
    groupId?: string;
    replyTo?: string;
    attachments?: Array<{
      url: string;
      type: string;
      name: string;
      size: number;
    }>;
  }) {
    const result = await api.post('/chat/messages', data);
    if (!result.message) {
      throw new Error('Failed to send message');
    }
    return result.message as unknown as Message;
  }

  // Get messages
  async getMessages(params: {
    type: 'direct' | 'group';
    recipientId?: string;
    groupId?: string;
    limit?: number;
    before?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params.recipientId) searchParams.append('recipientId', params.recipientId);
    if (params.groupId) searchParams.append('groupId', params.groupId);
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.before) searchParams.append('before', params.before);

    const response = await api.get(`/chat/messages/${params.type}?${searchParams.toString()}`);
    return ((response as any).messages || (response as any).data?.messages || []) as Message[];
  }

  // Get conversations (direct, group)
  async getConversations() {
    const data = await api.get('/chat/conversations');
    return ((data as any).conversations || (data as any).data?.conversations || []) as Conversation[];
  }

  // Get group conversations
  async getGroupConversations() {
    const data = await api.get('/groups');
    return ((data as any).groups || (data as any).data?.groups || []).map((group: any) => ({
      type: 'group' as const,
      group: {
        id: group._id || group.id,
        name: group.name,
        description: group.description,
        avatar: group.avatar,
      },
      unreadCount: 0,
    }));
  }

  // Mark messages as read
  async markAsRead(messageIds: string[]) {
    const data = await api.post('/chat/messages/read', { messageIds });
    return data;
  }

  // Edit message
  async editMessage(messageId: string, content: string) {
    const result = await api.put(`/chat/messages/${messageId}`, { content });
    if (!result.message) {
      throw new Error('Failed to edit message');
    }
    return result.message as unknown as Message;
  }

  // Delete message
  async deleteMessage(messageId: string) {
    const data = await api.delete(`/chat/messages/${messageId}`);
    return data;
  }
}

export default new ChatService();
