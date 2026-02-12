import { useEffect, useMemo } from 'react';
import { socketClient } from '@/lib/socket';
import { googleDriveService } from '@/lib/googleDrive';


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

interface UseBoardSyncProps {
  editor: TLEditor | null;
  boardId: string;
  isConnected: boolean;
  isApplyingRemoteChange: React.MutableRefObject<boolean>;
  isDrawingRef: React.MutableRefObject<boolean>;
  drawingShapeIdRef: React.MutableRefObject<string | null>;
}

function debounce<T extends (...args: never[]) => unknown>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function useBoardSync({ 
  editor, 
  boardId, 
  isConnected,
  isApplyingRemoteChange,
  isDrawingRef,
  drawingShapeIdRef 
}: UseBoardSyncProps) {

  const debouncedUpdateElement = useMemo(
    () => debounce((boardId: string, elementId: string, changeSet: Record<string, unknown>) => {
      socketClient.updateElement(boardId, elementId, changeSet);
    }, 100),
    []
  );

  const throttledDrawUpdate = useMemo(() => {
    let lastCall = 0;
    const throttleMs = 50;
    
    return (boardId: string, elementId: string, changeSet: Record<string, unknown>) => {
      const now = Date.now();
      if (now - lastCall >= throttleMs) {
        lastCall = now;
        socketClient.updateElement(boardId, elementId, changeSet);
      }
    };
  }, []);

  useEffect(() => {
    if (!editor || !boardId || !isConnected) return;

    const handleStoreChange = (event: any) => {
      if (isApplyingRemoteChange.current) return;
      
      const changes = event?.changes;
      if (!changes) return;

      const { added, updated, removed } = changes;
      
      const hasShapeChanges = 
        (added && Object.values(added).some((r: unknown) => (r as { typeName?: string })?.typeName === 'shape')) ||
        (updated && Object.values(updated).some((r: unknown) => Array.isArray(r) && (r[1] as { typeName?: string })?.typeName === 'shape')) ||
        (removed && Object.values(removed).some((r: unknown) => (r as { typeName?: string })?.typeName === 'shape'));
      
      if (!hasShapeChanges) return;

      console.log('[useBoardSync] Shape changes detected — added:', Object.keys(added || {}).length, 'updated:', Object.keys(updated || {}).length, 'removed:', Object.keys(removed || {}).length);

      if (added) {
        Object.values(added).forEach((record: any) => {
          if (record?.typeName === 'shape') {
            let meta = record.meta || {};
            
            if (record.type === 'image' && record.props?.assetId && !meta.driveFileId && !meta.imageData) {
              const asset = editor?.store.get(record.props.assetId) as any;
              if (asset?.props?.src) {
                console.log('Uploading image to Google Drive...');
                
                (async () => {
                  try {
                    const isAuth = googleDriveService.isAuthenticated();
                    if (!isAuth) {
                      const granted = await googleDriveService.requestAccess();
                      if (!granted) {
                        console.warn('Google Drive access denied, storing locally');
                        throw new Error('Drive access denied');
                      }
                    }
                    
                    const filename = asset.props.name || `image-${Date.now()}.png`;
                    const driveFile = await googleDriveService.uploadImage(
                      asset.props.src,
                      filename,
                      asset.props.mimeType || 'image/png'
                    );
                    
                    console.log('Image uploaded to Drive:', driveFile.id);
                    
                    const updatedMeta = {
                      ...record.meta,
                      driveFileId: driveFile.id,
                      driveMimeType: asset.props.mimeType,
                      driveName: filename,
                      w: asset.props.w,
                      h: asset.props.h,
                    };
                    
                    editor?.store.put([{ ...record, meta: updatedMeta }]);
                  } catch (driveError) {
                    console.error('Drive upload failed, falling back to local storage:', driveError);
                    
                    const fallbackMeta = {
                      ...record.meta,
                      imageData: {
                        src: asset.props.src,
                        w: asset.props.w,
                        h: asset.props.h,
                        mimeType: asset.props.mimeType,
                        name: asset.props.name,
                      }
                    };
                    
                    editor?.store.put([{ ...record, meta: fallbackMeta }]);
                  }
                })();
              }
            }
            
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
          }
        });
      }

      if (updated) {
        Object.values(updated).forEach(([from, to]: any) => {
          if (to?.typeName === 'shape') {
            if (to.type === 'draw') {
              const fullShapeData: any = {
                x: to.x || 0,
                y: to.y || 0,
                rotation: to.rotation || 0,
                opacity: to.opacity || 1,
                isLocked: to.isLocked || false,
                props: to.props || {},
                type: to.type,
                typeName: to.typeName || 'shape',
                parentId: to.parentId || 'page:page',
                index: to.index || 'a1',
                meta: to.meta || {}
              };
              
              throttledDrawUpdate(boardId, to.id, fullShapeData);
              
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

      if (removed) {
        Object.values(removed).forEach((record: any) => {
          if (record?.typeName === 'shape') {
            socketClient.deleteElement(boardId, record.id);
          }
        });
      }
    };

    const dispose = editor.store.listen(handleStoreChange, { source: 'user', scope: 'document' });

    return () => dispose();
  }, [editor, boardId, isConnected, debouncedUpdateElement, throttledDrawUpdate]);

  useEffect(() => {
    if (!editor || !boardId || !isConnected) return;

    const handlePointerUp = () => {
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
}
