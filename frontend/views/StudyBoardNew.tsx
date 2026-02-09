/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils } from 'tldraw';
import 'tldraw/tldraw.css';
import { Button } from '../components/UIElements';
import { ICONS } from '../constants';
import { useAuthStore } from '../src/stores/auth.store';
import { useStudyBoardStore } from '../src/stores/studyBoard.store';
import { socketClient } from '../src/lib/socket';
import { useRouter, useParams } from 'next/navigation';
import InviteMemberModal from '../components/InviteMemberModal';
import BoardSettingsModal from '../components/BoardSettingsModal';
import { studyBoardService } from '../src/services/studyBoard.service';
import { BoardParticipant } from '../src/types/studyBoard.types';

// Type definitions
interface TLEditor {
  store: {
    get: (id: string) => unknown;
    put: (records: unknown[]) => void;
    remove: (ids: string[]) => void;
    listen: (callback: (event: TLStoreEvent) => void) => () => void;
  };
}

interface TLStoreEvent {
  changes: {
    added: Record<string, unknown>;
    updated: Record<string, [unknown, unknown]>;
    removed: Record<string, unknown>;
  };
}

interface CursorData {
  x: number;
  y: number;
}

// ParticipantData used for socket event typing
type ParticipantData = {
  userId: string;
  email: string;
  name?: string;
  userName?: string;
  color: string;
}

interface SocketResponseData extends ParticipantData {
  position?: CursorData;
}

interface ElementData {
  elementId: string;
  boardId: string;
  changes?: Record<string, unknown>;
  changeSet?: Record<string, unknown>;
  element?: {
    id: string;
    type: string;
    x: number;
    y: number;
    props: Record<string, unknown>;
  };
}

interface PendingElement {
  id: string;
  type: string;
  x: number;
  y: number;
  props: Record<string, unknown>;
}

// Memoized Participant Avatar Component
const ParticipantAvatar = memo(({ participant, index }: { participant: BoardParticipant; index: number }) => (
  <div 
    key={`${participant.userId}-${index}`}
    className="w-10 h-10 rounded-2xl border-4 border-white flex items-center justify-center text-white font-black text-xs shadow-md"
    style={{ backgroundColor: participant.color }}
    title={participant.name}
  >
    {participant.name.charAt(0).toUpperCase()}
  </div>
));
ParticipantAvatar.displayName = 'ParticipantAvatar';

