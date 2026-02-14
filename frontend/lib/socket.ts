/**
 * Socket.IO Client
 * Handles realtime websocket connections for collaboration
 */

import { io, Socket } from 'socket.io-client';

// Determine socket URL from env variables
const getSocketUrl = () => {
  // Prefer explicit socket URL
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  // Fallback to API base URL (removing /api)
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace('/api', '');
  }
  // Default fallback
  return 'https://colab-back.onrender.com';
};

const SOCKET_URL = getSocketUrl();

class SocketClient {
  private socket: Socket | null = null;
  private boardSocket: Socket | null = null;
  private notificationSocket: Socket | null = null;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Get common socket options
   */
  private getSocketOptions(token: string) {
    return {
      auth: { token },
      transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      path: '/socket.io/', // Standard Socket.IO path
      withCredentials: true,
    };
  }

  /**
   * Connect to default namespace
   */
  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Cleanup existing if any
    this.disconnect();

    console.log('[Socket] Connecting to:', SOCKET_URL);

    this.socket = io(SOCKET_URL, this.getSocketOptions(token));

    this.setupEventHandlers();
    return this.socket;
  }

  /**
   * Connect to Boards namespace
   */
  connectBoards(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.boardSocket?.connected) {
        resolve(this.boardSocket);
        return;
      }

      // Cleanup existing
      if (this.boardSocket) {
        this.boardSocket.removeAllListeners();
        this.boardSocket.disconnect();
        this.boardSocket = null;
      }

      this.boardSocket = io(`${SOCKET_URL}/board`, this.getSocketOptions(token));

      const timeout = setTimeout(() => {
        if (!this.boardSocket?.connected) {
          reject(new Error('Board socket connection timeout'));
        }
      }, 5000);

      this.boardSocket.on('connect', () => {
        clearTimeout(timeout);
        console.log('[Board Socket] Connected');
        resolve(this.boardSocket!);
      });

      this.boardSocket.on('connect_error', (err) => {
        clearTimeout(timeout);
        console.error('[Board Socket] Connection error:', err.message);
        reject(err);
      });

      this.setupBoardEventHandlers();
    });
  }

  /**
   * Connect to Notifications namespace
   */
  connectNotifications(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.notificationSocket?.connected) {
        resolve(this.notificationSocket);
        return;
      }

      // Cleanup existing
      if (this.notificationSocket) {
        this.notificationSocket.removeAllListeners();
        this.notificationSocket.disconnect();
        this.notificationSocket = null;
      }

      console.log('[Notification Socket] Connecting...');

      // Note: Namespace in backend is '/notifications'
      this.notificationSocket = io(`${SOCKET_URL}/notifications`, this.getSocketOptions(token));

      const timeout = setTimeout(() => {
        if (!this.notificationSocket?.connected) {
          console.warn('[Notification Socket] Connection timeout - checking status');
          // Don't reject purely on timeout, let it keep retrying, but warn
        }
      }, 5000);

      this.notificationSocket.on('connect', () => {
        clearTimeout(timeout);
        console.log('[Notification Socket] Connected');
        resolve(this.notificationSocket!);
      });

      this.notificationSocket.on('connect_error', (err) => {
        // Don't reject immediately, allowing reconnect logic to work
        console.error('[Notification Socket] Connection error:', err.message);
      });

      this.notificationSocket.on('error', (err) => {
        console.error('[Notification Socket] Error:', err);
      });
    });
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
      console.error('[Socket] Connection error:', error.message);
      this.reconnectAttempts++;
    });
  }

  private setupBoardEventHandlers() {
    if (!this.boardSocket) return;

    this.boardSocket.on('disconnect', (reason) => {
      console.log('[Board Socket] Disconnected:', reason);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.disconnectBoards();
    this.disconnectNotifications();
  }

  disconnectBoards() {
    if (this.boardSocket) {
      this.boardSocket.removeAllListeners();
      this.boardSocket.disconnect();
      this.boardSocket = null;
    }
  }

  disconnectNotifications() {
    if (this.notificationSocket) {
      this.notificationSocket.removeAllListeners();
      this.notificationSocket.disconnect();
      this.notificationSocket = null;
    }
  }

  // Board collaboration events
  joinBoard(boardId: string, callback?: (response: any) => void) {
    if (this.boardSocket?.connected) {
      this.boardSocket.emit('board:join', { boardId }, callback);
    }
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

  // Note: 'off' needs to know which socket. Defaulting to boardSocket as it seems to be the main use case for dynamic listeners
  off(event: string, callback?: any) {
    this.boardSocket?.off(event, callback);
    this.notificationSocket?.off(event, callback);
    this.socket?.off(event, callback);
  }

  // Listen for full board updates
  onBoardUpdate(callback: (data: any) => void) {
    this.boardSocket?.on('board:update', callback);
  }

  // Notification methods
  getNotificationSocket(): Socket | null {
    return this.notificationSocket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  isBoardConnected(): boolean {
    return this.boardSocket?.connected ?? false;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
export default socketClient;
