/**
 * Collaboration Store (Zustand)
 * Manages realtime collaboration state
 */

import { create } from 'zustand';
import type { CollaborationUser, PresenceStatus } from '@/types';
import { socketClient } from '@/lib/socket';

interface CollaborationState {
  // State
  connected: boolean;
  reconnecting: boolean;
  usersOnline: CollaborationUser[];
  currentRoom: string | null;
  syncStatus: 'synced' | 'syncing' | 'conflict' | 'error';

  // Actions
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  setUsersOnline: (users: CollaborationUser[]) => void;
  addUser: (user: CollaborationUser) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<CollaborationUser>) => void;
  setCurrentRoom: (room: string | null) => void;
  setSyncStatus: (status: 'synced' | 'syncing' | 'conflict' | 'error') => void;
  
  // Socket actions
  connect: (token: string) => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  updatePresence: (status: PresenceStatus) => void;
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  // Initial state
  connected: false,
  reconnecting: false,
  usersOnline: [],
  currentRoom: null,
  syncStatus: 'synced',

  // Set connected
  setConnected: (connected: boolean) => {
    set({ connected });
  },

  // Set reconnecting
  setReconnecting: (reconnecting: boolean) => {
    set({ reconnecting });
  },

  // Set users online
  setUsersOnline: (users: CollaborationUser[]) => {
    set({ usersOnline: users });
  },

  // Add user
  addUser: (user: CollaborationUser) => {
    set((state) => {
      // Check if user already exists
      const exists = state.usersOnline.some((u) => u.userId === user.userId);
      if (exists) {
        return {
          usersOnline: state.usersOnline.map((u) =>
            u.userId === user.userId ? user : u
          ),
        };
      }
      return {
        usersOnline: [...state.usersOnline, user],
      };
    });
  },

  // Remove user
  removeUser: (userId: string) => {
    set((state) => ({
      usersOnline: state.usersOnline.filter((u) => u.userId !== userId),
    }));
  },

  // Update user
  updateUser: (userId: string, updates: Partial<CollaborationUser>) => {
    set((state) => ({
      usersOnline: state.usersOnline.map((u) =>
        u.userId === userId ? { ...u, ...updates } : u
      ),
    }));
  },

  // Set current room
  setCurrentRoom: (room: string | null) => {
    set({ currentRoom: room });
  },

  // Set sync status
  setSyncStatus: (status: 'synced' | 'syncing' | 'conflict' | 'error') => {
    set({ syncStatus: status });
  },

  // Connect socket
  connect: (token: string) => {
    const socket = socketClient.connect(token);
    
    if (!socket) return;

    // Set up event listeners
    socket.on('connect', () => {
      get().setConnected(true);
      get().setReconnecting(false);
    });

    socket.on('disconnect', () => {
      get().setConnected(false);
    });

    socket.on('reconnecting', () => {
      get().setReconnecting(true);
    });

    // TODO: Add more event listeners for user presence, board updates, etc.
    socket.on('user:joined', (data: CollaborationUser) => {
      get().addUser(data);
    });

    socket.on('user:left', (data: { userId: string }) => {
      get().removeUser(data.userId);
    });

    socket.on('users:list', (data: { users: CollaborationUser[] }) => {
      get().setUsersOnline(data.users);
    });
  },

  // Disconnect socket
  disconnect: () => {
    socketClient.disconnect();
    set({
      connected: false,
      reconnecting: false,
      usersOnline: [],
      currentRoom: null,
    });
  },

  // Join room (board sync is now handled by Yjs, this is for general presence)
  joinRoom: (roomId: string) => {
    set({ currentRoom: roomId });
  },

  // Leave room
  leaveRoom: (roomId: string) => {
    set({ currentRoom: null });
  },

  // Update presence
  updatePresence: (status: PresenceStatus) => {
    // Presence for boards is now handled by Yjs awareness
    // This is a no-op placeholder for general app presence
  },
}));

// Selectors
export const selectConnected = (state: CollaborationState) => state.connected;
export const selectUsersOnline = (state: CollaborationState) => state.usersOnline;
export const selectCurrentRoom = (state: CollaborationState) => state.currentRoom;
export const selectSyncStatus = (state: CollaborationState) => state.syncStatus;
