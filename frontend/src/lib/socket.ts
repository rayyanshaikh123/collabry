/**
 * Socket.IO Client
 * Handles realtime websocket connections for collaboration
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
    return this.socket;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Socket] Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Board collaboration events
  joinBoard(boardId: string) {
    // TODO: Implement board join logic
    this.socket?.emit('board:join', { boardId });
  }

  leaveBoard(boardId: string) {
    // TODO: Implement board leave logic
    this.socket?.emit('board:leave', { boardId });
  }

  sendBoardUpdate(boardId: string, update: any) {
    // TODO: Implement board update broadcast
    this.socket?.emit('board:update', { boardId, update });
  }

  sendCursorPosition(boardId: string, position: { x: number; y: number }) {
    // TODO: Implement cursor position broadcast
    this.socket?.emit('board:cursor', { boardId, position });
  }

  // Event listeners
  onBoardUpdate(callback: (data: any) => void) {
    // TODO: Listen for board updates from other users
    this.socket?.on('board:update', callback);
  }

  onUserJoined(callback: (data: any) => void) {
    // TODO: Listen for user join events
    this.socket?.on('board:user-joined', callback);
  }

  onUserLeft(callback: (data: any) => void) {
    // TODO: Listen for user leave events
    this.socket?.on('board:user-left', callback);
  }

  onCursorMove(callback: (data: any) => void) {
    // TODO: Listen for cursor movements
    this.socket?.on('board:cursor', callback);
  }

  // Remove event listeners
  off(event: string, callback?: any) {
    this.socket?.off(event, callback);
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Get socket instance for advanced usage
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
export default socketClient;
