import { useCallback, useEffect, useRef } from 'react';
import { socketClient } from '@/lib/socket';

interface UseCursorTrackingProps {
  boardId: string | null;
  isConnected: boolean;
}

/**
 * Hook for tracking and broadcasting cursor position with RAF optimization
 */
export const useCursorTracking = ({ boardId, isConnected }: UseCursorTrackingProps) => {
  const cursorPositionRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const sendCursorUpdate = useCallback(() => {
    if (boardId && isConnected) {
      socketClient.sendCursorPosition(boardId, cursorPositionRef.current);
    }
    animationFrameRef.current = null;
  }, [boardId, isConnected]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!boardId || !isConnected) return;

    const canvas = (e.target as HTMLElement).closest('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      cursorPositionRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      // Use requestAnimationFrame for smooth cursor updates
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(sendCursorUpdate);
      }
    }
  }, [boardId, isConnected, sendCursorUpdate]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handlePointerMove]);
};
