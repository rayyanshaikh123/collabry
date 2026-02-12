import { useEffect, MutableRefObject } from 'react';
import type { Editor } from 'tldraw';
import { sanitizeShape, buildShapesFromImport } from './useBoardShapes';
import { googleDriveService } from '@/lib/googleDrive';
import { socketClient } from '@/lib/socket';

interface UsePendingElementsProps {
  editor: Editor | null;
  boardId: string | null;
  isConnected: boolean;
  pendingElements: any[];
  setPendingElements: (elements: any[]) => void;
  isApplyingRemoteChange: MutableRefObject<boolean>;
  importPayloadRef: MutableRefObject<any>;
  importAppliedRef: MutableRefObject<boolean>;
  handleElementCreated: (data: any) => void;
  handleElementUpdated: (data: any) => void;
  handleElementDeleted: (data: any) => void;
}

/**
 * Hook for applying pending elements and imported artifacts to the board
 */
export const usePendingElements = ({
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
}: UsePendingElementsProps) => {
  // Apply imported artifacts after the board loads its existing elements
  useEffect(() => {
    if (!editor || !boardId || !isConnected) return;
    if (!importPayloadRef.current || importAppliedRef.current) return;

    let cancelled = false;

    const tryApply = async () => {
      if (cancelled) return;
      if (!editor || !isConnected) return;

      // Wait for initial load to finish
      if (pendingElements.length > 0 || isApplyingRemoteChange.current) {
        setTimeout(tryApply, 120);
        return;
      }

      console.log('=== tryApply: Applying imported shapes ===');
      console.log('Import payload:', importPayloadRef.current);

      try {
        const { shapes, assets } = await buildShapesFromImport(importPayloadRef.current);
        console.log('Built shapes:', shapes.length, 'assets:', assets.length);
        console.log('Shapes:', shapes);
        console.log('Assets:', assets);
        
        const records = [...assets, ...shapes];
        if (records.length > 0) {
          console.log('Putting', records.length, 'records into editor store');
          editor.store.mergeRemoteChanges(() => {
            editor.store.put(records);
          });
          console.log('Successfully added shapes to board');
        } else {
          console.warn('No records to add to board');
        }
      } catch (e) {
        console.error('Failed to apply imported shapes:', e);
        console.error('Error details:', e instanceof Error ? e.stack : String(e));
      } finally {
        importAppliedRef.current = true;
        importPayloadRef.current = null;
      }
    };

    setTimeout(tryApply, 160);

    return () => {
      cancelled = true;
    };
  }, [editor, boardId, isConnected, pendingElements.length, importPayloadRef, importAppliedRef, isApplyingRemoteChange]);

  // Load pending elements and setup element event listeners
  useEffect(() => {
    if (!editor || !boardId) return;

    // Load pending elements
    if (pendingElements.length > 0) {
      isApplyingRemoteChange.current = true;
      
      try {
        const validElements = pendingElements.filter((el: any) => el && el.id && el.type);

        const shapes = validElements.map((el: any) => sanitizeShape({
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
        
        // Reconstruct assets for image shapes
        const assets: any[] = [];
        for (const shape of shapes) {
          if (shape.type === 'image' && shape.props?.assetId) {
            let assetSrc = null;
            
            // Check for Drive file ID
            if (shape.meta?.driveFileId) {
              console.log('Loading image from Google Drive:', shape.meta.driveFileId);
              try {
                assetSrc = googleDriveService.getPublicUrl(shape.meta.driveFileId);
                console.log('Using Drive public URL');
              } catch (error) {
                console.error('Failed to get Drive image, trying fallback:', error);
              }
            }
            
            // Check for SVG data (mindmaps) if no Drive file
            if (!assetSrc && shape.meta?.svgDataUri) {
              console.log('Reconstructing SVG asset for image shape:', shape.id);
              assetSrc = shape.meta.svgDataUri;
              assets.push({
                id: shape.props.assetId,
                type: 'image',
                typeName: 'asset',
                props: {
                  name: `${shape.meta.title || 'mindmap'}.svg`,
                  src: assetSrc,
                  w: shape.props.w || 800,
                  h: shape.props.h || 600,
                  mimeType: 'image/svg+xml',
                  isAnimated: false,
                },
                meta: {},
              });
              continue;
            }
            
            // Check for local image data fallback
            if (!assetSrc && shape.meta?.imageData?.src) {
              console.log('Reconstructing general image asset from local storage:', shape.id);
              assetSrc = shape.meta.imageData.src;
            }
            
            // Create asset if we have a source
            if (assetSrc) {
              assets.push({
                id: shape.props.assetId,
                type: 'image',
                typeName: 'asset',
                props: {
                  name: shape.meta?.driveName || shape.meta?.imageData?.name || 'image.png',
                  src: assetSrc,
                  w: shape.meta?.w || shape.meta?.imageData?.w || shape.props.w || 800,
                  h: shape.meta?.h || shape.meta?.imageData?.h || shape.props.h || 600,
                  mimeType: shape.meta?.driveMimeType || shape.meta?.imageData?.mimeType || 'image/png',
                  isAnimated: false,
                },
                meta: {},
              });
            }
          }
        }
        
        // Add assets first, then shapes
        editor.store.mergeRemoteChanges(() => {
          if (assets.length > 0) {
            console.log('Recreating', assets.length, 'assets for image shapes');
            editor.store.put(assets);
          }
          
          if (shapes.length > 0) {
            editor.store.put(shapes);
          }
        });
        setTimeout(() => setPendingElements([]), 0);
      } catch (error) {
        console.error('Error loading pending elements:', error);
      } finally {
        isApplyingRemoteChange.current = false;
      }
    }

    // Setup element event listeners
    const bs = socketClient.getBoardSocket();
    console.log('[PendingElements] Registering listeners. boardSocket exists:', !!bs, 'connected:', bs?.connected);
    
    // Raw debug listener to verify events arrive at all
    const debugCreated = (data: any) => console.log('[DEBUG RAW] element:created received on boardSocket:', !!data, 'userId:', data?.userId);
    const debugUpdated = (data: any) => console.log('[DEBUG RAW] element:updated received on boardSocket:', !!data, 'userId:', data?.userId);
    bs?.on('element:created', debugCreated);
    bs?.on('element:updated', debugUpdated);
    
    socketClient.onElementCreated(handleElementCreated);
    socketClient.onElementUpdated(handleElementUpdated);
    socketClient.onElementDeleted(handleElementDeleted);

    return () => {
      bs?.off('element:created', debugCreated);
      bs?.off('element:updated', debugUpdated);
      socketClient.off('element:created', handleElementCreated);
      socketClient.off('element:updated', handleElementUpdated);
      socketClient.off('element:deleted', handleElementDeleted);
    };
  }, [editor, boardId, handleElementCreated, handleElementUpdated, handleElementDeleted, pendingElements, setPendingElements, isApplyingRemoteChange]);
};
