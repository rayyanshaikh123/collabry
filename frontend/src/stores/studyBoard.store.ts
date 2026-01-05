/**
 * Study Board Store (Zustand)
 * Manages study board state and realtime collaboration
 */

import { create } from 'zustand';
import type {
  StudyBoard,
  BoardElement,
  BoardParticipant,
  CursorPosition,
} from '../types';
import { studyBoardService } from '../services/studyBoard.service';
import { socketClient } from '../lib/socket';

interface StudyBoardState {
  // State
  activeBoard: StudyBoard | null;
  boards: StudyBoard[];
  selectedElements: string[];
  participants: BoardParticipant[];
  cursors: Map<string, CursorPosition>;
  syncStatus: 'synced' | 'syncing' | 'conflict' | 'error';
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveBoard: (board: StudyBoard | null) => void;
  setBoards: (boards: StudyBoard[]) => void;
  addBoard: (board: StudyBoard) => void;
  updateBoard: (boardId: string, updates: Partial<StudyBoard>) => void;
  removeBoard: (boardId: string) => void;
  
  // Element actions
  addElement: (element: BoardElement) => void;
  updateElement: (elementId: string, updates: Partial<BoardElement>) => void;
  removeElement: (elementId: string) => void;
  setSelectedElements: (elementIds: string[]) => void;
  clearSelection: () => void;
  
  // Participant actions
  setParticipants: (participants: BoardParticipant[]) => void;
  addParticipant: (participant: BoardParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipantCursor: (userId: string, cursor: CursorPosition) => void;
  
  // Sync actions
  setSyncStatus: (status: 'synced' | 'syncing' | 'conflict' | 'error') => void;
  
  // API actions
  fetchBoards: () => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  createBoard: (data: Partial<StudyBoard>) => Promise<StudyBoard>;
  saveBoard: (boardId: string, updates: Partial<StudyBoard>) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  
  // Realtime actions
  joinBoard: (boardId: string) => void;
  leaveBoard: (boardId: string) => void;
  broadcastUpdate: (update: any) => void;
  
  clearError: () => void;
}

export const useStudyBoardStore = create<StudyBoardState>((set, get) => ({
  // Initial state
  activeBoard: null,
  boards: [],
  selectedElements: [],
  participants: [],
  cursors: new Map(),
  syncStatus: 'synced',
  isLoading: false,
  error: null,

  // Set active board
  setActiveBoard: (board: StudyBoard | null) => {
    set({ activeBoard: board });
  },

  // Set boards
  setBoards: (boards: StudyBoard[]) => {
    set({ boards });
  },

  // Add board
  addBoard: (board: StudyBoard) => {
    set((state) => ({
      boards: [...state.boards, board],
    }));
  },

  // Update board
  updateBoard: (boardId: string, updates: Partial<StudyBoard>) => {
    set((state) => ({
      boards: state.boards.map((b) =>
        b.id === boardId ? { ...b, ...updates } : b
      ),
      activeBoard:
        state.activeBoard?.id === boardId
          ? { ...state.activeBoard, ...updates }
          : state.activeBoard,
    }));
  },

  // Remove board
  removeBoard: (boardId: string) => {
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== boardId),
      activeBoard: state.activeBoard?.id === boardId ? null : state.activeBoard,
    }));
  },

  // Add element
  addElement: (element: BoardElement) => {
    set((state) => {
      if (!state.activeBoard) return state;
      
      return {
        activeBoard: {
          ...state.activeBoard,
          elements: [...state.activeBoard.elements, element],
        },
      };
    });
  },

  // Update element
  updateElement: (elementId: string, updates: Partial<BoardElement>) => {
    set((state) => {
      if (!state.activeBoard) return state;
      
      return {
        activeBoard: {
          ...state.activeBoard,
          elements: state.activeBoard.elements.map((el) =>
            el.id === elementId ? { ...el, ...updates } : el
          ),
        },
      };
    });
  },

  // Remove element
  removeElement: (elementId: string) => {
    set((state) => {
      if (!state.activeBoard) return state;
      
      return {
        activeBoard: {
          ...state.activeBoard,
          elements: state.activeBoard.elements.filter((el) => el.id !== elementId),
        },
        selectedElements: state.selectedElements.filter((id) => id !== elementId),
      };
    });
  },

  // Set selected elements
  setSelectedElements: (elementIds: string[]) => {
    set({ selectedElements: elementIds });
  },

  // Clear selection
  clearSelection: () => {
    set({ selectedElements: [] });
  },

  // Set participants
  setParticipants: (participants: BoardParticipant[]) => {
    set({ participants });
  },

  // Add participant
  addParticipant: (participant: BoardParticipant) => {
    set((state) => ({
      participants: [...state.participants, participant],
    }));
  },

  // Remove participant
  removeParticipant: (userId: string) => {
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
      cursors: new Map([...state.cursors].filter(([id]) => id !== userId)),
    }));
  },

  // Update participant cursor
  updateParticipantCursor: (userId: string, cursor: CursorPosition) => {
    set((state) => {
      const newCursors = new Map(state.cursors);
      newCursors.set(userId, cursor);
      return { cursors: newCursors };
    });
  },

  // Set sync status
  setSyncStatus: (status: 'synced' | 'syncing' | 'conflict' | 'error') => {
    set({ syncStatus: status });
  },

  // Fetch all boards
  fetchBoards: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const boards = await studyBoardService.getBoards();
      set({ boards, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch boards',
        isLoading: false,
      });
    }
  },

  // Fetch single board
  fetchBoard: async (boardId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const board = await studyBoardService.getBoard(boardId);
      set({ activeBoard: board, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch board',
        isLoading: false,
      });
    }
  },

  // Create board
  createBoard: async (data: Partial<StudyBoard>) => {
    set({ isLoading: true, error: null });
    
    try {
      const newBoard = await studyBoardService.createBoard(data);
      get().addBoard(newBoard);
      set({ isLoading: false });
      return newBoard;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create board',
        isLoading: false,
      });
      throw error;
    }
  },

  // Save board
  saveBoard: async (boardId: string, updates: Partial<StudyBoard>) => {
    set({ syncStatus: 'syncing' });
    
    try {
      const updatedBoard = await studyBoardService.updateBoard(boardId, updates);
      get().updateBoard(boardId, updatedBoard);
      set({ syncStatus: 'synced' });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to save board',
        syncStatus: 'error',
      });
      throw error;
    }
  },

  // Delete board
  deleteBoard: async (boardId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await studyBoardService.deleteBoard(boardId);
      get().removeBoard(boardId);
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to delete board',
        isLoading: false,
      });
      throw error;
    }
  },

  // Join board (realtime)
  joinBoard: (boardId: string) => {
    // TODO: Emit socket event to join board room
    socketClient.joinBoard(boardId);
  },

  // Leave board (realtime)
  leaveBoard: (boardId: string) => {
    // TODO: Emit socket event to leave board room
    socketClient.leaveBoard(boardId);
  },

  // Broadcast update (realtime)
  broadcastUpdate: (update: any) => {
    const { activeBoard } = get();
    if (!activeBoard) return;
    
    // TODO: Emit socket event with update
    socketClient.sendBoardUpdate(activeBoard.id, update);
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

// Selectors
export const selectActiveBoard = (state: StudyBoardState) => state.activeBoard;
export const selectBoards = (state: StudyBoardState) => state.boards;
export const selectSelectedElements = (state: StudyBoardState) => state.selectedElements;
export const selectParticipants = (state: StudyBoardState) => state.participants;
export const selectSyncStatus = (state: StudyBoardState) => state.syncStatus;
