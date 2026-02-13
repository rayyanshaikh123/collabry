/**
 * FRONTEND: Calendar Zustand Store
 * File: frontend/src/stores/calendarView.store.ts
 * 
 * Purpose: Centralized state management for Smart Calendar
 * 
 * This store manages:
 * 1. Calendar view state (current view, selected date)
 * 2. Drag-drop operations (which task is being dragged, where to)
 * 3. Conflict display (which conflicts to show)
 * 4. Selected task (for detail panel)
 * 
 * Pattern: Zustand (same as existing focusMode.store.ts)
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export interface DragSourceData {
  taskId: string;
  currentStart: Date;
  currentEnd: Date;
  duration: number;
}

export interface TimeBlock {
  taskId: string;
  title: string;
  start: Date;
  end: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  hasConflict: boolean;
  conflictCount: number;
}

export interface ConflictInfo {
  conflictId: string;
  task1Id: string;
  task2Id: string;
  overlapMinutes: number;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

// ============================================================================
// STORE STATE INTERFACE
// ============================================================================

interface CalendarViewStore {
  // === VIEW STATE ===
  currentView: 'week' | 'day' | 'month' | 'list';
  setCurrentView: (view: 'week' | 'day' | 'month' | 'list') => void;
  
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
  
  // === DISPLAY OPTIONS ===
  showConflicts: boolean;
  setShowConflicts: (show: boolean) => void;
  
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
  
  timeGranularity: 15 | 30 | 60; // minutes
  setTimeGranularity: (minutes: 15 | 30 | 60) => void;
  
  // === DRAG & DROP ===
  draggedTask: DragSourceData | null;
  setDraggedTask: (task: DragSourceData | null) => void;
  
  dragSource: { date: Date; slotIndex: number } | null;
  setDragSource: (source: { date: Date; slotIndex: number } | null) => void;
  
  dragTarget: { date: Date; slotIndex: number } | null;
  setDragTarget: (target: { date: Date; slotIndex: number } | null) => void;
  
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  
  // === CONFLICT DATA ===
  conflictsData: ConflictInfo[];
  setConflictsData: (conflicts: ConflictInfo[]) => void;
  
  selectedConflictId: string | null;
  setSelectedConflictId: (id: string | null) => void;
  
  // === SELECTED TASK ===
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  
  // === FILTERS ===
  priorityFilter: ('low' | 'medium' | 'high' | 'urgent' | 'all')[];
  togglePriorityFilter: (priority: 'low' | 'medium' | 'high' | 'urgent') => void;
  
  // === HELPERS ===
  resetDragState: () => void;
  resetCalendarState: () => void;
}

// ============================================================================
// ZUSTAND STORE CREATION
// ============================================================================

export const useCalendarViewStore = create<CalendarViewStore>()(
  devtools(
    persist(
      (set) => ({
        // === VIEW STATE ===
        currentView: 'week',
        setCurrentView: (view) => set({ currentView: view }),
        
        currentDate: new Date(),
        setCurrentDate: (date) => set({ currentDate: date }),
        
        selectedDate: null,
        setSelectedDate: (date) => set({ selectedDate: date }),
        
        // === DISPLAY OPTIONS ===
        showConflicts: true,
        setShowConflicts: (show) => set({ showConflicts: show }),
        
        showCompleted: false,
        setShowCompleted: (show) => set({ showCompleted: show }),
        
        timeGranularity: 30,
        setTimeGranularity: (minutes) => set({ timeGranularity: minutes }),
        
        // === DRAG & DROP ===
        draggedTask: null,
        setDraggedTask: (task) => set({ draggedTask: task }),
        
        dragSource: null,
        setDragSource: (source) => set({ dragSource: source }),
        
        dragTarget: null,
        setDragTarget: (target) => set({ dragTarget: target }),
        
        isDragging: false,
        setIsDragging: (dragging) => set({ isDragging: dragging }),
        
        // === CONFLICT DATA ===
        conflictsData: [],
        setConflictsData: (conflicts) => set({ conflictsData: conflicts }),
        
        selectedConflictId: null,
        setSelectedConflictId: (id) => set({ selectedConflictId: id }),
        
        // === SELECTED TASK ===
        selectedTaskId: null,
        setSelectedTaskId: (id) => set({ selectedTaskId: id }),
        
        // === FILTERS ===
        priorityFilter: ['low', 'medium', 'high', 'urgent', 'all'],
        togglePriorityFilter: (priority) =>
          set((state) => {
            const updated = state.priorityFilter.includes(priority)
              ? state.priorityFilter.filter((p) => p !== priority)
              : [...state.priorityFilter, priority];
            return { priorityFilter: updated };
          }),
        
        // === HELPERS ===
        resetDragState: () =>
          set({
            draggedTask: null,
            dragSource: null,
            dragTarget: null,
            isDragging: false,
          }),
        
        resetCalendarState: () =>
          set({
            currentView: 'week',
            currentDate: new Date(),
            selectedDate: null,
            draggedTask: null,
            dragSource: null,
            dragTarget: null,
            isDragging: false,
            selectedTaskId: null,
            selectedConflictId: null,
            conflictsData: [],
          }),
      }),
      {
        name: 'calendar-view-storage',
        partialize: (state) => ({
          // Only persist non-transient state
          currentView: state.currentView,
          timeGranularity: state.timeGranularity,
          showConflicts: state.showConflicts,
          showCompleted: state.showCompleted,
          priorityFilter: state.priorityFilter,
        }),
      }
    )
  )
);

// ============================================================================
// HELPER HOOKS (OPTIONAL: use with useShallow from zustand)
// ============================================================================

/**
 * Helper: Get only items needed for calendar rendering
 * Usage: const { currentView, currentDate, timeGranularity } = useCalendarRender();
 */
export const useCalendarRender = () => {
  const store = useCalendarViewStore();
  return {
    currentView: store.currentView,
    currentDate: store.currentDate,
    timeGranularity: store.timeGranularity,
    showConflicts: store.showConflicts,
  };
};

/**
 * Helper: Get only drag-drop state
 * Usage: const { isDragging, draggedTask, dragTarget } = useCalendarDragDrop();
 */
export const useCalendarDragDrop = () => {
  const store = useCalendarViewStore();
  return {
    isDragging: store.isDragging,
    draggedTask: store.draggedTask,
    dragTarget: store.dragTarget,
    dragSource: store.dragSource,
    setIsDragging: store.setIsDragging,
    setDraggedTask: store.setDraggedTask,
    setDragTarget: store.setDragTarget,
    setDragSource: store.setDragSource,
    resetDragState: store.resetDragState,
  };
};

/**
 * Helper: Get only conflict state
 * Usage: const { conflictsData, selectedConflictId } = useCalendarConflicts();
 */
export const useCalendarConflicts = () => {
  const store = useCalendarViewStore();
  return {
    conflictsData: store.conflictsData,
    selectedConflictId: store.selectedConflictId,
    setConflictsData: store.setConflictsData,
    setSelectedConflictId: store.setSelectedConflictId,
  };
};

export default useCalendarViewStore;
