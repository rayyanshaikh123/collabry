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

    provider.on('sync', (synced: boolean) => {
      setIsSynced(synced);

      // When first synced, load remote records into tldraw store
      if (synced) {
        isApplyingRemoteRef.current = true;
        try {
          editor.store.mergeRemoteChanges(() => {
            yStore.forEach((value: any, key: string) => {
              if (value && typeof value === 'object' && value.id && value.typeName === 'shape') {
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
          // Handle added shapes
          if (added) {
            Object.values(added).forEach((record: any) => {
              if (record?.typeName === 'shape') {
                // Store plain serializable object
                const plainRecord = {
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
                yStore.set(record.id, plainRecord);
              }
            });
          }

          // Handle updated shapes
          if (updated) {
            Object.values(updated).forEach(([, to]: any) => {
              if (to?.typeName === 'shape') {
                const plainRecord = {
                  id: to.id,
                  typeName: to.typeName,
                  type: to.type,
                  x: to.x,
                  y: to.y,
                  rotation: to.rotation,
                  isLocked: to.isLocked,
                  opacity: to.opacity,
                  props: JSON.parse(JSON.stringify(to.props || {})),
                  meta: JSON.parse(JSON.stringify(to.meta || {})),
                  parentId: to.parentId,
                  index: to.index,
                };
                yStore.set(to.id, plainRecord);
              }
            });
          }

          // Handle removed shapes
          if (removed) {
            Object.values(removed).forEach((record: any) => {
              if (record?.typeName === 'shape') {
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

    // --- Track cursor position via awareness ---
    const handlePointerMove = (e: PointerEvent) => {
      const canvas = (e.target as HTMLElement).closest('.tl-container');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      provider.awareness.setLocalStateField('cursor', {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
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
