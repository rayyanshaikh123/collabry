/**
 * Realtime Collaboration Types
 */

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface CollaborationUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  status: PresenceStatus;
  currentBoard?: string;
  cursor?: {
    x: number;
    y: number;
    color: string;
  };
  lastSeen: string;
}

export interface SocketEvent {
  type: string;
  payload: any;
  timestamp: string;
  userId?: string;
}

export interface CollaborationState {
  connected: boolean;
  reconnecting: boolean;
  usersOnline: CollaborationUser[];
  currentRoom?: string;
  syncStatus: 'synced' | 'syncing' | 'conflict' | 'error';
}
