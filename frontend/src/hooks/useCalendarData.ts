/**
 * FRONTEND: Calendar React Query Hooks
 * File: frontend/src/hooks/useCalendarData.ts
 * 
 * Purpose: Data fetching hooks for Smart Calendar
 * Pattern: React Query (same as useStudyPlanner.ts)
 * 
 * Provides:
 * 1. useTasksByDateRange - Get tasks in time window
 * 2. useTimeBlockConflicts - Get all conflicts for plan
 * 3. useSuggestTimeSlot - Get available slot suggestions
 * 4. useRescheduleTaskSmart - Reschedule with server-side conflict check
 * 5. useAutoSchedulePlan - Run scheduling algorithm
 * 6. useResolveConflict - Auto-resolve conflicting tasks
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import axios from '@/lib/axios'; // Assume existing axios instance

// ============================================================================
// TYPES
// ============================================================================

export interface TaskTimeBlock {
  _id: string;
  planId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  timeSlotStart: string; // ISO datetime
  timeSlotEnd: string;
  duration: number; // minutes
  hasConflict: boolean;
  conflictCount: number;
}

export interface ConflictData {
  _id: string;
  task1Id: string;
  task2Id: string;
  conflictType: 'direct_overlap' | 'partial_overlap' | 'edge_case';
  overlappingMinutes: number;
  severity: 'low' | 'medium' | 'high';
  resolutionStatus: 'detected' | 'user_notified' | 'auto_resolved' | 'user_resolved';
}

export interface SlotSuggestion {
  start: string; // ISO datetime
  end: string;
  score: number; // 4-10, where 10 is best time
}

export interface AutoScheduleResult {
  success: boolean;
  allocated: Record<string, { start: string; end: string }>;
  conflicts: Array<{ taskId1: string; taskId2: string; overlapMinutes: number }>;
  stats: {
    totalTasks: number;
    allocatedTasks: number;
    conflictsDetected: number;
    executionTimeMs: number;
  };
}

// ============================================================================
// QUERY KEY FACTORY (for invalidation management)
// ============================================================================

export const calendarKeys = {
  all: ['calendar'] as const,
  
  timeBlocks: () => [...calendarKeys.all, 'time-blocks'] as const,
  timeBlocksByRange: (planId: string, startDate: string, endDate: string) =>
    [...calendarKeys.timeBlocks(), { planId, startDate, endDate }] as const,
  
  conflicts: () => [...calendarKeys.all, 'conflicts'] as const,
  conflictsByPlan: (planId: string) =>
    [...calendarKeys.conflicts(), { planId }] as const,
  
  suggestions: () => [...calendarKeys.all, 'suggestions'] as const,
  taskSuggestions: (taskId: string) =>
    [...calendarKeys.suggestions(), { taskId }] as const,
};

// ============================================================================
// 1. useTasksByDateRange: Get tasks in time window
// ============================================================================

export const useTasksByDateRange = (
  planId: string,
  startDate: Date,
  endDate: Date,
  options?: UseQueryOptions<TaskTimeBlock[]>
) => {
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();
  
  return useQuery<TaskTimeBlock[]>({
    queryKey: calendarKeys.timeBlocksByRange(planId, startStr, endStr),
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/study-planner/tasks/by-date-range`,
        {
          params: {
            planId,
            startDate: startStr,
            endDate: endStr,
          },
        }
      );
      return data.tasks || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

// ============================================================================
// 2. useTimeBlockConflicts: Get all conflicts
// ============================================================================

export const useTimeBlockConflicts = (
  planId: string,
  options?: UseQueryOptions<ConflictData[]>
) => {
  return useQuery<ConflictData[]>({
    queryKey: calendarKeys.conflictsByPlan(planId),
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/study-planner/conflicts`,
        {
          params: { planId },
        }
      );
      return data.conflicts || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 20 * 60 * 1000,
    ...options,
  });
};

// ============================================================================
// 3. useSuggestTimeSlot: Get available slot suggestions
// ============================================================================

export const useSuggestTimeSlot = (
  taskId: string,
  enabled: boolean = true,
  options?: UseQueryOptions<SlotSuggestion[]>
) => {
  return useQuery<SlotSuggestion[]>({
    queryKey: calendarKeys.taskSuggestions(taskId),
    queryFn: async () => {
      const { data } = await axios.post(
        `/api/study-planner/tasks/${taskId}/suggest-slot`
      );
      return data.suggestions || [];
    },
    enabled: enabled,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
    ...options,
  });
};

// ============================================================================
// 4. useRescheduleTaskSmart: Reschedule with server-side validation
// ============================================================================

interface ReschedulePayload {
  taskId: string;
  newStartTime: string; // ISO datetime
  reason?: string;
}

export const useRescheduleTaskSmart = (
  options?: UseMutationOptions<TaskTimeBlock, Error, ReschedulePayload>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<TaskTimeBlock, Error, ReschedulePayload>({
    mutationFn: async (payload) => {
      const { data } = await axios.post(
        `/api/study-planner/tasks/${payload.taskId}/reschedule-smart`,
        {
          newStartTime: payload.newStartTime,
          reason: payload.reason || 'User manual reschedule',
        }
      );
      return data.task;
    },
    onSuccess: (task) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: calendarKeys.timeBlocks(),
      });
      queryClient.invalidateQueries({
        queryKey: calendarKeys.conflicts(),
      });
      queryClient.invalidateQueries({
        queryKey: calendarKeys.suggestions(),
      });
    },
    ...options,
  });
};

// ============================================================================
// 5. useAutoSchedulePlan: Run scheduling algorithm
// ============================================================================

interface AutoSchedulePayload {
  planId: string;
}

export const useAutoSchedulePlan = (
  options?: UseMutationOptions<AutoScheduleResult, Error, AutoSchedulePayload>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<AutoScheduleResult, Error, AutoSchedulePayload>({
    mutationFn: async (payload) => {
      const { data } = await axios.post(
        `/api/study-planner/plans/${payload.planId}/auto-schedule`
      );
      return data;
    },
    onSuccess: (result) => {
      // Invalidate all calendar queries
      queryClient.invalidateQueries({
        queryKey: calendarKeys.all,
      });
    },
    ...options,
  });
};

// ============================================================================
// 6. useResolveConflict: Auto-resolve conflict
// ============================================================================

interface ResolveConflictPayload {
  conflictId: string;
}

interface ResolveConflictResult {
  success: boolean;
  message: string;
  movedTask?: string;
  newSlot?: SlotSuggestion;
}

export const useResolveConflict = (
  options?: UseMutationOptions<ResolveConflictResult, Error, ResolveConflictPayload>
) => {
  const queryClient = useQueryClient();
  
  return useMutation<ResolveConflictResult, Error, ResolveConflictPayload>({
    mutationFn: async (payload) => {
      const { data } = await axios.post(
        `/api/study-planner/conflicts/${payload.conflictId}/resolve`
      );
      return data;
    },
    onSuccess: (result) => {
      if (result.success) {
        // Refresh all calendar queries
        queryClient.invalidateQueries({
          queryKey: calendarKeys.all,
        });
      }
    },
    ...options,
  });
};

// ============================================================================
// COMBINED HOOKS FOR COMMON PATTERNS
// ============================================================================

/**
 * Hook: Get all calendar data for a time range
 * Includes tasks, conflicts, and suggestions
 */
