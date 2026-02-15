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
  // Board sync is now handled by Yjs WebSocket (useYjsSync hook)
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

  /**
   * Connect to Notifications namespace
   */
  connectNotifications(token: string): Promise<Socket> {
    return new Promise((resolve) => {
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
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', () => {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Socket] Max reconnection attempts reached');
        this.disconnect();
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.notificationSocket) {
      this.notificationSocket.removeAllListeners();
      this.notificationSocket.disconnect();
      this.notificationSocket = null;
    }
  }

  // Note: 'off' removes listener from notification socket
  off(event: string, callback?: (...args: unknown[]) => void) {
    this.notificationSocket?.off(event, callback);
    this.socket?.off(event, callback);
  }

  // Notification methods
  getNotificationSocket(): Socket | null {
    return this.notificationSocket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
export default socketClient;
