'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils, TLRecord, TLStoreSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { Button } from '../components/UIElements';
import { ICONS } from '../constants';
import { useAuthStore } from '../src/stores/auth.store';
import { useStudyBoardStore } from '../src/stores/studyBoard.store';
import { socketClient } from '../src/lib/socket';
import { useRouter, useParams } from 'next/navigation';
import VoiceChat from '../components/VoiceChat';
import InviteMemberModal from '../components/InviteMemberModal';
import BoardSettingsModal from '../components/BoardSettingsModal';
import { studyBoardService } from '../src/services/studyBoard.service';

const CollaborativeBoard: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const boardId = params?.id as string;
  
  const { user } = useAuthStore();
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
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const isApplyingRemoteChange = useRef(false);
  const [editor, setEditor] = useState<any>(null);
  const [pendingElements, setPendingElements] = useState<any[]>([]);

  // Handle tldraw editor mount
  const handleMount = useCallback((editorInstance: any) => {
    console.log('[StudyBoard] Tldraw editor mounted');
    setEditor(editorInstance);
  }, []);

  // Sync tldraw store changes to other users via editor
  useEffect(() => {
    if (!editor || !boardId || !isConnected) return;

    console.log('[StudyBoard] Setting up editor store listener for boardId:', boardId);

    const handleStoreChange = (event: any) => {
      console.log('[StudyBoard] *** STORE CHANGE CALLBACK FIRED ***', event);
      
      // Don't broadcast changes that came from remote
      if (isApplyingRemoteChange.current) {
        console.log('[StudyBoard] Skipping - remote change');
        return;
      }
      
      // Ensure changes object exists - tldraw wraps it in event.changes
      const changes = event?.changes;
      if (!changes) {
        return;
      }

      const { added, updated, removed } = changes;
      
      // Check if there are any actual shape changes
      const hasShapeChanges = 
        (added && Object.values(added).some((r: any) => r?.typeName === 'shape')) ||
        (updated && Object.values(updated).some(([_, r]: any) => r?.typeName === 'shape')) ||
        (removed && Object.values(removed).some((r: any) => r?.typeName === 'shape'));
      
      if (!hasShapeChanges) {
        return; // Skip non-shape changes
      }
      
      console.log('[StudyBoard] Shape change detected:', {
        added: added ? Object.keys(added).length : 0,
        updated: updated ? Object.keys(updated).length : 0,
        removed: removed ? Object.keys(removed).length : 0,
        changesSample: { added, updated, removed }
      });

      // Broadcast added records
      if (added) {
        Object.values(added).forEach((record: any) => {
          if (record?.typeName === 'shape') {
            console.log('[StudyBoard] Broadcasting element:create', record.id, record.type);
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
            }, (response) => {
              if (response.error) {
                console.error('[StudyBoard] Failed to create element:', response.error);
              } else {
                console.log('[StudyBoard] Element created successfully:', response);
              }
            });
          }
        });
      }

      // Broadcast updated records
      if (updated) {
        Object.values(updated).forEach(([from, to]: any) => {
          if (to?.typeName === 'shape') {
            // Only send the changed properties
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
              console.log('[StudyBoard] Broadcasting element:update', to.id, changeSet);
              socketClient.updateElement(boardId, to.id, changeSet, (response) => {
                if (response.error) {
                  console.error('[StudyBoard] Failed to update element:', response.error);
                } else {
                  console.log('[StudyBoard] Element updated successfully:', response);
                }
              });
            }
          }
        });
      }

      // Broadcast removed records
      if (removed) {
        Object.values(removed).forEach((record: any) => {
          if (record?.typeName === 'shape') {
            console.log('[StudyBoard] Broadcasting element:delete', record.id);
            socketClient.deleteElement(boardId, record.id, (response) => {
              if (response.error) {
                console.error('[StudyBoard] Failed to delete element:', response.error);
              } else {
                console.log('[StudyBoard] Element deleted successfully:', response);
              }
            });
          }
        });
      }
    };

    // Listen to store changes - remove source filter to capture all changes
    console.log('[StudyBoard] Setting up editor store listener');
    const dispose = editor.store.listen(handleStoreChange, { 
      scope: 'document' 
    });

    return () => {
      console.log('[StudyBoard] Disposing editor store listener');
      dispose();
    };
  }, [editor, boardId, isConnected]);

  // Initialize board connection
  useEffect(() => {
    if (!boardId || !user) return;

    const initBoard = async () => {
      try {
        setIsLoading(true);
        
        // Connect to board socket
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }

        socketClient.connectBoards(token);

        // Join board room
        socketClient.joinBoard(boardId, (response: any) => {
          if (response.error) {
            console.error('Failed to join board:', response.error);
            alert(response.error);
            router.push('/dashboard');
            return;
          }

          console.log('[StudyBoard] Joined board:', response.board);
          setCurrentBoard(response.board);
          
          // Store elements to load them when editor is ready
          if (response.board?.elements && response.board.elements.length > 0) {
            console.log('[StudyBoard] Storing', response.board.elements.length, 'elements to load when editor is ready');
            setPendingElements(response.board.elements);
          } else {
            console.log('[StudyBoard] No existing elements to load');
          }
          
          // Set initial participants
          response.participants?.forEach((p: any) => {
            if (p.userId !== user.id) {
              addParticipant({
                userId: p.userId,
                name: p.email,
                color: p.color,
                isActive: true
              });
            }
          });

          setIsConnected(true);
          setIsLoading(false);
        });

        // Listen for other users joining
        socketClient.onUserJoined((data: any) => {
          console.log('User joined:', data);
          // Don't add yourself to the participants list
          if (data.userId !== user.id) {
            addParticipant({
              userId: data.userId,
              name: data.email,
              color: data.color,
              isActive: true
            });
          }
        });

        // Listen for users leaving
        socketClient.onUserLeft((data: any) => {
          console.log('User left:', data);
          removeParticipant(data.userId);
        });

        // Listen for cursor movements
        socketClient.onCursorMove((data: any) => {
          updateCursor(data.userId, data.position);
        });

      } catch (error) {
        console.error('Failed to initialize board:', error);
        setIsLoading(false);
      }
    };

    initBoard();

    // Cleanup on unmount
    return () => {
      if (boardId) {
        socketClient.leaveBoard(boardId);
      }
    };
  }, [boardId, user, router, setCurrentBoard, addParticipant, removeParticipant, updateCursor]);

  // Setup element event listeners separately - only when editor is ready
  useEffect(() => {
    if (!editor || !boardId) return;

    console.log('[StudyBoard] Setting up element event listeners');

    // Load pending elements when editor becomes ready (only once)
    if (pendingElements.length > 0) {
      console.log('[StudyBoard] Loading', pendingElements.length, 'pending elements into editor');
      console.log('[StudyBoard] Pending elements sample:', pendingElements[0]);
      isApplyingRemoteChange.current = true;
      
      try {
        // Validate and filter elements before loading
        const validElements = pendingElements.filter((el: any) => {
          const isValid = el && el.id && el.type;
          if (!isValid) {
            console.warn('[StudyBoard] Skipping invalid element:', el);
          }
          return isValid;
        });

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
        
        console.log(`[StudyBoard] Adding ${shapes.length} valid shapes to editor (filtered ${pendingElements.length - validElements.length} invalid)`);
        if (shapes.length > 0) {
          console.log('[StudyBoard] First shape:', shapes[0]);
          editor.store.put(shapes);
        }
        // Clear pending elements after loading
        setTimeout(() => setPendingElements([]), 0);
      } catch (error) {
        console.error('[StudyBoard] Error loading pending elements:', error);
      } finally {
        setTimeout(() => {
          isApplyingRemoteChange.current = false;
        }, 100);
      }
    }

    // Listen for element changes
    const handleElementCreated = (data: any) => {
      console.log('[StudyBoard] Element created by another user:', data);
      
      if (!editor) {
        console.warn('[StudyBoard] Editor not ready, skipping creation');
        return;
      }
      
      // Skip if this shape already exists
      if (editor.store.get(data.element.id)) {
        console.log('[StudyBoard] Shape already exists, skipping');
        return;
      }
      
      isApplyingRemoteChange.current = true;
      
      try {
        // Create the shape in tldraw store
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
        
        console.log('[StudyBoard] Adding shape to store:', shapeRecord);
        editor.store.put([shapeRecord]);
      } catch (error) {
        console.error('[StudyBoard] Error adding remote shape:', error);
      } finally {
        // Use setTimeout to ensure the flag is reset after the store has processed
        setTimeout(() => {
          isApplyingRemoteChange.current = false;
        }, 0);
      }
    };

    const handleElementUpdated = (data: any) => {
      console.log('[StudyBoard] Element updated by another user:', data);
      
      if (!editor) {
        console.warn('[StudyBoard] Editor not ready, skipping update');
        return;
      }
      
      isApplyingRemoteChange.current = true;
      
      try {
        const existing = editor.store.get(data.elementId);
        if (existing) {
          console.log('[StudyBoard] Updating existing shape:', data.elementId, data.changes);
          editor.store.put([{
            ...existing,
            ...data.changes,
          }]);
        } else {
          console.warn('[StudyBoard] Cannot update non-existent shape:', data.elementId);
        }
      } catch (error) {
        console.error('[StudyBoard] Error updating remote shape:', error);
      } finally {
        setTimeout(() => {
          isApplyingRemoteChange.current = false;
        }, 0);
      }
    };

    const handleElementDeleted = (data: any) => {
      console.log('[StudyBoard] Element deleted by another user:', data);
      
      if (!editor) {
        console.warn('[StudyBoard] Editor not ready, skipping deletion');
        return;
      }
      
      isApplyingRemoteChange.current = true;
      
      try {
        if (editor.store.get(data.elementId)) {
          console.log('[StudyBoard] Removing shape from store:', data.elementId);
          editor.store.remove([data.elementId]);
        }
      } catch (error) {
        console.error('[StudyBoard] Error deleting remote shape:', error);
      } finally {
        setTimeout(() => {
          isApplyingRemoteChange.current = false;
        }, 0);
      }
    };

    // Register listeners
    socketClient.onElementCreated(handleElementCreated);
    socketClient.onElementUpdated(handleElementUpdated);
    socketClient.onElementDeleted(handleElementDeleted);

    // Cleanup - remove these specific listeners on unmount
    return () => {
      console.log('[StudyBoard] Cleaning up element event listeners');
      socketClient.offBoardEvent('element:created', handleElementCreated);
      socketClient.offBoardEvent('element:updated', handleElementUpdated);
      socketClient.offBoardEvent('element:deleted', handleElementDeleted);
    };
  }, [editor, boardId]); // Removed pendingElements to prevent re-run after clearing

  // Handle cursor movement
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!boardId || !isConnected) return;
    
    // Throttle cursor updates
    const now = Date.now();
    if ((window as any).lastCursorUpdate && now - (window as any).lastCursorUpdate < 50) {
      return;
    }
    (window as any).lastCursorUpdate = now;

    const canvas = (e.target as HTMLElement).closest('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      socketClient.sendCursorPosition(boardId, { x, y });
    }
  }, [boardId, isConnected]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [handlePointerMove]);

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
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-slate-50 overflow-hidden">
      {/* Board Header */}
      <div className="bg-white/80 backdrop-blur-md border-b-2 border-slate-100 px-8 py-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-5">
          <Button 
            variant="secondary" 
            size="icon" 
            className="rounded-2xl h-10 w-10 border-b-2"
            onClick={() => router.push('/dashboard')}
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
              {participants.length > 0 
                ? `${participants.length} other${participants.length > 1 ? 's' : ''} studying here`
                : 'You are alone in this board'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Participant Avatars */}
          <div className="flex -space-x-3 mr-4">
            {participants.slice(0, 3).map((p, i) => (
              <div 
                key={`${p.userId}-${i}`}
                className="w-10 h-10 rounded-2xl border-4 border-white flex items-center justify-center text-white font-black text-xs shadow-md"
                style={{ backgroundColor: p.color }}
                title={p.name}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {participants.length > 3 && (
              <div className="w-10 h-10 rounded-2xl border-4 border-white bg-indigo-500 text-[11px] font-black text-white flex items-center justify-center shadow-md">
                +{participants.length - 3}
              </div>
            )}
          </div>
          <Button 
            variant={showVoiceChat ? 'primary' : 'outline'} 
            className="gap-2 px-6 relative"
            onClick={() => setShowVoiceChat(!showVoiceChat)}
          >
            <ICONS.Phone size={18} /> Voice Chat
            {isVoiceChatActive && !showVoiceChat && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white"></span>
            )}
          </Button>
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
        <div className={`flex-1 relative transition-all duration-300 ${showVoiceChat ? 'mr-80' : ''}`}>
          <Tldraw 
            store={store}
            autoFocus
            onMount={handleMount}
          />
          
          {/* Live Cursors Overlay */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {Object.entries(cursors).map(([userId, cursor]) => {
              const participant = participants.find(p => p.userId === userId);
              if (!participant) return null;
              
              return (
                <div
                  key={userId}
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
            })}
          </div>
        </div>

        {/* Voice Chat Sidebar */}
        <div className={`absolute top-0 right-0 bottom-0 w-80 bg-white border-l-2 border-slate-200 shadow-2xl z-30 overflow-hidden flex flex-col transition-transform duration-300 ${showVoiceChat ? 'translate-x-0' : 'translate-x-full'}`}>
          <VoiceChat 
            boardId={boardId} 
            onClose={() => setShowVoiceChat(false)}
            onJoinCall={() => setIsVoiceChatActive(true)}
            onLeaveCall={() => setIsVoiceChatActive(false)}
          />
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
            console.log('Invitation sent successfully');
          } catch (error: any) {
            console.error('Failed to send invitation:', error);
            throw error; // Re-throw so modal can catch it
          }
        }}
      />

      {currentBoard && (
        <BoardSettingsModal
          board={currentBoard}
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