export const useCalendarPlanning = (
  planId: string,
  startDate: Date,
  endDate: Date,
  taskIdForSuggestions?: string
) => {
  const tasks = useTasksByDateRange(planId, startDate, endDate);
  const conflicts = useTimeBlockConflicts(planId);
  const suggestions = useSuggestTimeSlot(
    taskIdForSuggestions || '',
    !!taskIdForSuggestions
  );
  
  return {
    tasks,
    conflicts,
    suggestions,
    isLoading: tasks.isLoading || conflicts.isLoading,
    isError: tasks.isError || conflicts.isError,
    error: tasks.error || conflicts.error,
  };
};

/**
 * Hook: Perform smart drag-drop rescheduling
 */
export const useDragDropReschedule = () => {
  const reschedule = useRescheduleTaskSmart();
  
  const handleDragDrop = async (
    taskId: string,
    newStartTime: Date,
    reason: string = 'User drag-drop reschedule'
  ) => {
    return reschedule.mutateAsync({
      taskId,
      newStartTime: newStartTime.toISOString(),
      reason,
    });
  };
  
  return {
    reschedule: handleDragDrop,
    isLoading: reschedule.isPending,
    error: reschedule.error,
  };
};

export default {
  useTasksByDateRange,
  useTimeBlockConflicts,
  useSuggestTimeSlot,
  useRescheduleTaskSmart,
  useAutoSchedulePlan,
  useResolveConflict,
  useCalendarPlanning,
  useDragDropReschedule,
  calendarKeys,
};
