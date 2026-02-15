'use client';

import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tldraw, createTLStore, defaultShapeUtils, Editor, exportAs } from 'tldraw';
import 'tldraw/tldraw.css';

import { useAuthStore } from '@/lib/stores/auth.store';
import { studyBoardService } from '@/lib/services/studyBoard.service';
import { Button } from '@/components/ui/button';
import { LoadingPage } from '@/components/UIElements';
import type { BoardParticipant } from '@/types/studyBoard.types';
import type { StudyBoard } from '@/types';

// Modals
import InviteMemberModal from '@/components/InviteMemberModal';
import BoardSettingsModal from '@/components/BoardSettingsModal';

// Board components
import { BoardHeader } from '@/components/study-board/BoardHeader';

// Yjs sync hook (replaces useBoardConnection, useBoardSync, useCursorTracking, usePendingElements)
import { useYjsSync } from '@/hooks/useYjsSync';

// Shapes utility for AI imports (mindmap, infographic)
import { buildShapesFromImport } from '@/hooks/useBoardShapes';

// --- Yjs-based live cursors (replaces LiveCursors + Socket.IO) ---
// Cursors arrive in tldraw page-space; we convert to screen-space for rendering.
interface YjsCursorData {
  userId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

const YjsCursor = memo<{ user: YjsCursorData; editor: Editor | null }>(({ user, editor }) => {
  if (!user.cursor || !editor) return null;
  // Convert page-space coordinates back to screen-space for absolute positioning
  const screenPoint = editor.pageToScreen({ x: user.cursor.x, y: user.cursor.y });
  return (
    <div
      className="absolute transition-transform duration-100"
      style={{
        left: screenPoint.x,
        top: screenPoint.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={user.color}
        className="drop-shadow-lg"
      >
        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" />
      </svg>
      <div
        className="ml-6 -mt-2 px-2 py-1 rounded text-white text-xs font-bold whitespace-nowrap shadow-lg"
        style={{ backgroundColor: user.color }}
      >
        {(user.name || 'User').split('@')[0]}
      </div>
    </div>
  );
});
YjsCursor.displayName = 'YjsCursor';

const YjsCursors = memo<{ users: YjsCursorData[]; editor: Editor | null }>(({ users, editor }) => (
  <div className="absolute inset-0 pointer-events-none z-10">
    {users
      .filter((u) => u.cursor)
      .map((u) => (
        <YjsCursor key={u.userId} user={u} editor={editor} />
      ))}
  </div>
));
YjsCursors.displayName = 'YjsCursors';

// Random user color for awareness
const COLORS = [
  '#e57373', '#64b5f6', '#81c784', '#ffb74d', '#ba68c8',
  '#4dd0e1', '#ff8a65', '#a1887f', '#90a4ae', '#f06292',
];
function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * CollaborativeBoard — Real-time collaborative whiteboard using tldraw + Yjs
 *
 * Sync: tldraw Editor ↔ Yjs Y.Map ↔ WebSocket ↔ Backend ↔ MongoDB
 * Presence: Yjs awareness protocol (cursors + connected users)
 * AI imports: mindmaps / infographics via sessionStorage payload
 */
const CollaborativeBoard = () => {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id ?? params.boardId;
  const boardId = Array.isArray(rawId) ? rawId[0] : rawId || null;

  const { user, accessToken } = useAuthStore();

  // State
  const [currentBoard, setCurrentBoard] = useState<StudyBoard | null>(null);
  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Import payload refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const importPayloadRef = useRef<any>(null);
  const importAppliedRef = useRef(false);

  // Yjs sync — single hook replaces 4 old hooks + LiveCursors
  const userColor = useMemo(() => pickColor(user?.id || 'anon'), [user?.id]);
  const { isConnected, isSynced, connectedUsers } = useYjsSync({
    editor,
    boardId,
    accessToken,
    userName: user?.name || user?.email || 'Anonymous',
    userColor,
  });

  // Convert connectedUsers to BoardParticipant format for BoardHeader
  const boardParticipants: BoardParticipant[] = useMemo(
    () =>
      connectedUsers.map((u) => ({
        userId: u.userId,
        userName: u.name,
        name: u.name,
        color: u.color,
        role: 'editor' as const,
        isActive: true,
        joinedAt: new Date().toISOString(),
      })),
    [connectedUsers],
  );

  // Determine current user's role on this board
  const userRole = useMemo<'owner' | 'editor' | 'viewer'>(() => {
    if (!currentBoard || !user) return 'viewer';
    const ownerId = typeof currentBoard.owner === 'string'
      ? currentBoard.owner
      : currentBoard.owner?._id;
    if (ownerId === user.id) return 'owner';
    const member = currentBoard.members?.find(
      (m) => {
        const memberId = typeof m.userId === 'string' ? m.userId : (m.userId as unknown as { _id: string })?._id;
        return memberId === user.id;
      }
    );
    return member?.role || 'viewer';
  }, [currentBoard, user]);
  const isReadonly = userRole === 'viewer';

  // Editor mount handler
  const handleMount = useCallback((mountedEditor: Editor) => {
    setEditor(mountedEditor);
    mountedEditor.updateInstanceState({ isGridMode: true });
  }, []);

  // Enforce readonly mode for viewers
  useEffect(() => {
    if (!editor || !currentBoard) return;
    editor.updateInstanceState({ isReadonly: isReadonly });
  }, [editor, currentBoard, isReadonly]);

  // --- Thumbnail generation ---
  const saveThumbnail = useCallback(async () => {
    if (!editor || !boardId) return;
    try {
      const shapeIds = [...editor.getCurrentPageShapeIds()];
      if (shapeIds.length === 0) return;
      const { url } = await editor.toImageDataUrl(shapeIds, {
        format: 'png',
        scale: 0.25,
        background: true,
      });
      if (url && url.length < 500_000) {
        await studyBoardService.saveThumbnail(boardId, url);
      }
    } catch {
      // Thumbnail is best-effort, never block navigation
    }
  }, [editor, boardId]);

  // Auto-save thumbnail every 60s while editing
  useEffect(() => {
    if (!editor || !boardId) return;
    const interval = setInterval(saveThumbnail, 60_000);
    return () => clearInterval(interval);
  }, [editor, boardId, saveThumbnail]);

  // Save thumbnail on back navigation
  const handleBack = useCallback(async () => {
    await saveThumbnail();
    router.push('/study-board');
  }, [saveThumbnail, router]);

  // --- Export board as PNG ---
  const handleExport = useCallback(async () => {
    if (!editor) return;
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) {
      alert('Nothing to export — the board is empty.');
      return;
    }
    try {
      await exportAs(editor, [...shapeIds], {
        format: 'png',
        scale: 2,
        background: true,
      });
    } catch (e) {
      console.error('[Board] Export failed:', e);
      alert('Export failed. Please try again.');
    }
  }, [editor]);

  // Sync theme changes with tldraw
  useEffect(() => {
    if (!editor) return;

    const syncTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      editor.user.updateUserPreferences({ colorScheme: isDark ? 'dark' : 'light' });
    };

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

  // Load board metadata via REST API (replaces Socket.IO board:join)
  useEffect(() => {
    if (!boardId || !accessToken) return;

    let cancelled = false;

    const loadBoard = async () => {
      try {
        setIsLoading(true);
        const board = await studyBoardService.getBoard(boardId);
        if (cancelled) return;
        setCurrentBoard(board);

        // Check for template shapes from sessionStorage (board creation with template)
        const templateShapes = sessionStorage.getItem(`board-${boardId}-template`);
        if (templateShapes) {
          try {
            const shapes = JSON.parse(templateShapes);
            sessionStorage.removeItem(`board-${boardId}-template`);
            // Wrap as an import payload so the import effect handles it
            importPayloadRef.current = { kind: 'template', shapes };
          } catch (e) {
            console.error('Failed to parse template shapes:', e);
          }
        }

        // Check for import payload from sessionStorage (mindmap / infographic)
        if (!importPayloadRef.current) {
          const importPayload = sessionStorage.getItem(`board-${boardId}-import`);
          if (importPayload) {
            try {
              importPayloadRef.current = JSON.parse(importPayload);
              sessionStorage.removeItem(`board-${boardId}-import`);
            } catch (e) {
              console.error('Failed to parse import payload:', e);
            }
          }
        }
      } catch (error) {
        console.error('[Board] Failed to load board:', error);
        if (!cancelled) {
          alert('Failed to load board. It may not exist or you may not have access.');
          router.push('/study-board');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadBoard();
    return () => { cancelled = true; };
  }, [boardId, accessToken, router]);

  // Apply imported artifacts (mindmap / infographic) after Yjs sync is established
  useEffect(() => {
    if (!editor || !boardId || !isSynced) return;
    if (!importPayloadRef.current || importAppliedRef.current) return;

    let cancelled = false;

    const applyImport = async () => {
      if (cancelled) return;
      try {
        const payload = importPayloadRef.current;

        // Template shapes are already tldraw-ready records
        if (payload?.kind === 'template' && Array.isArray(payload.shapes)) {
          if (payload.shapes.length > 0) {
            editor.store.put(payload.shapes);
            console.log(`[Board] Applied ${payload.shapes.length} template shapes`);
          }
        } else {
          // AI import (mindmap / infographic) — needs shape building
          const { shapes, assets } = await buildShapesFromImport(payload);
          if (cancelled || shapes.length === 0) return;
          const records = [...assets, ...shapes];
          editor.store.put(records);
          console.log(`[Board] Applied ${shapes.length} shapes + ${assets.length} assets from import`);
        }
      } catch (e) {
        console.error('[Board] Failed to apply imported shapes:', e);
      } finally {
        importAppliedRef.current = true;
        importPayloadRef.current = null;
      }
    };

    // Small delay to let initial sync settle
    const timer = setTimeout(applyImport, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [editor, boardId, isSynced]);

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
        onBack={handleBack}
        onInvite={!isReadonly ? () => setShowInviteModal(true) : undefined}
        onSettings={!isReadonly ? () => setShowSettingsModal(true) : undefined}
        onExport={!isReadonly && currentBoard?.settings?.allowExport !== false ? handleExport : undefined}
      />

      {/* Sync status indicator */}
      {isConnected && !isSynced && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200 text-xs px-3 py-1 rounded-full">
          Syncing…
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* tldraw Canvas */}
        <div className="flex-1 relative p-0 overflow-hidden">
          <Tldraw
            store={store}
            autoFocus
            onMount={handleMount}
            {...(process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY
              ? { licenseKey: process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY }
              : {})}
          />

          {/* Live Cursors Overlay (from Yjs awareness) */}
          <YjsCursors users={connectedUsers} editor={editor} />
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
          board={{ ...currentBoard, _id: currentBoard.id ?? boardId ?? '' }}
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
