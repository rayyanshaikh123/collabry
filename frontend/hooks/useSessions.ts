/**
 * React Query hooks for Study Buddy Sessions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsService, type Message, type ChatSession } from '@/lib/services/sessions.service';
import { useAuthStore } from '@/lib/stores/auth.store';

export function useSessions() {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  
  return useQuery({
    queryKey: ['sessions', user?.id],
    queryFn: () => sessionsService.getSessions(),
    enabled: !!user && isAuthenticated && !!accessToken,
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
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const enabled = !!user && isAuthenticated && !!accessToken && !!sessionId;

  console.log('[PERSISTENCE DEBUG] useSessionMessages:', { 
    sessionId, 
    enabled, 
    hasUser: !!user, 
    isAuthenticated, 
    hasAccessToken: !!accessToken 
  });
  
  return useQuery({
    queryKey: ['session-messages', sessionId],
    queryFn: () => {
      console.log('[PERSISTENCE DEBUG] Fetching messages for session:', sessionId);
      return sessionsService.getSessionMessages(sessionId);
    },
    enabled,
    staleTime: 60000, // Consider data fresh for 60 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: 'always', // Always fetch on mount to restore messages after page reload
    retry: 1, // Retry once on failure
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
