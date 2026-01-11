/**
 * Socket.IO Client
 * Handles realtime websocket connections for collaboration
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'https://colab-back.onrender.com';

class SocketClient {
  private socket: Socket | null = null;
  private boardSocket: Socket | null = null;
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

  connectBoards(token: string) {
    if (this.boardSocket?.connected) {
      return this.boardSocket;
    }

    this.boardSocket = io(`${SOCKET_URL}/boards`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupBoardEventHandlers();
    return this.boardSocket;
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

  private setupBoardEventHandlers() {
    if (!this.boardSocket) return;

    this.boardSocket.on('connect', () => {
      console.log('[Board Socket] Connected:', this.boardSocket?.id);
    });

    this.boardSocket.on('disconnect', (reason) => {
      console.log('[Board Socket] Disconnected:', reason);
    });

    this.boardSocket.on('connect_error', (error) => {
      console.error('[Board Socket] Connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.boardSocket) {
      this.boardSocket.disconnect();
      this.boardSocket = null;
    }
  }

  // Board collaboration events
  joinBoard(boardId: string, callback?: (response: any) => void) {
    this.boardSocket?.emit('board:join', { boardId }, callback);
  }

  leaveBoard(boardId: string) {
    this.boardSocket?.emit('board:leave', { boardId });
  }

  createElement(boardId: string, element: any, callback?: (response: any) => void) {
    this.boardSocket?.emit('element:create', { boardId, element }, callback);
  }

  updateElement(boardId: string, elementId: string, changes: any, callback?: (response: any) => void) {
    this.boardSocket?.emit('element:update', { boardId, elementId, changes }, callback);
  }

  deleteElement(boardId: string, elementId: string, callback?: (response: any) => void) {
    this.boardSocket?.emit('element:delete', { boardId, elementId }, callback);
  }

  sendBoardUpdate(boardId: string, update: any) {
    this.boardSocket?.emit('board:update', { boardId, update });
  }

  sendCursorPosition(boardId: string, position: { x: number; y: number }) {
    this.boardSocket?.emit('cursor:move', { boardId, position });
  }

  // Event listeners
  onElementCreated(callback: (data: any) => void) {
    this.boardSocket?.on('element:created', callback);
  }

  onElementUpdated(callback: (data: any) => void) {
    this.boardSocket?.on('element:updated', callback);
  }

  onElementDeleted(callback: (data: any) => void) {
    this.boardSocket?.on('element:deleted', callback);
  }

  onUserJoined(callback: (data: any) => void) {
    this.boardSocket?.on('user:joined', callback);
  }

  onUserLeft(callback: (data: any) => void) {
    this.boardSocket?.on('user:left', callback);
  }

  onCursorMove(callback: (data: any) => void) {
    this.boardSocket?.on('cursor:moved', callback);
  }
  // Remove event listeners from sockets
  off(event: string, callback?: any) {
    this.socket?.off(event, callback);
    this.boardSocket?.off(event, callback);
  }

  // Listen for full board updates
  onBoardUpdate(callback: (data: any) => void) {
    this.boardSocket?.on('board:update', callback);
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
