'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tldraw, createTLStore, defaultShapeUtils, Editor } from 'tldraw';
import 'tldraw/tldraw.css';

import { useAuthStore } from '@/lib/stores/auth.store';
import { socketClient } from '@/lib/socket';
import { studyBoardService } from '@/lib/services/studyBoard.service';
import { Button } from '@/components/ui/button';
import { ICONS } from '@/constants';
import type { BoardParticipant } from '@/types/studyBoard.types';

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

interface Board {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
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
  const boardId = Array.isArray(params.boardId) ? params.boardId[0] : params.boardId || null;
  
  const { user, accessToken } = useAuthStore();

  // State
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
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
  }, []);

  // Socket event handlers
  const handleUserJoined = useCallback((data: { participants: ParticipantData[] }) => {
    console.log('User joined:', data);
    setParticipants(data.participants.filter(p => p.userId !== user?.id));
  }, [user]);

  const handleUserLeft = useCallback((data: { participants: ParticipantData[] }) => {
    console.log('User left:', data);
    setParticipants(data.participants.filter(p => p.userId !== user?.id));
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

    console.log('element:created received:', data);
    isApplyingRemoteChange.current = true;

    try {
      const el = data.element;
      
      // Reconstruct assets for image shapes
      if (el.type === 'image' && el.props?.assetId) {
        let assetSrc = null;
        
        // Drive image
        if (el.meta?.driveFileId) {
          const { googleDriveService } = require('@/lib/googleDrive');
          assetSrc = googleDriveService.getPublicUrl(el.meta.driveFileId);
        }
        // SVG data
        else if (el.meta?.svgDataUri) {
          assetSrc = el.meta.svgDataUri;
        }
        // Local image data
        else if (el.meta?.imageData?.src) {
          assetSrc = el.meta.imageData.src;
        }

        if (assetSrc) {
          const asset: any = {
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
          };
          editor.store.put([asset]);
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
      console.log('Successfully added remote shape:', shape.id);
    } catch (error) {
      console.error('Error in handleElementCreated:', error);
    } finally {
      setTimeout(() => {
        isApplyingRemoteChange.current = false;
      }, 20);
    }
  }, [editor, user]);

  const handleElementUpdated = useCallback((data: any) => {
    if (!editor || !data?.element) return;
    if (user?.id === data.userId) return;

    console.log('element:updated received:', data);
    isApplyingRemoteChange.current = true;

    try {
      const el = data.element;
      const existingShape = editor.store.get(el.id) as any;
      if (!existingShape) {
        console.warn('Shape not found for update:', el.id);
        return;
      }

      const updatedShape = {
        ...existingShape,
        x: el.x ?? existingShape.x,
        y: el.y ?? existingShape.y,
        props: { ...existingShape.props, ...el.props },
        rotation: el.rotation ?? existingShape.rotation,
        opacity: el.opacity ?? existingShape.opacity,
        meta: { ...existingShape.meta, ...el.meta },
      };

      editor.store.put([updatedShape]);
    } catch (error) {
      console.error('Error in handleElementUpdated:', error);
    } finally {
      setTimeout(() => {
        isApplyingRemoteChange.current = false;
      }, 20);
    }
  }, [editor, user]);

  const handleElementDeleted = useCallback((data: any) => {
    if (!editor || !data?.elementId) return;
    if (user?.id === data.userId) return;

    console.log('element:deleted received:', data);
    isApplyingRemoteChange.current = true;

    try {
      editor.store.remove([data.elementId]);
    } catch (error) {
      console.error('Error in handleElementDeleted:', error);
    } finally {
      setTimeout(() => {
        isApplyingRemoteChange.current = false;
      }, 20);
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
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!boardId) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No board selected</p>
          <Button onClick={() => router.push('/study-board')}>
            Back to Boards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-slate-50 overflow-hidden -m-4 md:-m-8">
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
        <div className="flex-1 relative p-0 whiteboard-grid">
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
