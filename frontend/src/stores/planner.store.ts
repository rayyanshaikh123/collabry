/**
 * Planner Store (Zustand)
 * Manages tasks, events, and study goals
 */

import { create } from 'zustand';
import type { Task, PlannerEvent, StudyGoal } from '../types';
import { plannerService } from '../services/planner.service';

interface PlannerState {
  // State
  tasks: Task[];
  events: PlannerEvent[];
  goals: StudyGoal[];
  selectedDate: string;
  view: 'day' | 'week' | 'month';
  isLoading: boolean;
  error: string | null;

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  
  setEvents: (events: PlannerEvent[]) => void;
  addEvent: (event: PlannerEvent) => void;
  updateEvent: (eventId: string, updates: Partial<PlannerEvent>) => void;
  removeEvent: (eventId: string) => void;
  
  setGoals: (goals: StudyGoal[]) => void;
  addGoal: (goal: StudyGoal) => void;
  updateGoal: (goalId: string, updates: Partial<StudyGoal>) => void;
  removeGoal: (goalId: string) => void;
  
  setSelectedDate: (date: string) => void;
  setView: (view: 'day' | 'week' | 'month') => void;
  
  // API actions
  fetchTasks: (filters?: any) => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task>;
  saveTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  
  fetchEvents: (startDate?: string, endDate?: string) => Promise<void>;
  createEvent: (data: Partial<PlannerEvent>) => Promise<PlannerEvent>;
  saveEvent: (eventId: string, updates: Partial<PlannerEvent>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  
  fetchGoals: () => Promise<void>;
  createGoal: (data: Partial<StudyGoal>) => Promise<StudyGoal>;
  saveGoal: (goalId: string, updates: Partial<StudyGoal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  
  clearError: () => void;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  // Initial state
  tasks: [],
  events: [],
  goals: [],
  selectedDate: new Date().toISOString(),
  view: 'week',
  isLoading: false,
  error: null,

  // Set tasks
  setTasks: (tasks: Task[]) => {
    set({ tasks });
  },

  // Add task
  addTask: (task: Task) => {
    set((state) => ({
      tasks: [...state.tasks, task],
    }));
  },

  // Update task
  updateTask: (taskId: string, updates: Partial<Task>) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    }));
  },

  // Remove task
  removeTask: (taskId: string) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));
  },

  // Set events
  setEvents: (events: PlannerEvent[]) => {
    set({ events });
  },

  // Add event
  addEvent: (event: PlannerEvent) => {
    set((state) => ({
      events: [...state.events, event],
    }));
  },

  // Update event
  updateEvent: (eventId: string, updates: Partial<PlannerEvent>) => {
    set((state) => ({
      events: state.events.map((e) =>
        e.id === eventId ? { ...e, ...updates } : e
      ),
    }));
  },

  // Remove event
  removeEvent: (eventId: string) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== eventId),
    }));
  },

  // Set goals
  setGoals: (goals: StudyGoal[]) => {
    set({ goals });
  },

  // Add goal
  addGoal: (goal: StudyGoal) => {
    set((state) => ({
      goals: [...state.goals, goal],
    }));
  },

  // Update goal
  updateGoal: (goalId: string, updates: Partial<StudyGoal>) => {
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === goalId ? { ...g, ...updates } : g
      ),
    }));
  },

  // Remove goal
  removeGoal: (goalId: string) => {
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== goalId),
    }));
  },

  // Set selected date
  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
  },

  // Set view
  setView: (view: 'day' | 'week' | 'month') => {
    set({ view });
  },

  // Fetch tasks
  fetchTasks: async (filters?: any) => {
    set({ isLoading: true, error: null });
    
    try {
      const tasks = await plannerService.getTasks(filters);
      set({ tasks, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch tasks',
        isLoading: false,
      });
    }
  },

  // Create task
  createTask: async (data: Partial<Task>) => {
    set({ isLoading: true, error: null });
    
    try {
      const newTask = await plannerService.createTask(data);
      get().addTask(newTask);
      set({ isLoading: false });
      return newTask;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create task',
        isLoading: false,
      });
      throw error;
    }
  },

  // Save task
  saveTask: async (taskId: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await plannerService.updateTask(taskId, updates);
      get().updateTask(taskId, updatedTask);
    } catch (error: any) {
      set({ error: error.message || 'Failed to update task' });
      throw error;
    }
  },

  // Delete task
  deleteTask: async (taskId: string) => {
    try {
      await plannerService.deleteTask(taskId);
      get().removeTask(taskId);
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete task' });
      throw error;
    }
  },

  // Complete task
  completeTask: async (taskId: string) => {
    try {
      const completedTask = await plannerService.completeTask(taskId);
      get().updateTask(taskId, completedTask);
    } catch (error: any) {
      set({ error: error.message || 'Failed to complete task' });
      throw error;
    }
  },

  // Fetch events
  fetchEvents: async (startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const events = await plannerService.getEvents(startDate, endDate);
      set({ events, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch events',
        isLoading: false,
      });
    }
  },

  // Create event
  createEvent: async (data: Partial<PlannerEvent>) => {
    set({ isLoading: true, error: null });
    
    try {
      const newEvent = await plannerService.createEvent(data);
      get().addEvent(newEvent);
      set({ isLoading: false });
      return newEvent;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create event',
        isLoading: false,
      });
      throw error;
    }
  },

  // Save event
  saveEvent: async (eventId: string, updates: Partial<PlannerEvent>) => {
    try {
      const updatedEvent = await plannerService.updateEvent(eventId, updates);
      get().updateEvent(eventId, updatedEvent);
    } catch (error: any) {
      set({ error: error.message || 'Failed to update event' });
      throw error;
    }
  },

  // Delete event
  deleteEvent: async (eventId: string) => {
    try {
      await plannerService.deleteEvent(eventId);
      get().removeEvent(eventId);
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete event' });
      throw error;
    }
  },

  // Fetch goals
  fetchGoals: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const goals = await plannerService.getGoals();
      set({ goals, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch goals',
        isLoading: false,
      });
    }
  },

  // Create goal
  createGoal: async (data: Partial<StudyGoal>) => {
    set({ isLoading: true, error: null });
    
    try {
      const newGoal = await plannerService.createGoal(data);
      get().addGoal(newGoal);
      set({ isLoading: false });
      return newGoal;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to create goal',
        isLoading: false,
      });
      throw error;
    }
  },

  // Save goal
  saveGoal: async (goalId: string, updates: Partial<StudyGoal>) => {
    try {
      const updatedGoal = await plannerService.updateGoal(goalId, updates);
      get().updateGoal(goalId, updatedGoal);
    } catch (error: any) {
      set({ error: error.message || 'Failed to update goal' });
      throw error;
    }
  },

  // Delete goal
  deleteGoal: async (goalId: string) => {
    try {
      await plannerService.deleteGoal(goalId);
      get().removeGoal(goalId);
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete goal' });
      throw error;
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

// Selectors
export const selectTasks = (state: PlannerState) => state.tasks;
export const selectEvents = (state: PlannerState) => state.events;
export const selectGoals = (state: PlannerState) => state.goals;
export const selectSelectedDate = (state: PlannerState) => state.selectedDate;
export const selectView = (state: PlannerState) => state.view;
