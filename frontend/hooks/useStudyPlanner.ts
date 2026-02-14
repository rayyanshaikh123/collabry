/**
 * Study Planner React Query Hooks
 * Custom hooks for data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  studyPlannerService,
  StudyPlan,
  StudyTask,
  StudySession,
  CreatePlanData,
  CreateTaskData,
  AIGeneratedPlan,
  PlanAnalytics,
  UserAnalytics,
} from '@/lib/services/studyPlanner.service';
import { useAlert } from './useAlert';

// Query keys
export const studyPlannerKeys = {
  all: ['study-planner'] as const,
  plans: () => [...studyPlannerKeys.all, 'plans'] as const,
  plan: (id: string) => [...studyPlannerKeys.all, 'plans', id] as const,
  planAnalytics: (id: string) => [...studyPlannerKeys.all, 'plans', id, 'analytics'] as const,
  userAnalytics: () => [...studyPlannerKeys.all, 'analytics'] as const,
  tasks: () => [...studyPlannerKeys.all, 'tasks'] as const,
  planTasks: (planId: string) => [...studyPlannerKeys.all, 'plans', planId, 'tasks'] as const,
  todayTasks: () => [...studyPlannerKeys.all, 'tasks', 'today'] as const,
  todayEvents: () => [...studyPlannerKeys.all, 'events', 'today'] as const,
  upcomingTasks: () => [...studyPlannerKeys.all, 'tasks', 'upcoming'] as const,
  overdueTasks: () => [...studyPlannerKeys.all, 'tasks', 'overdue'] as const,
  task: (id: string) => [...studyPlannerKeys.all, 'tasks', id] as const,
};

// ============================================================================
// STUDY PLANS HOOKS
// ============================================================================

export function usePlans(filters?: { status?: string; planType?: string }): UseQueryResult<StudyPlan[], Error> {
  return useQuery({
    queryKey: [...studyPlannerKeys.plans(), filters],
    queryFn: async () => {
      const plans = await studyPlannerService.getPlans(filters);
      console.log('📋 Fetched plans:', plans);
      console.log('📋 Filters used:', filters);
      return plans;
    },
    staleTime: 0,
    initialData: [],
  });
}

export function useTodayEvents(): UseQueryResult<StudySession[], Error> {
  return useQuery({
    queryKey: studyPlannerKeys.todayEvents(),
    queryFn: () => studyPlannerService.getTodayEvents(),
    staleTime: 60 * 1000,
    initialData: [],
  });
}

export function useStudyEventsRange(startDate: string, endDate: string): UseQueryResult<StudySession[], Error> {
  return useQuery({
    queryKey: [...studyPlannerKeys.all, 'events', startDate, endDate],
    queryFn: () => studyPlannerService.getEventsRange(startDate, endDate),
    staleTime: 60 * 1000,
  });
}

export function usePlan(planId: string | null): UseQueryResult<StudyPlan, Error> {
  return useQuery({
    queryKey: studyPlannerKeys.plan(planId || ''),
    queryFn: () => studyPlannerService.getPlanById(planId!),
    enabled: !!planId,
  });
}

export function usePlanAnalytics(planId: string | null): UseQueryResult<PlanAnalytics, Error> {
  return useQuery({
    queryKey: studyPlannerKeys.planAnalytics(planId || ''),
    queryFn: () => studyPlannerService.getPlanAnalytics(planId!),
    enabled: !!planId,
  });
}

export function useUserAnalytics(): UseQueryResult<UserAnalytics, Error> {
  return useQuery({
    queryKey: studyPlannerKeys.userAnalytics(),
    queryFn: () => studyPlannerService.getUserAnalytics(),
  });
}

export function useCreatePlan(): UseMutationResult<StudyPlan, Error, CreatePlanData, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlanData) => studyPlannerService.createPlan(data),
    onSuccess: async () => {
      // Invalidate and refetch all plans queries
      await queryClient.invalidateQueries({ queryKey: studyPlannerKeys.plans() });
      await queryClient.refetchQueries({ queryKey: studyPlannerKeys.plans() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.userAnalytics() });
    },
  });
}

export function useUpdatePlan(): UseMutationResult<StudyPlan, Error, { planId: string; data: Partial<CreatePlanData> }, unknown> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: ({ planId, data }) => studyPlannerService.updatePlan(planId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.plan(variables.planId) });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.plans() });
      showAlert({ message: 'Plan updated successfully! ✅', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to update plan: ${error.message}`, type: 'error' });
    },
  });
}

export function useDeletePlan(): UseMutationResult<void, Error, string, unknown> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: (planId: string) => studyPlannerService.deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.plans() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.userAnalytics() });
      showAlert({ message: 'Plan archived successfully', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to delete plan: ${error.message}`, type: 'error' });
    },
  });
}

// ============================================================================
// STUDY TASKS HOOKS
// ============================================================================

export function useTasks(filters?: {
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
}): UseQueryResult<StudyTask[], Error> {
  return useQuery({
    queryKey: [...studyPlannerKeys.tasks(), filters],
    queryFn: () => studyPlannerService.getTasks(filters),
  });
}

export function usePlanTasks(
  planId: string | null,
  filters?: { status?: string; date?: string; priority?: string }
): UseQueryResult<StudyTask[], Error> {
  return useQuery({
    queryKey: [...studyPlannerKeys.planTasks(planId || ''), filters],
    queryFn: () => studyPlannerService.getPlanTasks(planId!, filters),
    enabled: !!planId,
  });
}

export function useTodayTasks(): UseQueryResult<StudyTask[], Error> {
  return useQuery({
    queryKey: studyPlannerKeys.todayTasks(),
    queryFn: async () => {
      const tasks = await studyPlannerService.getTodayTasks();
      return tasks;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 0, // Always consider data stale
    initialData: [],
  });
}

export function useUpcomingTasks(days: number = 7): UseQueryResult<StudyTask[], Error> {
  return useQuery({
    queryKey: [...studyPlannerKeys.upcomingTasks(), days],
    queryFn: async () => {
      const tasks = await studyPlannerService.getUpcomingTasks(days);
      console.log('🔜 Fetched upcoming tasks:', tasks);
      return tasks;
    },
    staleTime: 0, // Always consider data stale
    initialData: [],
  });
}

export function useOverdueTasks(): UseQueryResult<StudyTask[], Error> {
  return useQuery({
    queryKey: studyPlannerKeys.overdueTasks(),
    queryFn: () => studyPlannerService.getOverdueTasks(),
    refetchInterval: 300000, // Refetch every 5 minutes
    initialData: [],
  });
}

export function useTask(taskId: string | null): UseQueryResult<StudyTask, Error> {
  return useQuery({
    queryKey: studyPlannerKeys.task(taskId || ''),
    queryFn: () => studyPlannerService.getTaskById(taskId!),
    enabled: !!taskId,
  });
}

export function useCreateTask(): UseMutationResult<StudyTask, Error, CreateTaskData, unknown> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: (data: CreateTaskData) => studyPlannerService.createTask(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.planTasks(variables.planId) });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.plan(variables.planId) });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayTasks() });
      queryClient.invalidateQueries({ queryKey: [...studyPlannerKeys.all, 'tasks', 'upcoming'] });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.overdueTasks() });
      showAlert({ message: 'Task added! 📝', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to create task: ${error.message}`, type: 'error' });
    },
  });
}

export function useCreateBulkTasks(): UseMutationResult<
  StudyTask[],
  Error,
  { planId: string; tasks: CreateTaskData[] },
  unknown
> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: ({ planId, tasks }) => studyPlannerService.createBulkTasks(planId, tasks),
    onSuccess: (data, variables) => {
      // Invalidate all task queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.planTasks(variables.planId) });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.plan(variables.planId) });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayTasks() });
      // Use partial matching to invalidate all upcomingTasks queries regardless of days parameter
      queryClient.invalidateQueries({ queryKey: [...studyPlannerKeys.all, 'tasks', 'upcoming'] });
      // Also invalidate overdue tasks
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.overdueTasks() });
    },
  });
}

export function useUpdateTask(): UseMutationResult<
  StudyTask,
  Error,
  { taskId: string; data: Partial<CreateTaskData> },
  unknown
> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: ({ taskId, data }) => studyPlannerService.updateTask(taskId, data),
    onSuccess: (task, variables) => {
      // Use the task data if available, otherwise use the taskId from variables
      const taskId = task?.id || variables.taskId;
      const planId = task?.planId || null;

      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.task(taskId) });
      if (planId) {
        queryClient.invalidateQueries({ queryKey: studyPlannerKeys.planTasks(planId) });
      }
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayTasks() });
      queryClient.invalidateQueries({ queryKey: [...studyPlannerKeys.all, 'tasks', 'upcoming'] });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.overdueTasks() });
      showAlert({ message: 'Task updated! ✏️', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to update task: ${error.message}`, type: 'error' });
    },
  });
}

export function useCompleteTask(): UseMutationResult<
  StudyTask,
  Error,
  {
    taskId: string;
    data?: {
      notes?: string;
      actualDuration?: number;
      difficultyRating?: number;
      understandingLevel?: number;
    };
  },
  unknown
> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: ({ taskId, data }) => studyPlannerService.completeTask(taskId, data),
    onSuccess: (task, variables) => {
      // Use the task data if available, otherwise use the taskId from variables
      const taskId = task?.id || variables.taskId;
      const planId = task?.planId || null;

      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.task(taskId) });
      if (planId) {
        queryClient.invalidateQueries({ queryKey: studyPlannerKeys.planTasks(planId) });
        queryClient.invalidateQueries({ queryKey: studyPlannerKeys.plan(planId) });
      }
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayTasks() });
      queryClient.invalidateQueries({ queryKey: [...studyPlannerKeys.all, 'tasks', 'upcoming'] });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.overdueTasks() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.userAnalytics() });
      showAlert({ message: 'Great work! Task completed! 🎉', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to complete task: ${error.message}`, type: 'error' });
    },
  });
}

export function useRescheduleTask(): UseMutationResult<
  StudyTask,
  Error,
  { taskId: string; newDate: string; reason?: string },
  unknown
> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: ({ taskId, newDate, reason }) =>
      studyPlannerService.rescheduleTask(taskId, newDate, reason),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.task(task.id) });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.planTasks(task.planId) });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayTasks() });
      queryClient.invalidateQueries({ queryKey: [...studyPlannerKeys.all, 'tasks', 'upcoming'] });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.overdueTasks() });
      showAlert({ message: 'Task rescheduled 📅', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to reschedule task: ${error.message}`, type: 'error' });
    },
  });
}

export function useDeleteTask(): UseMutationResult<void, Error, string, unknown> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: (taskId: string) => studyPlannerService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.plans() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayTasks() });
      queryClient.invalidateQueries({ queryKey: [...studyPlannerKeys.all, 'tasks', 'upcoming'] });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.overdueTasks() });
      showAlert({ message: 'Task removed', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to delete task: ${error.message}`, type: 'error' });
    },
  });
}

// ============================================================================
// AI GENERATION HOOK
// ============================================================================

export function useGeneratePlan(): UseMutationResult<AIGeneratedPlan, Error, CreatePlanData, unknown> {
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: (data: CreatePlanData) => studyPlannerService.generatePlan(data),
    onSuccess: () => {
      showAlert({ message: 'AI plan generated successfully! 🤖✨', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to generate plan: ${error.message}`, type: 'error' });
    },
  });
}

export function useRecoverMissed(): UseMutationResult<
  any,
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: (planId: string) => studyPlannerService.recoverMissed(planId),
    onSuccess: (response: any, planId) => {
      // Handle both wrapped and unwrapped scenarios
      const data = response?.data || response;

      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.plan(planId) });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.planTasks(planId) });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayTasks() });
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayEvents() });

      const rescheduled = data?.rescheduled || 0;
      const totalMissed = data?.totalMissed || 0;

      if (rescheduled > 0) {
        showAlert({ message: `Rescheduled ${rescheduled} missed session(s) to new slots.`, type: 'success' });
      } else if (totalMissed > 0) {
        showAlert({ message: 'No free slots to reschedule; missed sessions marked.', type: 'warning' });
      } else {
        showAlert({ message: 'No missed sessions found.', type: 'success' });
      }
    },
    onError: (error: Error) => {
      showAlert({ message: `Recover failed: ${error.message}`, type: 'error' });
    },
  });
}

// ============================================================================
// EVENT HOOKS (V2)
// ============================================================================

export function useUpdateEvent(): UseMutationResult<
  StudySession,
  Error,
  { eventId: string; data: any },
  unknown
> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: ({ eventId, data }) => studyPlannerService.updateEvent(eventId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayEvents() });
      // Invalidate range queries
      queryClient.invalidateQueries({ queryKey: [...studyPlannerKeys.all, 'events'] });
      showAlert({ message: 'Event updated successfully', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to update event: ${error.message}`, type: 'error' });
    },
  });
}

export function useDeleteEvent(): UseMutationResult<void, Error, string, unknown> {
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();

  return useMutation({
    mutationFn: (eventId: string) => studyPlannerService.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: studyPlannerKeys.todayEvents() });
      queryClient.invalidateQueries({ queryKey: [...studyPlannerKeys.all, 'events'] });
      showAlert({ message: 'Event deleted', type: 'success' });
    },
    onError: (error: Error) => {
      showAlert({ message: `Failed to delete event: ${error.message}`, type: 'error' });
    },
  });
}
