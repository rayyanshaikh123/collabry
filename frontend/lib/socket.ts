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
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
    return this.socket;
  }

  connectBoards(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      // If already connected, resolve immediately
      if (this.boardSocket?.connected) {
        resolve(this.boardSocket);
        return;
      }

      // If socket exists but not connected, disconnect and recreate
      if (this.boardSocket) {
        this.boardSocket.removeAllListeners();
        this.boardSocket.close();
        this.boardSocket = null;
      }

      this.boardSocket = io(`${SOCKET_URL}/boards`, {
        auth: {
          token,
        },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
      });

      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        // Don't destroy the socket — let Socket.IO keep retrying in the background
        console.error('[Board Socket] Initial connection timeout (15s). Socket will keep retrying.');
        reject(new Error('Board socket connection timeout'));
      }, 15000);

      this.boardSocket.on('connect', () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          resolve(this.boardSocket!);
        }
      });

      this.boardSocket.on('connect_error', (error) => {
        console.warn('[Board Socket] Connection error (will retry):', error.message, '| Description:', (error as any).description);
        // Don't reject or destroy — let Socket.IO reconnection handle it
      });

      this.boardSocket.on('error', (error) => {
        console.error('[Board Socket] Socket error:', error);
      });

      this.boardSocket.on('disconnect', (reason) => {
        console.warn('[Board Socket] Disconnected:', reason);
      });
    });
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Socket] Max reconnection attempts reached');
        this.disconnect();
      }
    });
  }

  private setupBoardEventHandlers() {
    // Event handlers are set up during connectBoards()
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.boardSocket) {
      this.boardSocket.removeAllListeners();
      this.boardSocket.disconnect();
      this.boardSocket = null;
    }
  }

  disconnectBoards() {
    if (this.boardSocket) {
      this.boardSocket.removeAllListeners();
      this.boardSocket.disconnect();
      this.boardSocket = null;
    }
  }

  // Board collaboration events
  joinBoard(boardId: string, callback?: (response: any) => void) {
    if (!this.boardSocket) {
      callback?.({ error: 'Socket not connected' });
      return;
    }
    if (!this.boardSocket.connected) {
      // Wait for reconnection then join
      this.boardSocket.once('connect', () => {
        this.boardSocket?.emit('board:join', { boardId }, callback);
      });
      return;
    }
    this.boardSocket.emit('board:join', { boardId }, callback);
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

  isBoardConnected(): boolean {
    return this.boardSocket?.connected ?? false;
  }

  // Get socket instance for advanced usage
  getSocket(): Socket | null {
    return this.socket;
  }

  getBoardSocket(): Socket | null {
    return this.boardSocket;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
export default socketClient;
