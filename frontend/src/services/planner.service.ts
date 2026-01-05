/**
 * Planner Service
 * Handles all planner and task-related API calls
 */

import { apiClient } from '../lib/api';
import type {
  Task,
  PlannerEvent,
  StudyGoal,
  ApiResponse,
} from '../types';

export const plannerService = {
  /**
   * Get all tasks for current user
   * TODO: Connect to backend /api/tasks
   */
  async getTasks(filters?: {
    status?: string;
    category?: string;
    dueDate?: string;
  }): Promise<Task[]> {
    const response = await apiClient.get<Task[]>('/tasks', { params: filters });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch tasks');
  },

  /**
   * Get single task by ID
   * TODO: Connect to backend /api/tasks/:id
   */
  async getTask(taskId: string): Promise<Task> {
    const response = await apiClient.get<Task>(`/tasks/${taskId}`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch task');
  },

  /**
   * Create new task
   * TODO: Connect to backend /api/tasks
   */
  async createTask(data: Partial<Task>): Promise<Task> {
    const response = await apiClient.post<Task>('/tasks', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to create task');
  },

  /**
   * Update task
   * TODO: Connect to backend /api/tasks/:id
   */
  async updateTask(taskId: string, data: Partial<Task>): Promise<Task> {
    const response = await apiClient.patch<Task>(`/tasks/${taskId}`, data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to update task');
  },

  /**
   * Delete task
   * TODO: Connect to backend /api/tasks/:id
   */
  async deleteTask(taskId: string): Promise<void> {
    const response = await apiClient.delete(`/tasks/${taskId}`);
    
    if (!response.success) {
      throw new Error('Failed to delete task');
    }
  },

  /**
   * Mark task as completed
   * TODO: Connect to backend /api/tasks/:id/complete
   */
  async completeTask(taskId: string): Promise<Task> {
    const response = await apiClient.post<Task>(`/tasks/${taskId}/complete`);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to complete task');
  },

  /**
   * Get all planner events
   * TODO: Connect to backend /api/events
   */
  async getEvents(startDate?: string, endDate?: string): Promise<PlannerEvent[]> {
    const response = await apiClient.get<PlannerEvent[]>('/events', {
      params: { startDate, endDate },
    });
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch events');
  },

  /**
   * Create new event
   * TODO: Connect to backend /api/events
   */
  async createEvent(data: Partial<PlannerEvent>): Promise<PlannerEvent> {
    const response = await apiClient.post<PlannerEvent>('/events', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to create event');
  },

  /**
   * Update event
   * TODO: Connect to backend /api/events/:id
   */
  async updateEvent(eventId: string, data: Partial<PlannerEvent>): Promise<PlannerEvent> {
    const response = await apiClient.patch<PlannerEvent>(`/events/${eventId}`, data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to update event');
  },

  /**
   * Delete event
   * TODO: Connect to backend /api/events/:id
   */
  async deleteEvent(eventId: string): Promise<void> {
    const response = await apiClient.delete(`/events/${eventId}`);
    
    if (!response.success) {
      throw new Error('Failed to delete event');
    }
  },

  /**
   * Get all study goals
   * TODO: Connect to backend /api/goals
   */
  async getGoals(): Promise<StudyGoal[]> {
    const response = await apiClient.get<StudyGoal[]>('/goals');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to fetch goals');
  },

  /**
   * Create new goal
   * TODO: Connect to backend /api/goals
   */
  async createGoal(data: Partial<StudyGoal>): Promise<StudyGoal> {
    const response = await apiClient.post<StudyGoal>('/goals', data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to create goal');
  },

  /**
   * Update goal
   * TODO: Connect to backend /api/goals/:id
   */
  async updateGoal(goalId: string, data: Partial<StudyGoal>): Promise<StudyGoal> {
    const response = await apiClient.patch<StudyGoal>(`/goals/${goalId}`, data);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error('Failed to update goal');
  },

  /**
   * Delete goal
   * TODO: Connect to backend /api/goals/:id
   */
  async deleteGoal(goalId: string): Promise<void> {
    const response = await apiClient.delete(`/goals/${goalId}`);
    
    if (!response.success) {
      throw new Error('Failed to delete goal');
    }
  },
};

export default plannerService;
