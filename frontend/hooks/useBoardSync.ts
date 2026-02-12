import { useEffect, useCallback, useMemo } from 'react';
import { socketClient } from '@/lib/socket';
import { sanitizeShape } from './useBoardShapes';

interface TLEditor {
  store: {
    get: (id: string) => any;
    put: (records: any[]) => void;
    remove: (ids: string[]) => void;
    listen: (callback: (event: any) => void) => () => void;
  };
}

interface UseBoardSyncProps {
  editor: TLEditor | null;
  boardId: string;
  isConnected: boolean;
  isApplyingRemoteChange: React.MutableRefObject<boolean>;
  isDrawingRef: React.MutableRefObject<boolean>;
  drawingShapeIdRef: React.MutableRefObject<string | null>;
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Hook for synchronizing tldraw store changes with the backend via Socket.IO.
 * Handles both outgoing changes (local -> server) and incoming changes (server -> local).
 */
export function useBoardSync({
  editor,
  boardId,
  isConnected,
  isApplyingRemoteChange,
  isDrawingRef,
  drawingShapeIdRef
}: UseBoardSyncProps) {

  // Outgoing sync handlers
  const debouncedUpdateElement = useMemo(
    () => debounce((boardId: string, elementId: string, changeSet: Record<string, unknown>) => {
      socketClient.updateElement(boardId, elementId, changeSet);
    }, 150),
    []
  );

  const throttledDrawUpdate = useMemo(() => {
    let lastCall = 0;
    const throttleMs = 40;

    return (boardId: string, elementId: string, changeSet: Record<string, unknown>) => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        socketClient.updateElement(boardId, elementId, changeSet);
      }
    };
  }, []);

  // Handle local store changes
  useEffect(() => {
    if (!editor || !boardId || !isConnected) return;

    const handleStoreChange = (event: any) => {
      // Prevent loop when applying remote changes
      if (isApplyingRemoteChange.current) return;

      const { added, updated, removed } = event?.changes || {};

      // Filter for shape changes only (tldraw uses types like 'shape', 'page', 'instance')
      const hasShapeChanges =
        (added && Object.values(added).some((r: any) => r?.typeName === 'shape')) ||
        (updated && Object.values(updated).some((r: any) => r[1]?.typeName === 'shape')) ||
        (removed && Object.values(removed).some((r: any) => r?.typeName === 'shape'));

      if (!hasShapeChanges) return;

      // 1. Process New shapes
      if (added) {
        Object.values(added).forEach((record: any) => {
          if (record?.typeName === 'shape') {
            console.log('Outgoing: created shape', record.id);

            // Handle image asset metadata optimization
            let meta = record.meta || {};
            if (record.type === 'image' && record.props?.assetId && !meta.imageData) {
              const asset = editor.store.get(record.props.assetId);
              if (asset?.props?.src) {
                meta = {
                  ...meta,
                  imageData: {
                    src: asset.props.src,
                    name: asset.props.name || 'image.png',
                    w: asset.props.w,
                    h: asset.props.h,
                    mimeType: asset.props.mimeType
                  }
                };
              }
            }

            // For draw shapes, we track drawing state
            if (record.type === 'draw') {
              isDrawingRef.current = true;
              drawingShapeIdRef.current = record.id;

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
                meta: meta,
              });
              return;
            }

            socketClient.createElement(boardId, {
              ...record,
              meta // Include reconstructed meta
            });
          }
        });
      }

      // 2. Process Updated shapes
      if (updated) {
        Object.values(updated).forEach(([from, to]: any) => {
          if (to?.typeName === 'shape') {
            // Specialized handling for high-frequency draw shapes
            if (to.type === 'draw') {
              throttledDrawUpdate(boardId, to.id, to); // Send full shape for simplicity with drawn paths

              const toProps = to.props as { isComplete?: boolean };
              if (toProps?.isComplete) {
                isDrawingRef.current = false;
                drawingShapeIdRef.current = null;
              }
              return;
            }

            // Shallow diff for other shapes
            const changeSet: any = {};
            const keys = ['x', 'y', 'rotation', 'opacity', 'isLocked', 'parentId', 'index', 'props', 'meta'];
            keys.forEach(key => {
              if (JSON.stringify(from[key]) !== JSON.stringify(to[key])) {
                changeSet[key] = to[key];
              }
            });

            if (Object.keys(changeSet).length > 0) {
              debouncedUpdateElement(boardId, to.id, changeSet);
            }
          }
        });
      }

      // 3. Process Removed shapes
      if (removed) {
        Object.values(removed).forEach((record: any) => {
          if (record?.typeName === 'shape') {
            console.log('Outgoing: deleted shape', record.id);
            socketClient.deleteElement(boardId, record.id);
          }
        });
      }
    };

    const dispose = editor.store.listen(handleStoreChange);
    return () => dispose();
  }, [editor, boardId, isConnected, debouncedUpdateElement, throttledDrawUpdate, isApplyingRemoteChange, isDrawingRef, drawingShapeIdRef]);


  // Incoming sync handlers (Remote -> Local)
  const handleElementCreated = useCallback((data: any) => {
    if (!editor || !data?.element) return;

    // Prevent applying our own changes
    const existing = editor.store.get(data.element.id);
    if (existing) return;

    isApplyingRemoteChange.current = true;
    try {
      const el = data.element;
      console.log('Incoming: created remote shape', el.id);

      // Reconstruct image assets if necessary
      if (el.type === 'image' && el.props?.assetId) {
        let assetSrc = el.meta?.svgDataUri || el.meta?.imageData?.src;
        if (assetSrc) {
          editor.store.put([{
            id: el.props.assetId,
            type: 'image',
            typeName: 'asset',
            props: {
              name: el.meta?.imageData?.name || 'image.png',
              src: assetSrc,
              w: el.meta?.w || el.meta?.imageData?.w || el.props.w || 800,
              h: el.meta?.h || el.meta?.imageData?.h || el.props.h || 600,
              mimeType: el.meta?.imageData?.mimeType || (el.meta?.svgDataUri ? 'image/svg+xml' : 'image/png'),
              isAnimated: false,
            },
            meta: {},
          }]);
        }
      }

      editor.store.put([sanitizeShape(el)]);
    } catch (error) {
      console.error('Error applying remote element:', error);
    } finally {
      setTimeout(() => { isApplyingRemoteChange.current = false; }, 40);
    }
  }, [editor, isApplyingRemoteChange]);

  const handleElementUpdated = useCallback((data: any) => {
    if (!editor || !data?.elementId) return;

    isApplyingRemoteChange.current = true;
    try {
      const existing = editor.store.get(data.elementId);
      if (!existing) {
        // If it doesn't exist yet, we can't update it. 
        // Note: Real-time systems usually handle this by fetching if missing.
        return;
      }

      console.log('Incoming: updated remote shape', data.elementId);
      const updates = data.changes || {};
      editor.store.put([{
        ...existing,
        ...updates
      }]);
    } catch (error) {
      console.error('Error applying remote update:', error);
    } finally {
      setTimeout(() => { isApplyingRemoteChange.current = false; }, 40);
    }
  }, [editor, isApplyingRemoteChange]);

  const handleElementDeleted = useCallback((data: any) => {
    if (!editor || !data?.elementId) return;

    isApplyingRemoteChange.current = true;
    try {
      console.log('Incoming: deleted remote shape', data.elementId);
      if (editor.store.get(data.elementId)) {
        editor.store.remove([data.elementId]);
      }
    } catch (error) {
      console.error('Error applying remote deletion:', error);
    } finally {
      setTimeout(() => { isApplyingRemoteChange.current = false; }, 40);
    }
  }, [editor, isApplyingRemoteChange]);

  // Setup socket listeners
  useEffect(() => {
    if (!isConnected) return;

    socketClient.onElementCreated(handleElementCreated);
    socketClient.onElementUpdated(handleElementUpdated);
    socketClient.onElementDeleted(handleElementDeleted);

    return () => {
      socketClient.off('element:created');
      socketClient.off('element:updated');
      socketClient.off('element:deleted');
    };
  }, [isConnected, handleElementCreated, handleElementUpdated, handleElementDeleted]);

  // Drawing state cleanup
  useEffect(() => {
    const handleUp = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        drawingShapeIdRef.current = null;
      }
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, [isDrawingRef, drawingShapeIdRef]);
}
