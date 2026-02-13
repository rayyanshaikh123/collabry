'use client';

import {useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tldraw, createTLStore, defaultShapeUtils, Editor } from 'tldraw';
import 'tldraw/tldraw.css';

import { useAuthStore } from '@/lib/stores/auth.store';
import { studyBoardService } from '@/lib/services/studyBoard.service';
import { Button } from '@/components/ui/button';
import { ICONS } from '@/constants';
import { LoadingPage } from '@/components/UIElements';
import type { BoardParticipant } from '@/types/studyBoard.types';
import type { StudyBoard } from '@/types';

// Modals
import InviteMemberModal from '@/components/InviteMemberModal';
import BoardSettingsModal from '@/components/BoardSettingsModal';

// Board components
import { BoardHeader } from '@/components/study-board/BoardHeader';
import { LiveCursors } from '@/components/study-board/LiveCursors';

// Board hooks
import { useBoardConnection } from '@/hooks/useBoardConnection';
import { useBoardSync } from '@/hooks/useBoardSync';
import { useCursorTracking } from '@/hooks/useCursorTracking';
import { usePendingElements } from '@/hooks/usePendingElements';

// Types
interface ParticipantData {
  userId: string;
  name: string;
  email?: string;
  userName?: string;
  color: string;
  role?: 'owner' | 'editor' | 'viewer';
  isActive?: boolean;
  joinedAt?: string;
}

interface CursorData {
  x: number;
  y: number;
}

/**
 * CollaborativeBoard - Real-time collaborative whiteboard using tldraw
 * 
 * Features:
 * - Multi-user collaboration with live cursor tracking
 * - Shape synchronization across clients
 * - Import artifacts from study-notebook (mindmaps, infographics)
 * - Google Drive image storage integration
 */
