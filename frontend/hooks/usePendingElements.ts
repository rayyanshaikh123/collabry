import { useEffect, MutableRefObject } from 'react';
import type { Editor } from 'tldraw';
import { sanitizeShape, buildShapesFromImport } from './useBoardShapes';

interface UsePendingElementsProps {
  editor: Editor | null;
  boardId: string | null;
  isConnected: boolean;
  pendingElements: any[];
  setPendingElements: (elements: any[]) => void;
  isApplyingRemoteChange: MutableRefObject<boolean>;
  importPayloadRef: MutableRefObject<any>;
  importAppliedRef: MutableRefObject<boolean>;
}

/**
 * Hook to apply pending elements (from initial load or templates) to the store.
 * Real-time synchronization is handled separately by useBoardSync.
 */
export const usePendingElements = ({
  editor,
  boardId,
  isConnected,
  pendingElements,
  setPendingElements,
  isApplyingRemoteChange,
  importPayloadRef,
  importAppliedRef
}: UsePendingElementsProps) => {
  useEffect(() => {
    if (!editor || !isConnected || !boardId) return;

    // 1. Process pending elements from initial load
    if (pendingElements.length > 0) {
      console.log('--- Applying Pending Elements ---', pendingElements.length);
      isApplyingRemoteChange.current = true;

      try {
        const validElements = pendingElements.filter(el => el && el.id && el.type);
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

        // Handle image assets for pending elements
        validElements.forEach((el: any) => {
          if (el.type === 'image' && el.props?.assetId) {
            let assetSrc = null;
            if (el.meta?.svgDataUri) assetSrc = el.meta.svgDataUri;
            else if (el.meta?.imageData?.src) assetSrc = el.meta.imageData.src;

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
        });

        if (shapes.length > 0) {
          editor.store.put(shapes);
        }

        // Clear pending elements after applying
        setTimeout(() => setPendingElements([]), 0);
      } catch (error) {
        console.error('Error applying pending elements:', error);
      } finally {
        setTimeout(() => {
          isApplyingRemoteChange.current = false;
        }, 100);
      }
    }

    // 2. Process imported artifacts (mindmaps, etc.)
    if (importPayloadRef.current && !importAppliedRef.current) {
      const applyImport = async () => {
        isApplyingRemoteChange.current = true;
        importAppliedRef.current = true;

        try {
          console.log('Applying imported shapes to board...');
          const { shapes, assets } = await buildShapesFromImport(importPayloadRef.current);

          if (assets && assets.length > 0) {
            editor.store.put(assets);
          }

          if (shapes && shapes.length > 0) {
            editor.store.put(shapes);
            editor.zoomToSelection();
          }
        } catch (error) {
          console.error('Error applying imported shapes:', error);
        } finally {
          setTimeout(() => {
            isApplyingRemoteChange.current = false;
          }, 500);
        }
      };

      applyImport();
    }
  }, [editor, isConnected, boardId, pendingElements, setPendingElements, importPayloadRef, importAppliedRef, isApplyingRemoteChange]);
};
