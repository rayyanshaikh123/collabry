/**
 * Collaboration Hooks
 * Custom hooks for realtime collaboration.
 * Board sync is handled by Yjs (useYjsSync) — these hooks are for
 * general socket connection and notification presence only.
 */

import { useEffect } from 'react';
import { useCollaborationStore } from '@/lib/stores/collaboration.store';
import { useAuthStore } from '@/lib/stores/auth.store';

/**
 * Hook to access collaboration state and actions
 */
export const useCollaboration = () => {
  const {
    connected,
    reconnecting,
    usersOnline,
    currentRoom,
    syncStatus,
    joinRoom,
    leaveRoom,
    updatePresence,
  } = useCollaborationStore();

  return {
    connected,
    reconnecting,
    usersOnline,
    currentRoom,
    syncStatus,
    joinRoom,
    leaveRoom,
    updatePresence,
  };
};

/**
 * Hook to initialize socket connection (notifications + general).
 * Call this once in root layout.
 */
export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { connect, disconnect, connected } = useCollaborationStore();

  useEffect(() => {
    if (isAuthenticated && accessToken && !connected) {
      connect(accessToken);
    }

    return () => {
      if (connected) {
        disconnect();
      }
    };
  }, [isAuthenticated, accessToken]);

  return { connected };
};
