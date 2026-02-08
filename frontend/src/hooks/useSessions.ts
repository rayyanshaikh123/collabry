/**
 * React Query hooks for Study Buddy Sessions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsService, type Message, type ChatSession } from '../services/sessions.service';
import { useAuthStore } from '../stores/auth.store';

export function useSessions() {
  const { user, isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: () => sessionsService.getSessions(),
    enabled: !!user && isAuthenticated,
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('credentials')) return false;
      return failureCount < 2;
    },
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: (title: string) => sessionsService.createSession(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
    },
  });
}

export function useSessionMessages(sessionId: string) {
  const { user, isAuthenticated } = useAuthStore();
  
  return useQuery({
    queryKey: ['session-messages', sessionId],
    queryFn: () => sessionsService.getSessionMessages(sessionId),
    enabled: !!user && isAuthenticated && !!sessionId,
    staleTime: 60000, // Consider data fresh for 60 seconds
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });
}

export function useSaveMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: Message }) =>
      sessionsService.saveMessage(sessionId, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-messages', variables.sessionId] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: (sessionId: string) => sessionsService.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] });
    },
  });
}

export function useClearSessionMessages() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sessionId: string) => sessionsService.clearSessionMessages(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['session-messages', sessionId] });
    },
  });
}
