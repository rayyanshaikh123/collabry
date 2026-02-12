import { useEffect } from 'react';
import { socketClient } from '@/lib/socket';
import { googleDriveService } from '@/lib/googleDrive';

interface UseBoardConnectionProps {
  editor: any;
  boardId: string;
  user: any;
  accessToken: string;
  router: any;
  setCurrentBoard: (board: any) => void;
  setIsConnected: (connected: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setParticipants: (participants: any[]) => void;
  setPendingElements: (elements: any[]) => void;
  importPayloadRef: React.MutableRefObject<any | null>;
  handleUserJoined: (data: any) => void;
  handleUserLeft: (data: any) => void;
  handleCursorMove: (data: any) => void;
}

/**
 * Hook for managing board socket connection and initialization
 */
export function useBoardConnection({
  editor,
  boardId,
  user,
  accessToken,
  router,
  setCurrentBoard,
  setIsConnected,
  setIsLoading,
  setParticipants,
  setPendingElements,
  importPayloadRef,
  handleUserJoined,
  handleUserLeft,
  handleCursorMove
}: UseBoardConnectionProps) {
  useEffect(() => {
    if (!boardId || !user || !accessToken) return;

    let isMounted = true;
    let joinTimeoutId: NodeJS.Timeout | null = null;

    const initBoard = async () => {
      if (!isMounted) return;

      try {
        setIsLoading(true);

        // Connect to socket
        try {
          await socketClient.connectBoards(accessToken);
          if (!isMounted) return;
          console.log('[Board] Socket connected, joining board...');
        } catch (error: any) {
          if (!isMounted) return;
          console.error('[Board] Socket connection failed:', error.message);
          alert('Failed to connect to server. Please check if the backend is running.');
          setIsLoading(false);
          return;
        }

        // Initialize Google Drive
        try {
          await googleDriveService.initialize();
          console.log('[Board] Google Drive initialized');
        } catch (error) {
          console.warn('[Board] Google Drive initialization failed:', error);
        }

        // Set join timeout
        joinTimeoutId = setTimeout(() => {
          if (!isMounted) return;
          console.error('[Board] Join board timeout');
          alert('Failed to load board. The board may not exist or you may not have access.');
          router.push('/study-board');
        }, 15000);

        // Join board
        socketClient.joinBoard(boardId, (response: any) => {
          if (!isMounted || !joinTimeoutId) return;

          clearTimeout(joinTimeoutId);
          joinTimeoutId = null;

          if (response?.error || !response) {
            console.error('[Board] Join error:', response?.error || 'No response');
            alert(response?.error || 'Failed to join board. Please try again.');
            router.push('/study-board');
            return;
          }

          console.log('[Board] Successfully joined board');
          setCurrentBoard(response.board);

          // Load template shapes from sessionStorage
          const templateShapes = sessionStorage.getItem(`board-${boardId}-template`);
          if (templateShapes) {
            console.log('[Board] Loading template shapes from sessionStorage');
            try {
              const shapes = JSON.parse(templateShapes);
              setPendingElements(shapes || []);
              sessionStorage.removeItem(`board-${boardId}-template`);
            } catch (e) {
              console.error('Failed to parse template shapes:', e);
            }
          } else {
            setPendingElements(response.board?.elements || response.elements || []);
          }

          // Load import payload from sessionStorage (mindmap/infographic)
          const importPayload = sessionStorage.getItem(`board-${boardId}-import`);
          if (importPayload) {
            console.log('[Board] Found import payload in sessionStorage');
            try {
              importPayloadRef.current = JSON.parse(importPayload);
              sessionStorage.removeItem(`board-${boardId}-import`);
            } catch (e) {
              console.error('Failed to parse import payload:', e);
            }
          }

          // Set participants
          setParticipants(
            (response.participants || []).filter((p: any) => p.userId !== user.id)
          );
          
          setIsConnected(true);
          setIsLoading(false);
        });

        // Setup event listeners
        socketClient.onUserJoined(handleUserJoined);
        socketClient.onUserLeft(handleUserLeft);
        socketClient.onCursorMove(handleCursorMove);
      } catch (error: any) {
        console.error('[Board] Init error:', error);
        if (isMounted) {
          alert('Failed to initialize board connection');
          setIsLoading(false);
        }
      }
    };

    initBoard();

    return () => {
      isMounted = false;
      
      if (joinTimeoutId) {
        clearTimeout(joinTimeoutId);
      }

      if (boardId) {
        try {
          socketClient.leaveBoard(boardId);
        } catch (error) {
          console.error('Error leaving board:', error);
        }
      }
      
      socketClient.off('user:joined', handleUserJoined);
      socketClient.off('user:left', handleUserLeft);
      socketClient.off('cursor:moved', handleCursorMove);
    };
  }, [boardId, user, accessToken, router, setCurrentBoard, setIsConnected, setIsLoading, setParticipants, setPendingElements, importPayloadRef, handleUserJoined, handleUserLeft, handleCursorMove]);
}
