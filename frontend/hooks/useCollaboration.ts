/**
 * Collaboration Hooks
 * Custom hooks for realtime collaboration
 */

import { useEffect } from 'react';
import { useCollaborationStore } from '@/lib/stores/collaboration.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { socketClient } from '@/lib/socket';
import type { PresenceStatus } from '@/types';

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
 * Hook to initialize socket connection
 * Call this once in your root component
 */
export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { connect, disconnect, connected } = useCollaborationStore();

  useEffect(() => {
    if (isAuthenticated && accessToken && !connected) {
      // Connect socket
      connect(accessToken);
    }

    return () => {
      // Cleanup on unmount
      if (connected) {
        disconnect();
      }
    };
  }, [isAuthenticated, accessToken]);

  return {
    connected,
  };
};

/**
 * Hook to join a board room
 * Automatically joins and leaves on mount/unmount
 */
export const useBoardRoom = (boardId: string | undefined) => {
  const { joinRoom, leaveRoom, connected } = useCollaborationStore();

  useEffect(() => {
    if (boardId && connected) {
      // Join room
      joinRoom(boardId);

      return () => {
        // Leave room on unmount
        leaveRoom(boardId);
      };
    }
  }, [boardId, connected]);
};

/**
 * Hook to listen for board updates
 * TODO: Connect to socket events when backend is ready
 */
export const useBoardUpdates = (
  boardId: string | undefined,
  onUpdate: (data: any) => void
) => {
  const { connected } = useCollaborationStore();

  useEffect(() => {
    if (!boardId || !connected) return;

    // Listen for board updates
    socketClient.onBoardUpdate(onUpdate);

    return () => {
      // Remove listener
      socketClient.off('board:update', onUpdate);
    };
  }, [boardId, connected, onUpdate]);
};

/**
 * Hook to listen for user join/leave events
 * TODO: Connect to socket events when backend is ready
 */
export const useUserPresence = (
  boardId: string | undefined,
  onUserJoined: (data: any) => void,
  onUserLeft: (data: any) => void
) => {
  const { connected } = useCollaborationStore();

  useEffect(() => {
    if (!boardId || !connected) return;

    // Listen for user events
    socketClient.onUserJoined(onUserJoined);
    socketClient.onUserLeft(onUserLeft);

    return () => {
      // Remove listeners
      socketClient.off('board:user-joined', onUserJoined);
      socketClient.off('board:user-left', onUserLeft);
    };
  }, [boardId, connected, onUserJoined, onUserLeft]);
};

/**
 * Hook to broadcast cursor position
 */
export const useCursor = (boardId: string | undefined) => {
  const { connected } = useCollaborationStore();

  const updateCursor = (x: number, y: number) => {
    if (!boardId || !connected) return;
    
    socketClient.sendCursorPosition(boardId, { x, y });
  };

  return {
    updateCursor,
  };
};

/**
 * Hook to listen for cursor movements
 * TODO: Connect to socket events when backend is ready
 */
export const useCursorTracking = (
  boardId: string | undefined,
  onCursorMove: (data: any) => void
) => {
  const { connected } = useCollaborationStore();

  useEffect(() => {
    if (!boardId || !connected) return;

    // Listen for cursor movements
    socketClient.onCursorMove(onCursorMove);

    return () => {
      // Remove listener
      socketClient.off('board:cursor', onCursorMove);
    };
  }, [boardId, connected, onCursorMove]);
};

/**
 * Hook to update user presence status
 */
export const usePresence = () => {
  const { updatePresence } = useCollaborationStore();

  return {
    updatePresence: (status: PresenceStatus) => updatePresence(status),
  };
};