// Memoized Cursor Component
const LiveCursor = memo(({ cursor, participant }: { cursor: CursorData; participant: BoardParticipant | undefined }) => {
  if (!participant) return null;
  
  return (
    <div
      className="absolute transition-transform duration-100"
      style={{
        left: cursor.x,
        top: cursor.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={participant.color}
        className="drop-shadow-lg"
      >
        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" />
      </svg>
      <div 
        className="ml-6 -mt-2 px-2 py-1 rounded text-white text-xs font-bold whitespace-nowrap shadow-lg"
        style={{ backgroundColor: participant.color }}
      >
        {participant.name.split('@')[0]}
      </div>
    </div>
  );
});
LiveCursor.displayName = 'LiveCursor';

// Debounce utility
function debounce<T extends (...args: never[]) => unknown>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

const CollaborativeBoard: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const boardId = params?.id as string;

  const { user, accessToken } = useAuthStore();
  const { 
    currentBoard, 
    participants, 
    cursors,
    setCurrentBoard,
    addParticipant,
    removeParticipant,
    updateCursor
  } = useStudyBoardStore();

  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const isApplyingRemoteChange = useRef(false);
  const isDrawingRef = useRef(false);
  const drawingShapeIdRef = useRef<string | null>(null);
  const [editor, setEditor] = useState<TLEditor | null>(null);
  const [pendingElements, setPendingElements] = useState<PendingElement[]>([]);
  const importPayloadRef = useRef<any | null>(null);
  const importAppliedRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const cursorPositionRef = useRef({ x: 0, y: 0 });

  const generateShapeId = (prefix: string = 'shape') => {
    return `${prefix}:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const buildInfographicShapes = (infographic: any) => {
    if (!infographic) return [];
    const title = String(infographic.title || 'Infographic');
    const subtitle = infographic.subtitle ? String(infographic.subtitle) : '';
    const sections = Array.isArray(infographic.sections) ? infographic.sections : [];

    const originX = 120;
    const originY = 140;

    const shapes: any[] = [];

    shapes.push({
      id: generateShapeId('shape'),
      typeName: 'shape',
      type: 'text',
      x: originX,
      y: originY,
      parentId: 'page:page',
      index: 'a1',
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {},
      props: {
        text: subtitle ? `${title}\n${subtitle}` : title,
        font: 'sans',
        size: 'xl',
        color: 'black',
        align: 'start',
        w: 680,
        autoSize: false,
        scale: 1,
      },
    });

    sections.slice(0, 4).forEach((section: any, idx: number) => {
      const cardX = originX + (idx % 2) * 360;
      const cardY = originY + 110 + Math.floor(idx / 2) * 220;
      const icon = section?.icon ? String(section.icon) : '📌';
      const sectionTitle = section?.title ? String(section.title) : `Section ${idx + 1}`;
      const keyPoints = Array.isArray(section?.keyPoints) ? section.keyPoints.slice(0, 4) : [];
      const body = keyPoints.map((p: any) => `• ${String(p)}`).join('\n');
      const text = body ? `${icon} ${sectionTitle}\n${body}` : `${icon} ${sectionTitle}`;

      shapes.push({
        id: generateShapeId('shape'),
        typeName: 'shape',
        type: 'geo',
        x: cardX,
        y: cardY,
        parentId: 'page:page',
        index: `a${idx + 2}`,
        rotation: 0,
        isLocked: false,
        opacity: 1,
        meta: {},
        props: {
          geo: 'rectangle',
          w: 330,
          h: 200,
          color: 'blue',
          fill: 'semi',
          dash: 'draw',
          size: 'm',
          font: 'sans',
          text,
          align: 'start',
          verticalAlign: 'start',
          growY: 0,
          url: '',
        },
      });
    });

    return shapes;
  };

  const buildMindmapShapes = (mindmap: any) => {
    if (!mindmap) return [];

    let nodes: Array<{ id: string; label: string }> = [];
    let edges: Array<{ from: string; to: string }> = [];

    if (Array.isArray(mindmap.nodes)) {
      nodes = mindmap.nodes
        .map((n: any, idx: number) => ({
          id: String(n?.id ?? `n${idx + 1}`),
          label: String(n?.label ?? n?.text ?? n?.title ?? `Node ${idx + 1}`),
        }))
        .filter((n: any) => n.id);

      if (Array.isArray(mindmap.edges)) {
        edges = mindmap.edges
          .map((e: any) => ({
            from: String(e?.from ?? e?.source ?? e?.src ?? ''),
            to: String(e?.to ?? e?.target ?? e?.dst ?? ''),
          }))
          .filter((e: any) => e.from && e.to);
      }
    } else if (mindmap?.label && Array.isArray(mindmap?.children)) {
      const walk = (node: any, parentId: string | null) => {
        const id = String(node?.id ?? generateShapeId('n'));
        const label = String(node?.label ?? node?.title ?? 'Node');
        nodes.push({ id, label });
        if (parentId) edges.push({ from: parentId, to: id });
        (node?.children || []).forEach((c: any) => walk(c, id));
      };
      walk(mindmap, null);
    }

    if (nodes.length === 0) return [];

    const maxNodes = 12;
    if (nodes.length > maxNodes) nodes = nodes.slice(0, maxNodes);
    const nodeIdSet = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => nodeIdSet.has(e.from) && nodeIdSet.has(e.to));

    const indegree = new Map<string, number>();
    nodes.forEach((n) => indegree.set(n.id, 0));
    edges.forEach((e) => indegree.set(e.to, (indegree.get(e.to) || 0) + 1));
    const root = nodes.find((n) => (indegree.get(n.id) || 0) === 0) || nodes[0];

    const children = new Map<string, string[]>();
    edges.forEach((e) => {
      const list = children.get(e.from) || [];
      list.push(e.to);
      children.set(e.from, list);
    });

    const depth = new Map<string, number>();
    depth.set(root.id, 0);
    const queue: string[] = [root.id];
    while (queue.length) {
      const current = queue.shift()!;
      const d = depth.get(current) || 0;
      (children.get(current) || []).forEach((c) => {
        if (!depth.has(c)) {
          depth.set(c, d + 1);
          queue.push(c);
        }
      });
    }

    const byDepth = new Map<number, string[]>();
    nodes.forEach((n) => {
      const d = depth.get(n.id) ?? 0;
      const list = byDepth.get(d) || [];
      list.push(n.id);
      byDepth.set(d, list);
    });

    const originX = 120;
    const originY = 160;
    const dx = 320;
    const dy = 160;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const shapes: any[] = [];

    shapes.push({
      id: generateShapeId('shape'),
      typeName: 'shape',
      type: 'text',
      x: originX,
      y: originY - 70,
      parentId: 'page:page',
      index: 'a1',
      rotation: 0,
      isLocked: false,
      opacity: 1,
      meta: {},
      props: {
        text: `🧠 Mindmap: ${root.label}`,
        font: 'sans',
        size: 'l',
        color: 'black',
        align: 'start',
        w: 700,
        autoSize: false,
        scale: 1,
      },
    });

    const depthLevels = Array.from(byDepth.keys()).sort((a, b) => a - b);
    let shapeIndex = 2;
    depthLevels.forEach((d) => {
      const ids = byDepth.get(d) || [];
      const count = ids.length;
      ids.forEach((id, i) => {
        const n = nodeMap.get(id);
        if (!n) return;
        const x = originX + d * dx;
        const y = originY + (i - (count - 1) / 2) * dy;
        const isRoot = id === root.id;

        shapes.push({
          id: generateShapeId('shape'),
          typeName: 'shape',
          type: 'geo',
          x,
          y,
          parentId: 'page:page',
          index: `a${shapeIndex++}`,
          rotation: 0,
          isLocked: false,
          opacity: 1,
          meta: {},
          props: {
            geo: 'ellipse',
            w: isRoot ? 280 : 220,
            h: isRoot ? 140 : 110,
            color: isRoot ? 'violet' : 'blue',
            fill: 'semi',
            dash: 'draw',
            size: 'm',
            font: 'sans',
            text: n.label,
            align: 'middle',
            verticalAlign: 'middle',
            growY: 0,
            url: '',
          },
        });
      });
    });

    return shapes;
  };

  const buildShapesFromImport = (payload: any) => {
    if (!payload || typeof payload !== 'object') return [];
    if (payload.kind === 'mindmap') return buildMindmapShapes(payload.data);
    if (payload.kind === 'infographic') return buildInfographicShapes(payload.data);
    return [];
  };

  // Handle tldraw editor mount
  const handleMount = useCallback((editorInstance: any) => {
    setEditor(editorInstance);
  }, []);

  // Debounced update element to batch rapid changes (not for draw shapes)
  const debouncedUpdateElement = useMemo(
    () => debounce((boardId: string, elementId: string, changeSet: Record<string, unknown>) => {
      socketClient.updateElement(boardId, elementId, changeSet);
    }, 100),
    []
  );

  // Throttled update for draw shapes - faster updates for real-time drawing
  const throttledDrawUpdate = useMemo(() => {
    let lastCall = 0;
    const throttleMs = 50; // Update every 50ms for smoother drawing
    
    return (boardId: string, elementId: string, changeSet: Record<string, unknown>) => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        socketClient.updateElement(boardId, elementId, changeSet);
      }
    };
  }, []);

  // Sync tldraw store changes to other users via editor
  useEffect(() => {
    if (!editor || !boardId || !isConnected) return;

    const handleStoreChange = (event: any) => {
      // Don't broadcast changes that came from remote
      if (isApplyingRemoteChange.current) return;
      
      const changes = event?.changes;
      if (!changes) return;

      const { added, updated, removed } = changes;
      
      // Check if there are any actual shape changes
      const hasShapeChanges = 
        (added && Object.values(added).some((r: unknown) => (r as { typeName?: string })?.typeName === 'shape')) ||
        (updated && Object.values(updated).some((r: unknown) => Array.isArray(r) && (r[1] as { typeName?: string })?.typeName === 'shape')) ||
        (removed && Object.values(removed).some((r: unknown) => (r as { typeName?: string })?.typeName === 'shape'));
      
      if (!hasShapeChanges) return;

      // Broadcast added records
      if (added) {
        Object.values(added).forEach((record: any) => {
          if (record?.typeName === 'shape') {
            // Track if this is a draw/freehand shape being created
            if (record.type === 'draw') {
              isDrawingRef.current = true;
              drawingShapeIdRef.current = record.id;
              // Broadcast draw shape immediately so others can see it
              socketClient.createElement(boardId, {
                id: record.id,
                type: record.type,
                typeName: record.typeName || 'shape',
                x: record.x || 0,
                y: record.y || 0,
                props: record.props || {},
                parentId: record.parentId || 'page:page',
                index: record.index || 'a1',
                rotation: record.rotation || 0,
                isLocked: record.isLocked || false,
                opacity: record.opacity || 1,
                meta: record.meta || {},
              });
              return;
            }
            
            socketClient.createElement(boardId, {
              id: record.id,
              type: record.type,
              typeName: record.typeName || 'shape',
              x: record.x || 0,
              y: record.y || 0,
              props: record.props || {},
              parentId: record.parentId || 'page:page',
              index: record.index || 'a1',
              rotation: record.rotation || 0,
              isLocked: record.isLocked || false,
              opacity: record.opacity || 1,
              meta: record.meta || {},
            });
          }
        });
      }

      // Broadcast updated records with debouncing
      if (updated) {
        Object.values(updated).forEach(([from, to]: any) => {
          if (to?.typeName === 'shape') {
            // For draw shapes, send complete shape data for real-time drawing
            if (to.type === 'draw') {
              // Send the full shape with all segments, not just changes
              const fullShapeData: any = {
                x: to.x || 0,
                y: to.y || 0,
                rotation: to.rotation || 0,
                opacity: to.opacity || 1,
                isLocked: to.isLocked || false,
                props: to.props || {}, // Complete props with all segments
                type: to.type,
                typeName: to.typeName || 'shape',
                parentId: to.parentId || 'page:page',
                index: to.index || 'a1',
                meta: to.meta || {}
              };
              
              // Use throttled update for draw shapes (faster than debounce)
              throttledDrawUpdate(boardId, to.id, fullShapeData);
              
              // Check if the draw is complete (isComplete flag)
              const toProps = to.props as { isComplete?: boolean };
              if (toProps?.isComplete) {
                isDrawingRef.current = false;
                drawingShapeIdRef.current = null;
              }
              return;
            }
            
            const changeSet: any = {};
            if (from.x !== to.x) changeSet.x = to.x;
            if (from.y !== to.y) changeSet.y = to.y;
            if (from.rotation !== to.rotation) changeSet.rotation = to.rotation;
            if (from.opacity !== to.opacity) changeSet.opacity = to.opacity;
            if (from.isLocked !== to.isLocked) changeSet.isLocked = to.isLocked;
            if (from.type !== to.type) changeSet.type = to.type;
            if (from.typeName !== to.typeName) changeSet.typeName = to.typeName;
            if (JSON.stringify(from.props) !== JSON.stringify(to.props)) changeSet.props = to.props;
            
            if (Object.keys(changeSet).length > 0) {
              debouncedUpdateElement(boardId, to.id, changeSet);
            }
          }
        });
      }

      // Broadcast removed records
      if (removed) {
        Object.values(removed).forEach((record: any) => {
          if (record?.typeName === 'shape') {
            socketClient.deleteElement(boardId, record.id);
          }
        });
      }
    };

    const dispose = editor.store.listen(handleStoreChange);

    return () => dispose();
  }, [editor, boardId, isConnected, debouncedUpdateElement, throttledDrawUpdate]);

  // Handle pointer up to finalize drawing
  useEffect(() => {
    if (!editor || !boardId || !isConnected) return;

    const handlePointerUp = () => {
      // When pointer is released, mark drawing as complete
      if (isDrawingRef.current && drawingShapeIdRef.current) {
        isDrawingRef.current = false;
        drawingShapeIdRef.current = null;
      }
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [editor, boardId, isConnected]);

  // Memoized socket event handlers
  const handleElementCreated = useCallback((data: any) => {
    if (!editor || editor.store.get(data.element.id)) return;
    
    isApplyingRemoteChange.current = true;
    
    try {
      const shapeRecord: any = {
        id: data.element.id,
        typeName: data.element.typeName || 'shape',
        type: data.element.type,
        x: data.element.x || 0,
        y: data.element.y || 0,
        props: data.element.props || {},
        parentId: data.element.parentId || 'page:page',
        index: data.element.index || 'a1',
        rotation: data.element.rotation || 0,
        isLocked: data.element.isLocked || false,
        opacity: data.element.opacity || 1,
        meta: data.element.meta || {},
      };
      
      editor.store.put([shapeRecord]);
    } catch (error) {
      console.error('Error adding remote shape:', error);
    } finally {
      setTimeout(() => {
        isApplyingRemoteChange.current = false;
      }, 0);
    }
  }, [editor]);

  const handleElementUpdated = useCallback((data: any) => {
    if (!editor) return;
    
    isApplyingRemoteChange.current = true;
    
    try {
      const existing = editor.store.get(data.elementId);
      const updates = data.changes || data.changeSet; // Support both formats
      
      if (existing && updates) {
        editor.store.put([{
          ...existing,
          ...updates,
        }]);
      }
    } catch (error) {
      console.error('Error updating remote shape:', error);
    } finally {
      setTimeout(() => {
        isApplyingRemoteChange.current = false;
      }, 0);
    }
  }, [editor]);

  const handleElementDeleted = useCallback((data: ElementData) => {
    if (!editor) return;
    
    isApplyingRemoteChange.current = true;
    
    try {
      if (editor.store.get(data.elementId)) {
        editor.store.remove([data.elementId]);
      }
    } catch (error) {
      console.error('Error deleting remote shape:', error);
    } finally {
      setTimeout(() => {
        isApplyingRemoteChange.current = false;
      }, 0);
    }
  }, [editor]);

  const handleUserJoined = useCallback((data: SocketResponseData) => {
    if (data.userId !== user?.id) {
      addParticipant({
        userId: data.userId,
        userName: data.email.split('@')[0],
        name: data.email,
        email: data.email,
        color: data.color,
        role: 'editor',
        isActive: true,
        joinedAt: new Date().toISOString()
      });
    }
  }, [user?.id, addParticipant]);

  const handleUserLeft = useCallback((data: SocketResponseData) => {
    removeParticipant(data.userId);
  }, [removeParticipant]);

  const handleCursorMove = useCallback((data: SocketResponseData) => {
    if (data.position) {
      updateCursor(data.userId, data.position as any);
    }
  }, [updateCursor]);

  // Initialize board connection
  useEffect(() => {
    if (!boardId || !user || !accessToken) return;

    let isMounted = true;
    let joinTimeoutId: NodeJS.Timeout | null = null;

    const initBoard = async () => {
      if (!isMounted) return;
      
      try {
        setIsLoading(true);

        // Wait for socket to connect
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

        // Set a timeout for joinBoard callback
        joinTimeoutId = setTimeout(() => {
          if (!isMounted) return;
          console.error('[Board] Join board timeout');
          alert('Failed to load board. The board may not exist or you may not have access.');
          router.push('/study-board');
        }, 15000);

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
          
          // Check for template shapes in sessionStorage
          const templateShapes = sessionStorage.getItem(`board-${boardId}-template`);
          if (templateShapes) {
            try {
              const shapes = JSON.parse(templateShapes);
              setPendingElements(shapes);
              sessionStorage.removeItem(`board-${boardId}-template`);
            } catch (error) {
              console.error('Failed to parse template shapes:', error);
            }
          } else if (response.board?.elements && response.board.elements.length > 0) {
            setPendingElements(response.board.elements);
          }

          // Artifact import payload (used when user selects "Add to Study Board" from Study Notebook)
          const importPayload = sessionStorage.getItem(`board-${boardId}-import`);
          if (importPayload) {
            try {
              importPayloadRef.current = JSON.parse(importPayload);
              importAppliedRef.current = false;
              sessionStorage.removeItem(`board-${boardId}-import`);
            } catch (error) {
              console.error('Failed to parse board import payload:', error);
            }
          }
          
          response.participants?.forEach((p: any) => {
            if (p.userId !== user.id) {
              addParticipant({
                userId: p.userId,
                userName: p.userName || p.email.split('@')[0],
                name: p.name || p.email,
                email: p.email,
                color: p.color,
                role: 'editor',
                isActive: true,
                joinedAt: new Date().toISOString()
              });
            }
          });

          setIsConnected(true);
          setIsLoading(false);
        });

        // Setup event listeners
        socketClient.onUserJoined(handleUserJoined);
        socketClient.onUserLeft(handleUserLeft);
        socketClient.onCursorMove(handleCursorMove);

      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to initialize board:', error);
        setIsLoading(false);
      }
    };

    initBoard();

    // Cleanup function
    return () => {
      isMounted = false;
      
      if (joinTimeoutId) {
        clearTimeout(joinTimeoutId);
      }
      
      if (boardId) {
        socketClient.leaveBoard(boardId);
      }
      
      // Remove event listeners
      socketClient.off('user:joined');
      socketClient.off('user:left');
      socketClient.off('cursor:moved');
    };
  }, [boardId, user, accessToken, router]);

  // Apply imported artifacts after the board loads its existing elements.
  // This should broadcast `element:create` so it persists and is collaborative.
  useEffect(() => {
    if (!editor || !boardId || !isConnected) return;
    if (!importPayloadRef.current || importAppliedRef.current) return;

    let cancelled = false;

    const tryApply = () => {
      if (cancelled) return;
      if (!editor || !isConnected) return;

      // Wait for initial load to finish.
      if (pendingElements.length > 0 || isApplyingRemoteChange.current) {
        setTimeout(tryApply, 120);
        return;
      }

      try {
        const shapes = buildShapesFromImport(importPayloadRef.current);
        if (shapes.length > 0) {
          editor.store.put(shapes);
        }
      } catch (e) {
        console.error('Failed to apply imported shapes:', e);
      } finally {
        importAppliedRef.current = true;
        importPayloadRef.current = null;
      }
    };

    setTimeout(tryApply, 160);

    return () => {
      cancelled = true;
    };
  }, [editor, boardId, isConnected, pendingElements.length]);

  // Setup element event listeners
  useEffect(() => {
    if (!editor || !boardId) return;

    // Load pending elements
    if (pendingElements.length > 0) {
      isApplyingRemoteChange.current = true;
      
      try {
        const validElements = pendingElements.filter((el: any) => el && el.id && el.type);

        const shapes = validElements.map((el: any) => ({
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
        }));
        
        if (shapes.length > 0) {
          editor.store.put(shapes);
        }
        setTimeout(() => setPendingElements([]), 0);
      } catch (error) {
        console.error('Error loading pending elements:', error);
      } finally {
        setTimeout(() => {
          isApplyingRemoteChange.current = false;
        }, 100);
      }
    }

    socketClient.onElementCreated(handleElementCreated);
    socketClient.onElementUpdated(handleElementUpdated);
    socketClient.onElementDeleted(handleElementDeleted);

    return () => {
      socketClient.off('element:created', handleElementCreated);
      socketClient.off('element:updated', handleElementUpdated);
      socketClient.off('element:deleted', handleElementDeleted);
    };
  }, [editor, boardId, handleElementCreated, handleElementUpdated, handleElementDeleted, pendingElements]);

  // Optimized cursor tracking with requestAnimationFrame
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

  // Memoized participant list
  const visibleParticipants = useMemo(() => participants.slice(0, 3), [participants]);
  const participantCount = participants.length;

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
      <div className="bg-white/80 backdrop-blur-md border-b-2 border-slate-100 px-8 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-5">
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-2xl h-10 w-10 border-b-2"
            onClick={() => router.push('/study-board')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              {currentBoard?.title || 'Untitled Board'}
              {isConnected && (
                <div className="flex items-center bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Live Session
                </div>
              )}
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">
              {participantCount > 0 
                ? `${participantCount} other${participantCount > 1 ? 's' : ''} studying here`
                : 'You are alone in this board'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Participant Avatars */}
          <div className="flex -space-x-3 mr-4">
            {visibleParticipants.map((p, i) => (
              <ParticipantAvatar key={p.userId} participant={p} index={i} />
            ))}
            {participantCount > 3 && (
              <div className="w-10 h-10 rounded-2xl border-4 border-white bg-indigo-500 text-[11px] font-black text-white flex items-center justify-center shadow-md">
                +{participantCount - 3}
              </div>
            )}
          </div>
          <Button 
            variant="outline" 
            className="gap-2 px-6"
            onClick={() => setShowInviteModal(true)}
          >
            <ICONS.Share size={18} /> Invite
          </Button>
          <Button 
            variant="secondary"
            size="icon"
            className="rounded-2xl h-10 w-10"
            onClick={() => setShowSettingsModal(true)}
            title="Board Settings"
          >
            <ICONS.Settings size={18} />
          </Button>
        </div>
      </div>

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
          <div className="absolute inset-0 pointer-events-none z-10">
            {Object.entries(cursors).map(([userId, cursor]) => {
              const participant = participants.find(p => p.userId === userId);
              return <LiveCursor key={userId} cursor={cursor} participant={participant} />;
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      <InviteMemberModal
        boardId={boardId}
        boardTitle={currentBoard?.title || 'Board'}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={async (email, role) => {
          try {
            await studyBoardService.inviteMember(boardId, email, role);
          } catch (error: unknown) {
            console.error('Failed to send invitation:', error);
            throw error;
          }
        }}
      />

      {currentBoard && (
        <BoardSettingsModal
          board={{ ...currentBoard, _id: currentBoard.id }}
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
