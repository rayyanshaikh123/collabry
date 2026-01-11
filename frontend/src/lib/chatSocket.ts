import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://colab-back.onrender.com';

class ChatSocketClient {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private userEmail: string | null = null;

  connect(userId: string, userEmail: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.userId = userId;
    this.userEmail = userEmail;

    this.socket = io(`${SOCKET_URL}/chat`, {
      auth: {
        userId,
        userEmail,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('💬 Chat socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('💬 Chat socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('💬 Chat socket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Join conversation
  joinConversation(conversationType: string, conversationId: string) {
    this.socket?.emit('join:conversation', { conversationType, conversationId });
  }

  // Leave conversation
  leaveConversation(conversationType: string, conversationId: string) {
    this.socket?.emit('leave:conversation', { conversationType, conversationId });
  }

  // Send message
  sendMessage(data: any, callback?: (response: any) => void) {
    this.socket?.emit('message:send', data, callback);
  }

  // Typing indicators
  startTyping(conversationType: string, conversationId: string) {
    this.socket?.emit('typing:start', { conversationType, conversationId });
  }

  stopTyping(conversationType: string, conversationId: string) {
    this.socket?.emit('typing:stop', { conversationType, conversationId });
  }

  // Mark messages as read
  markAsRead(messageIds: string[], callback?: (response: any) => void) {
    this.socket?.emit('messages:mark-read', { messageIds }, callback);
  }

  // Edit message
  editMessage(messageId: string, content: string, callback?: (response: any) => void) {
    this.socket?.emit('message:edit', { messageId, content }, callback);
  }

  // Delete message
  deleteMessage(messageId: string, callback?: (response: any) => void) {
    this.socket?.emit('message:delete', { messageId }, callback);
  }

  // Listen for events
  onMessageNew(callback: (message: any) => void) {
    this.socket?.on('message:new', callback);
  }

  onMessageSent(callback: (message: any) => void) {
    this.socket?.on('message:sent', callback);
  }

  onMessageEdited(callback: (message: any) => void) {
    this.socket?.on('message:edited', callback);
  }

  onMessageDeleted(callback: (data: { messageId: string }) => void) {
    this.socket?.on('message:deleted', callback);
  }

  onMessagesRead(callback: (data: { messageIds: string[]; readBy: string }) => void) {
    this.socket?.on('messages:read', callback);
  }

  onUserTyping(callback: (data: { userId: string; userEmail: string }) => void) {
    this.socket?.on('user:typing', callback);
  }

  onUserStoppedTyping(callback: (data: { userId: string }) => void) {
    this.socket?.on('user:stopped-typing', callback);
  }

  // Remove event listeners
  offMessageNew(callback?: (message: any) => void) {
    this.socket?.off('message:new', callback);
  }

  offMessageSent(callback?: (message: any) => void) {
    this.socket?.off('message:sent', callback);
  }

  offMessageEdited(callback?: (message: any) => void) {
    this.socket?.off('message:edited', callback);
  }

  offMessageDeleted(callback?: (data: { messageId: string }) => void) {
    this.socket?.off('message:deleted', callback);
  }

  offMessagesRead(callback?: (data: { messageIds: string[]; readBy: string }) => void) {
    this.socket?.off('messages:read', callback);
  }

  offUserTyping(callback?: (data: { userId: string; userEmail: string }) => void) {
    this.socket?.off('user:typing', callback);
  }

  offUserStoppedTyping(callback?: (data: { userId: string }) => void) {
    this.socket?.off('user:stopped-typing', callback);
  }
}

export default new ChatSocketClient();
