/**
 * Planner Hooks
 * Custom hooks for planner, tasks, and goals
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlannerStore } from '../stores/planner.store';
import { plannerService } from '../services/planner.service';
import type { Task, PlannerEvent, StudyGoal } from '../types';

/**
 * Hook to access planner state and actions
 */
export const usePlanner = () => {
  const {
    tasks,
    events,
    goals,
    selectedDate,
    view,
    setSelectedDate,
    setView,
  } = usePlannerStore();

  return {
    tasks,
    events,
    goals,
    selectedDate,
    view,
    setSelectedDate,
    setView,
  };
};

/**
 * Hook to fetch tasks
 */
export const useTasks = (filters?: any) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => plannerService.getTasks(filters),
  });
};

/**
 * Hook to fetch single task
 */
export const useTask = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => plannerService.getTask(taskId!),
    enabled: !!taskId,
  });
};

/**
 * Hook to create task
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { addTask } = usePlannerStore();
  
  return useMutation({
    mutationFn: (data: Partial<Task>) => plannerService.createTask(data),
    onSuccess: (newTask) => {
      // Add to store
      addTask(newTask);
      
      // Invalidate tasks list
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

/**
 * Hook to update task
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { updateTask } = usePlannerStore();
  
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
      plannerService.updateTask(taskId, data),
    onSuccess: (updatedTask, variables) => {
      // Update in store
      updateTask(variables.taskId, updatedTask);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

/**
 * Hook to delete task
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { removeTask } = usePlannerStore();
  
  return useMutation({
    mutationFn: (taskId: string) => plannerService.deleteTask(taskId),
    onSuccess: (_, taskId) => {
      // Remove from store
      removeTask(taskId);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

/**
 * Hook to complete task
 */
export const useCompleteTask = () => {
  const queryClient = useQueryClient();
  const { updateTask } = usePlannerStore();
  
  return useMutation({
    mutationFn: (taskId: string) => plannerService.completeTask(taskId),
    onSuccess: (completedTask, taskId) => {
      // Update in store
      updateTask(taskId, completedTask);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

/**
 * Hook to fetch events
 */
export const useEvents = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['events', startDate, endDate],
    queryFn: () => plannerService.getEvents(startDate, endDate),
  });
};

/**
 * Hook to create event
 */
export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const { addEvent } = usePlannerStore();
  
  return useMutation({
    mutationFn: (data: Partial<PlannerEvent>) => plannerService.createEvent(data),
    onSuccess: (newEvent) => {
      // Add to store
      addEvent(newEvent);
      
      // Invalidate events list
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

/**
 * Hook to update event
 */
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const { updateEvent } = usePlannerStore();
  
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Partial<PlannerEvent> }) =>
      plannerService.updateEvent(eventId, data),
    onSuccess: (updatedEvent, variables) => {
      // Update in store
      updateEvent(variables.eventId, updatedEvent);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

/**
 * Hook to delete event
 */
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const { removeEvent } = usePlannerStore();
  
  return useMutation({
    mutationFn: (eventId: string) => plannerService.deleteEvent(eventId),
    onSuccess: (_, eventId) => {
      // Remove from store
      removeEvent(eventId);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

/**
 * Hook to fetch goals
 */
export const useGoals = () => {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => plannerService.getGoals(),
  });
};

/**
 * Hook to create goal
 */
export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  const { addGoal } = usePlannerStore();
  
  return useMutation({
    mutationFn: (data: Partial<StudyGoal>) => plannerService.createGoal(data),
    onSuccess: (newGoal) => {
      // Add to store
      addGoal(newGoal);
      
      // Invalidate goals list
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
};

/**
 * Hook to update goal
 */
export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  const { updateGoal } = usePlannerStore();
  
  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: Partial<StudyGoal> }) =>
      plannerService.updateGoal(goalId, data),
    onSuccess: (updatedGoal, variables) => {
      // Update in store
      updateGoal(variables.goalId, updatedGoal);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
};

/**
 * Hook to delete goal
 */
export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  const { removeGoal } = usePlannerStore();
  
  return useMutation({
    mutationFn: (goalId: string) => plannerService.deleteGoal(goalId),
    onSuccess: (_, goalId) => {
      // Remove from store
      removeGoal(goalId);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
};
