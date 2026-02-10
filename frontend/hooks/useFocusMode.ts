/**
 * Focus Mode Hooks
 * Custom hooks for focus sessions and timer
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusModeStore } from '@/lib/stores/focusMode.store';
import { focusService } from '@/lib/services/focus.service';
import type { FocusSession, FocusSettings } from '@/types';

/**
 * Hook to access focus mode state and actions
 */
export const useFocusMode = () => {
  const {
    activeSession,
    elapsed,
    isTimerRunning,
    settings,
    stats,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = useFocusModeStore();

  return {
    activeSession,
    elapsed,
    isTimerRunning,
    settings,
    stats,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  };
};

/**
 * Hook to fetch focus sessions
 */
export const useFocusSessions = (filters?: any) => {
  return useQuery({
    queryKey: ['focus', 'sessions', filters],
    queryFn: () => focusService.getSessions(filters),
  });
};

/**
 * Hook to fetch single session
 */
export const useFocusSession = (sessionId: string | undefined) => {
  return useQuery({
    queryKey: ['focus', 'sessions', sessionId],
    queryFn: () => focusService.getSession(sessionId!),
    enabled: !!sessionId,
  });
};

/**
 * Hook to start focus session
 */
export const useStartSession = () => {
  const queryClient = useQueryClient();
  const { setActiveSession, startTimer, setElapsed } = useFocusModeStore();
  
  return useMutation({
    mutationFn: (data: Partial<FocusSession>) => focusService.startSession(data),
    onSuccess: (newSession) => {
      // Set active session
      setActiveSession(newSession);
      setElapsed(0);
      
      // Start timer
      startTimer();
      
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: ['focus', 'sessions'] });
    },
  });
};

/**
 * Hook to pause session
 */
export const usePauseSession = () => {
  const { pauseTimer, updateSession } = useFocusModeStore();
  
  return useMutation({
    mutationFn: (sessionId: string) => focusService.pauseSession(sessionId),
    onSuccess: (pausedSession, sessionId) => {
      // Pause timer
      pauseTimer();
      
      // Update session
      updateSession(sessionId, pausedSession);
    },
  });
};

/**
 * Hook to resume session
 */
export const useResumeSession = () => {
  const { resumeTimer, updateSession } = useFocusModeStore();
  
  return useMutation({
    mutationFn: (sessionId: string) => focusService.resumeSession(sessionId),
    onSuccess: (resumedSession, sessionId) => {
      // Resume timer
      resumeTimer();
      
      // Update session
      updateSession(sessionId, resumedSession);
    },
  });
};

/**
 * Hook to complete session
 */
export const useCompleteSession = () => {
  const queryClient = useQueryClient();
  const { stopTimer, setActiveSession, updateSession } = useFocusModeStore();
  
  return useMutation({
    mutationFn: ({
      sessionId,
      productivity,
      notes,
    }: {
      sessionId: string;
      productivity?: number;
      notes?: string;
    }) => focusService.completeSession(sessionId, productivity, notes),
    onSuccess: (completedSession, variables) => {
      // Stop timer
      stopTimer();
      
      // Clear active session
      setActiveSession(null);
      
      // Update session
      updateSession(variables.sessionId, completedSession);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['focus', 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['focus', 'stats'] });
    },
  });
};

/**
 * Hook to cancel session
 */
export const useCancelSession = () => {
  const queryClient = useQueryClient();
  const { stopTimer, setActiveSession } = useFocusModeStore();
  
  return useMutation({
    mutationFn: (sessionId: string) => focusService.cancelSession(sessionId),
    onSuccess: () => {
      // Stop timer
      stopTimer();
      
      // Clear active session
      setActiveSession(null);
      
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: ['focus', 'sessions'] });
    },
  });
};

/**
 * Hook to fetch focus settings
 */
export const useFocusSettings = () => {
  return useQuery({
    queryKey: ['focus', 'settings'],
    queryFn: () => focusService.getSettings(),
  });
};

/**
 * Hook to update focus settings
 */
export const useUpdateFocusSettings = () => {
  const queryClient = useQueryClient();
  const { setSettings } = useFocusModeStore();
  
  return useMutation({
    mutationFn: (data: Partial<FocusSettings>) => focusService.updateSettings(data),
    onSuccess: (updatedSettings) => {
      // Update in store
      setSettings(updatedSettings);
      
      // Invalidate query
      queryClient.invalidateQueries({ queryKey: ['focus', 'settings'] });
    },
  });
};

/**
 * Hook to fetch focus statistics
 */
export const useFocusStats = (period?: 'day' | 'today' | 'week' | 'month' | 'year' | 'all') => {
  const normalizedPeriod = period === 'day' ? 'today' : period;

  return useQuery({
    queryKey: ['focus', 'stats', normalizedPeriod],
    queryFn: () => focusService.getStats(normalizedPeriod),
  });
};