const CollaborativeBoard = () => {
  const params = useParams();
  const router = useRouter();
  // Route is /study-board/[id], so the param key is 'id' (not 'boardId')
  const rawId = params.id ?? params.boardId;
  const boardId = Array.isArray(rawId) ? rawId[0] : rawId || null;
  
  const { user, accessToken } = useAuthStore();

  // State
  const [currentBoard, setCurrentBoard] = useState<StudyBoard | null>(null);
  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorData>>({});
  const [pendingElements, setPendingElements] = useState<any[]>([]);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Refs for sync logic
  const isApplyingRemoteChange = useRef(false);
  const isDrawingRef = useRef(false);
  const drawingShapeIdRef = useRef<string | null>(null);
  const importPayloadRef = useRef<any>(null);
  const importAppliedRef = useRef(false);

  // Editor mount handler
  const handleMount = useCallback((mountedEditor: Editor) => {
    setEditor(mountedEditor);
    mountedEditor.updateInstanceState({ isGridMode: true });
  }, []);

  // Sync theme changes with tldraw
  useEffect(() => {
    if (!editor) return;

    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      // tldraw's internal preference for theme
      editor.user.updateUserPreferences({ colorScheme: isDark ? 'dark' : 'light' });
    };

    // Initial sync
    syncTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          syncTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [editor]);

  // Socket event handlers
  const handleUserJoined = useCallback((data: any) => {
    if (data.participants) {
      setParticipants(data.participants.filter((p: ParticipantData) => p.userId !== user?.id));
    } else {
      // Single user joined — add them
      if (data.userId && data.userId !== user?.id) {
        setParticipants(prev => {
          if (prev.some(p => p.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, name: data.email || 'User', email: data.email, color: data.color || '#888', userName: data.email }];
        });
      }
    }
  }, [user]);

  const handleUserLeft = useCallback((data: any) => {
    if (data.participants) {
      setParticipants(data.participants.filter((p: ParticipantData) => p.userId !== user?.id));
    } else {
      // Single user left — remove them
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    }
  }, [user]);

  const handleCursorMove = useCallback((data: { userId: string; position: CursorData }) => {
    if (data.userId !== user?.id) {
      setCursors(prev => ({
        ...prev,
        [data.userId]: data.position
      }));
    }
  }, [user]);

  const handleElementCreated = useCallback((data: any) => {
    if (!editor || !data?.element) return;
    if (user?.id === data.userId) return;

    isApplyingRemoteChange.current = true;
    try {
      editor.store.mergeRemoteChanges(() => {
        const el = data.element;

        // Reconstruct assets for image shapes
        if (el.type === 'image' && el.props?.assetId) {
          let assetSrc = null;

          if (el.meta?.driveFileId) {
            const { googleDriveService } = require('@/lib/googleDrive');
            assetSrc = googleDriveService.getPublicUrl(el.meta.driveFileId);
          } else if (el.meta?.svgDataUri) {
            assetSrc = el.meta.svgDataUri;
          } else if (el.meta?.imageData?.src) {
            assetSrc = el.meta.imageData.src;
          }

          if (assetSrc) {
            editor.store.put([{
              id: el.props.assetId,
              type: 'image',
              typeName: 'asset',
              props: {
                name: el.meta?.driveName || el.meta?.imageData?.name || 'image.png',
                src: assetSrc,
                w: el.meta?.w || el.meta?.imageData?.w || el.props.w || 800,
                h: el.meta?.h || el.meta?.imageData?.h || el.props.h || 600,
                mimeType: el.meta?.driveMimeType || el.meta?.imageData?.mimeType || el.meta?.svgDataUri ? 'image/svg+xml' : 'image/png',
                isAnimated: false,
              },
              meta: {},
            }]);
          }
        }

        const shape: any = {
          id: el.id,
          typeName: el.typeName || 'shape',
          type: el.type,
          x: el.x || 0,
          y: el.y || 0,
          props: el.props || {},
          parentId: el.parentId || 'page:page',
          index: el.index || 'a1',
          rotation: el.rotation || 0,
          isLocked: el.isLocked || false,
          opacity: el.opacity || 1,
          meta: el.meta || {},
        };

        editor.store.put([shape]);
      });
    } catch (error) {
      console.error('Error in handleElementCreated:', error);
    } finally {
      isApplyingRemoteChange.current = false;
    }
  }, [editor, user]);

  const handleElementUpdated = useCallback((data: any) => {
    if (!editor) return;
    // Backend sends { elementId, changes, userId } — NOT data.element
    const elementId = data.elementId || data.element?.id;
    const changes = data.changes || data.changeSet || data.element;
    if (!elementId || !changes) return;
    if (user?.id === data.userId) return;

    isApplyingRemoteChange.current = true;
    try {
      editor.store.mergeRemoteChanges(() => {
        const existingShape = editor.store.get(elementId) as any;
        if (!existingShape) return;

        const updatedShape = {
          ...existingShape,
          ...changes,
          props: { ...existingShape.props, ...(changes.props || {}) },
          meta: { ...existingShape.meta, ...(changes.meta || {}) },
        };

        editor.store.put([updatedShape]);
      });
    } catch (error) {
      console.error('Error in handleElementUpdated:', error);
    } finally {
      isApplyingRemoteChange.current = false;
    }
  }, [editor, user]);

  const handleElementDeleted = useCallback((data: any) => {
    if (!editor || !data?.elementId) return;
    if (user?.id === data.userId) return;

    isApplyingRemoteChange.current = true;
    try {
      editor.store.mergeRemoteChanges(() => {
        editor.store.remove([data.elementId]);
      });
    } catch (error) {
      console.error('Error in handleElementDeleted:', error);
    } finally {
      isApplyingRemoteChange.current = false;
    }
  }, [editor, user]);

  // Initialize board connection
  useBoardConnection({
    editor,
    boardId: boardId || '',
    user,
    accessToken: accessToken || '',
    router,
    setIsConnected,
    setIsLoading,
    setCurrentBoard,
    setParticipants,
    setPendingElements,
    importPayloadRef,
    handleUserJoined,
    handleUserLeft,
    handleCursorMove
  });

  // Synchronize tldraw store with socket
  useBoardSync({
    editor: editor as any,
    boardId: boardId || '',
    isConnected,
    isApplyingRemoteChange,
    isDrawingRef,
    drawingShapeIdRef
  });

  // Track cursor position
  useCursorTracking({
    boardId: boardId || '',
    isConnected
  });

  // Apply pending elements and imported artifacts
  usePendingElements({
    editor,
    boardId,
    isConnected,
    pendingElements,
    setPendingElements,
    isApplyingRemoteChange,
    importPayloadRef,
    importAppliedRef,
    handleElementCreated,
    handleElementUpdated,
    handleElementDeleted
  });

  // Memoized participant list
  const visibleParticipants = useMemo(() => participants.slice(0, 3), [participants]);

  // Convert ParticipantData to BoardParticipant format
  const boardParticipants: BoardParticipant[] = useMemo(() =>
    participants.map(p => ({
      userId: p.userId,
      userName: p.userName || p.name,
      name: p.name,
      email: p.email,
      color: p.color,
      role: p.role || 'editor' as 'owner' | 'editor' | 'viewer',
      isActive: p.isActive ?? true,
      joinedAt: p.joinedAt || new Date().toISOString()
    })),
    [participants]
  );

  const visibleBoardParticipants = useMemo(() => boardParticipants.slice(0, 3), [boardParticipants]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!boardId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No board selected</p>
          <Button onClick={() => router.push('/study-board')}>
            Back to Boards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-slate-50 dark:bg-slate-950 overflow-hidden -m-4 md:-m-8">
      {/* Board Header */}
      <BoardHeader
        boardTitle={currentBoard?.title}
        isConnected={isConnected}
        participants={boardParticipants}
        onBack={() => router.push('/study-board')}
        onInvite={() => setShowInviteModal(true)}
        onSettings={() => setShowSettingsModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* tldraw Canvas */}
        <div className="flex-1 relative p-0 overflow-hidden">
          <Tldraw
            store={store}
            autoFocus
            onMount={handleMount}
          />

          {/* Live Cursors Overlay */}
          <LiveCursors cursors={cursors} participants={boardParticipants} />
        </div>
      </div>

      {/* Modals */}
      <InviteMemberModal
        boardId={boardId || ''}
        boardTitle={currentBoard?.title || 'Board'}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={async (email, role) => {
          if (!boardId) return;
          try {
            await studyBoardService.inviteMember(boardId, email, role);
          } catch (error: unknown) {
            console.error('Failed to send invitation:', error);
            throw error;
          }
        }}
      />

      {currentBoard && boardId && (
        <BoardSettingsModal
          board={{ ...currentBoard, _id: currentBoard.id, isPublic: false }}
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onSave={async (updates) => {
            const updated = await studyBoardService.updateBoard(boardId, updates);
            setCurrentBoard(updated);
          }}
          onDelete={async () => {
            await studyBoardService.deleteBoard(boardId);
            router.push('/study-board');
          }}
        />
      )}
    </div>
  );
};

export default CollaborativeBoard;
