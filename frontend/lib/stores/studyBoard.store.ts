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
} from '@/types';
import { studyBoardService } from '@/lib/services/studyBoard.service';

interface StudyBoardState {
  // State
  currentBoard: StudyBoard | null;
  boards: StudyBoard[];
  selectedElements: string[];
  participants: BoardParticipant[];
  cursors: Record<string, CursorPosition>;
  syncStatus: 'synced' | 'syncing' | 'conflict' | 'error';
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentBoard: (board: StudyBoard | null) => void;
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
  updateCursor: (userId: string, position: CursorPosition) => void;
  
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
  currentBoard: null,
  boards: [],
  selectedElements: [],
  participants: [],
  cursors: {},
  syncStatus: 'synced',
  isLoading: false,
  error: null,

  // Set current board
  setCurrentBoard: (board: StudyBoard | null) => {
    set({ currentBoard: board });
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
      currentBoard:
        state.currentBoard?.id === boardId
          ? { ...state.currentBoard, ...updates }
          : state.currentBoard,
    }));
  },

  // Remove board
  removeBoard: (boardId: string) => {
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== boardId),
      currentBoard: state.currentBoard?.id === boardId ? null : state.currentBoard,
    }));
  },

  // Add element
  addElement: (element: BoardElement) => {
    set((state) => {
      if (!state.currentBoard) return state;
      
      return {
        currentBoard: {
          ...state.currentBoard,
          elements: [...(state.currentBoard.elements || []), element],
        },
      };
    });
  },

  // Update element
  updateElement: (elementId: string, updates: Partial<BoardElement>) => {
    set((state) => {
      if (!state.currentBoard) return state;
      
      return {
        currentBoard: {
          ...state.currentBoard,
          elements: (state.currentBoard.elements || []).map((el) =>
            el.id === elementId ? { ...el, ...updates } : el
          ),
        },
      };
    });
  },

  // Remove element
  removeElement: (elementId: string) => {
    set((state) => {
      if (!state.currentBoard) return state;
      
      return {
        currentBoard: {
          ...state.currentBoard,
          elements: (state.currentBoard.elements || []).filter((el) => el.id !== elementId),
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

  // Add participant (prevent duplicates)
  addParticipant: (participant: BoardParticipant) => {
    set((state) => {
      // Check if participant already exists
      const exists = state.participants.some(p => p.userId === participant.userId);
      if (exists) {
        console.log('[StudyBoardStore] Participant already exists:', participant.userId);
        return state;
      }
      return {
        participants: [...state.participants, participant],
      };
    });
  },

  // Remove participant
  removeParticipant: (userId: string) => {
    set((state) => {
      const newCursors = { ...state.cursors };
      delete newCursors[userId];
      return {
        participants: state.participants.filter((p) => p.userId !== userId),
        cursors: newCursors
      };
    });
  },

  // Update cursor
  updateCursor: (userId: string, position: CursorPosition) => {
    set((state) => ({
      cursors: {
        ...state.cursors,
        [userId]: position
      }
    }));
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
      set({ currentBoard: board, isLoading: false });
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

  // Board sync is now handled by Yjs (useYjsSync hook)
  joinBoard: (_boardId: string) => { /* no-op */ },
  leaveBoard: (_boardId: string) => { /* no-op */ },
  broadcastUpdate: (_update: any) => { /* no-op */ },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

// Selectors
export const selectActiveBoard = (state: StudyBoardState) => state.currentBoard;
export const selectBoards = (state: StudyBoardState) => state.boards;
export const selectSelectedElements = (state: StudyBoardState) => state.selectedElements;
export const selectParticipants = (state: StudyBoardState) => state.participants;
export const selectSyncStatus = (state: StudyBoardState) => state.syncStatus;
