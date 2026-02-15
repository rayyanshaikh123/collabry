/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Editor } from 'tldraw';

interface UseYjsSyncProps {
  editor: Editor | null;
  boardId: string | null;
  accessToken: string | null;
  userName?: string;
  userColor?: string;
}

interface YjsSyncState {
  isConnected: boolean;
  isSynced: boolean;
  connectedUsers: Array<{
    userId: string;
    name: string;
    color: string;
    cursor?: { x: number; y: number };
  }>;
}

/**
 * Hook for synchronizing tldraw editor with Yjs via WebSocket.
 * 
 * Replaces the old Socket.IO-based sync (useBoardSync, useCursorTracking,
 * usePendingElements event listeners, LiveCursors).
 * 
 * Architecture:
 *   tldraw Editor <-> Yjs Y.Map('tldraw') <-> WebSocket <-> Backend Yjs Server <-> MongoDB
 * 
 * Features:
 * - CRDT conflict resolution (no data loss on concurrent edits)
 * - Automatic reconnection
 * - Built-in awareness (live cursors + presence)
 * - Debounced MongoDB persistence on the server
 */
export function useYjsSync({
  editor,
  boardId,
  accessToken,
  userName = 'Anonymous',
  userColor = '#888888',
}: UseYjsSyncProps): YjsSyncState {
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<YjsSyncState['connectedUsers']>([]);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const isApplyingLocalRef = useRef(false);
  const disposeStoreListenerRef = useRef<(() => void) | null>(null);

  // Build WebSocket URL
  const getWsUrl = useCallback(() => {
    const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const host = backendUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${host}/yjs/${boardId}`;
  }, [boardId]);

  useEffect(() => {
    if (!editor || !boardId || !accessToken) return;

    // Create Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Get the shared map that stores tldraw records
    const yStore = ydoc.getMap('tldraw');

    // Connect to the Yjs WebSocket server
    const wsUrl = getWsUrl();
    // y-websocket appends room name to URL, but we encode boardId in path
    // Use raw WebSocket connection instead of y-websocket's room-based approach
    const provider = new WebsocketProvider(
      wsUrl.replace(`/yjs/${boardId}`, ''),
      `yjs/${boardId}`,
      ydoc,
      {
        connect: true,
        params: { token: accessToken },
        WebSocketPolyfill: typeof WebSocket !== 'undefined' ? WebSocket as any : undefined,
      }
    );
    providerRef.current = provider;

    // Set awareness (user presence + cursor)
    provider.awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
    });

    // --- Connection status ---
    provider.on('status', ({ status }: { status: string }) => {
      setIsConnected(status === 'connected');
    });

    // Allowed record types to sync via Yjs.
    // 'shape' = drawings/elements, 'asset' = images/videos/bookmarks, 'binding' = arrow connections
    const SYNCED_TYPES = new Set(['shape', 'asset', 'binding']);

    provider.on('sync', (synced: boolean) => {
      setIsSynced(synced);

      // When first synced, load remote records into tldraw store
      if (synced) {
        isApplyingRemoteRef.current = true;
        try {
          editor.store.mergeRemoteChanges(() => {
            yStore.forEach((value: any, key: string) => {
              if (value && typeof value === 'object' && value.id && SYNCED_TYPES.has(value.typeName)) {
                const existing = editor.store.get(key as any);
                if (!existing) {
                  editor.store.put([value]);
                }
              }
            });
          });
        } catch (err) {
          console.error('[Yjs] Error applying initial sync:', err);
        } finally {
          isApplyingRemoteRef.current = false;
        }
      }
    });

    // --- Awareness (presence + cursors) ---
    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const users: YjsSyncState['connectedUsers'] = [];
      states.forEach((state, clientId) => {
        if (clientId === ydoc.clientID) return; // Skip self
        if (state.user) {
          users.push({
            userId: String(clientId),
            name: state.user.name || 'Anonymous',
            color: state.user.color || '#888',
            cursor: state.cursor || undefined,
          });
        }
      });
      setConnectedUsers(users);
    };
    provider.awareness.on('change', handleAwarenessChange);

    // --- Remote Yjs changes -> tldraw store ---
    const handleYjsChange = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
      if (transaction.local) return; // Skip our own changes
      if (isApplyingLocalRef.current) return;

      isApplyingRemoteRef.current = true;
      try {
        editor.store.mergeRemoteChanges(() => {
          events.forEach(event => {
            if (event instanceof Y.YMapEvent) {
              event.keysChanged.forEach(key => {
                const change = event.changes.keys.get(key);
                if (!change) return;

                if (change.action === 'add' || change.action === 'update') {
                  const record = yStore.get(key);
                  if (record && typeof record === 'object') {
                    editor.store.put([record as any]);
                  }
                } else if (change.action === 'delete') {
                  try {
                    editor.store.remove([key as any]);
                  } catch {
                    // Shape may already be removed
                  }
                }
              });
            }
          });
        });
      } catch (err) {
        console.error('[Yjs] Error applying remote changes:', err);
      } finally {
        isApplyingRemoteRef.current = false;
      }
    };
    yStore.observeDeep(handleYjsChange);

    // --- Local tldraw store changes -> Yjs ---
    const disposeListener = editor.store.listen((event) => {
      if (isApplyingRemoteRef.current) return;

      const { added, updated, removed } = event.changes;

      isApplyingLocalRef.current = true;
      try {
        ydoc.transact(() => {
          // Serialise a record for Yjs storage
          const serialise = (record: any) => {
            if (record.typeName === 'shape') {
              return {
                id: record.id,
                typeName: record.typeName,
                type: record.type,
                x: record.x,
                y: record.y,
                rotation: record.rotation,
                isLocked: record.isLocked,
                opacity: record.opacity,
                props: JSON.parse(JSON.stringify(record.props || {})),
                meta: JSON.parse(JSON.stringify(record.meta || {})),
                parentId: record.parentId,
                index: record.index,
              };
            }
            // Assets & bindings — store full record (strip non-serialisable fields)
            return JSON.parse(JSON.stringify(record));
          };

          // Handle added records
          if (added) {
            Object.values(added).forEach((record: any) => {
              if (record && SYNCED_TYPES.has(record.typeName)) {
                yStore.set(record.id, serialise(record));
              }
            });
          }

          // Handle updated records
          if (updated) {
            Object.values(updated).forEach(([, to]: any) => {
              if (to && SYNCED_TYPES.has(to.typeName)) {
                yStore.set(to.id, serialise(to));
              }
            });
          }

          // Handle removed records
          if (removed) {
            Object.values(removed).forEach((record: any) => {
              if (record && SYNCED_TYPES.has(record.typeName)) {
                yStore.delete(record.id);
              }
            });
          }
        });
      } finally {
        isApplyingLocalRef.current = false;
      }
    });
    disposeStoreListenerRef.current = disposeListener;

    // --- Track cursor position via awareness (in tldraw page-space) ---
    const handlePointerMove = (e: PointerEvent) => {
      if (!editor) return;
      const canvas = (e.target as HTMLElement).closest('.tl-container');
      if (!canvas) return;
      // Convert screen coordinates to tldraw page coordinates so cursors
      // are correct regardless of each user's pan/zoom level.
      const pagePoint = editor.screenToPage({ x: e.clientX, y: e.clientY });
      provider.awareness.setLocalStateField('cursor', {
        x: pagePoint.x,
        y: pagePoint.y,
      });
    };
    window.addEventListener('pointermove', handlePointerMove);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      provider.awareness.off('change', handleAwarenessChange);
      yStore.unobserveDeep(handleYjsChange);
      
      if (disposeStoreListenerRef.current) {
        disposeStoreListenerRef.current();
        disposeStoreListenerRef.current = null;
      }

      provider.disconnect();
      provider.destroy();
      ydoc.destroy();
      
      ydocRef.current = null;
      providerRef.current = null;

      setIsConnected(false);
      setIsSynced(false);
      setConnectedUsers([]);
    };
  }, [editor, boardId, accessToken, userName, userColor, getWsUrl]);

  return { isConnected, isSynced, connectedUsers };
}
