/**
 * Study Board Hooks
 * Custom hooks for study board functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStudyBoardStore } from '../stores/studyBoard.store';
import { studyBoardService } from '../services/studyBoard.service';
import type { StudyBoard, BoardElement } from '../types';

/**
 * Hook to access study board state and actions
 */
export const useStudyBoard = () => {
  const {
    currentBoard,
    boards,
    selectedElements,
    participants,
    syncStatus,
    setCurrentBoard,
    addElement,
    updateElement,
    removeElement,
    setSelectedElements,
    clearSelection,
    joinBoard,
    leaveBoard,
    broadcastUpdate,
  } = useStudyBoardStore();

  return {
    currentBoard,
    boards,
    selectedElements,
    participants,
    syncStatus,
    setCurrentBoard,
    addElement,
    updateElement,
    removeElement,
    setSelectedElements,
    clearSelection,
    joinBoard,
    leaveBoard,
    broadcastUpdate,
  };
};

/**
 * Hook to fetch all boards
 */
export const useBoards = () => {
  return useQuery({
    queryKey: ['boards'],
    queryFn: () => studyBoardService.getBoards(),
  });
};

/**
 * Hook to fetch single board
 */
export const useBoard = (boardId: string | undefined) => {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: () => studyBoardService.getBoard(boardId!),
    enabled: !!boardId,
  });
};

/**
 * Hook to create board
 */
export const useCreateBoard = () => {
  const queryClient = useQueryClient();
  const { addBoard } = useStudyBoardStore();
  
  return useMutation({
    mutationFn: (data: Partial<StudyBoard>) => studyBoardService.createBoard(data),
    onSuccess: (newBoard) => {
      // Add to store
      addBoard(newBoard);
      
      // Invalidate boards list
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

/**
 * Hook to update board
 */
export const useUpdateBoard = () => {
  const queryClient = useQueryClient();
  const { updateBoard } = useStudyBoardStore();
  
  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: Partial<StudyBoard> }) =>
      studyBoardService.updateBoard(boardId, data),
    onSuccess: (updatedBoard, variables) => {
      // Update in store
      updateBoard(variables.boardId, updatedBoard);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['boards', variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

/**
 * Hook to delete board
 */
export const useDeleteBoard = () => {
  const queryClient = useQueryClient();
  const { removeBoard } = useStudyBoardStore();
  
  return useMutation({
    mutationFn: (boardId: string) => studyBoardService.deleteBoard(boardId),
    onSuccess: (_, boardId) => {
      // Remove from store
      removeBoard(boardId);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });
};

/**
 * Hook to add element to board
 */
export const useAddElement = () => {
  const { addElement, broadcastUpdate } = useStudyBoardStore();
  
  return useMutation({
    mutationFn: ({ boardId, element }: { boardId: string; element: Partial<BoardElement> }) =>
      studyBoardService.addElement(boardId, element),
    onSuccess: (newElement) => {
      // Add to store
      addElement(newElement);
      
      // Broadcast to other users
      broadcastUpdate({
        action: 'add',
        element: newElement,
      });
    },
  });
};

/**
 * Hook to update element
 */
export const useUpdateElement = () => {
  const { updateElement, broadcastUpdate } = useStudyBoardStore();
  
  return useMutation({
    mutationFn: ({
      boardId,
      elementId,
      data,
    }: {
      boardId: string;
      elementId: string;
      data: Partial<BoardElement>;
    }) => studyBoardService.updateElement(boardId, elementId, data),
    onSuccess: (updatedElement, variables) => {
      // Update in store
      updateElement(variables.elementId, updatedElement);
      
      // Broadcast to other users
      broadcastUpdate({
        action: 'update',
        element: updatedElement,
      });
    },
  });
};

/**
 * Hook to delete element
 */
export const useDeleteElement = () => {
  const { removeElement, broadcastUpdate } = useStudyBoardStore();
  
  return useMutation({
    mutationFn: ({ boardId, elementId }: { boardId: string; elementId: string }) =>
      studyBoardService.deleteElement(boardId, elementId),
    onSuccess: (_, variables) => {
      // Remove from store
      removeElement(variables.elementId);
      
      // Broadcast to other users
      broadcastUpdate({
        action: 'delete',
        elementId: variables.elementId,
      });
    },
  });
};

/**
 * Hook to invite user to board
 */
export const useInviteUser = () => {
  return useMutation({
    mutationFn: ({
      boardId,
      email,
      role,
    }: {
      boardId: string;
      email: string;
      role: 'editor' | 'viewer';
    }) => studyBoardService.inviteUser(boardId, email, role),
  });
};

/**
 * Hook to fetch board members (participants)
 */
export const useBoardParticipants = (boardId: string | undefined) => {
  return useQuery({
    queryKey: ['boards', boardId, 'members'],
    queryFn: () => studyBoardService.getMembers(boardId!),
    enabled: !!boardId,
  });
};
