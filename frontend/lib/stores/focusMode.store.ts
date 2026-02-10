/**
 * Focus Mode Store (Zustand)
 * Manages focus sessions and timer state
 */

import { create } from 'zustand';
import type { FocusSession, FocusSettings, FocusStats } from '@/types';
import { focusService } from '@/lib/services/focus.service';

interface FocusModeState {
  // State
  activeSession: FocusSession | null;
  sessions: FocusSession[];
  settings: FocusSettings;
  stats: FocusStats | null;
  elapsed: number; // Current session elapsed time in seconds
  isTimerRunning: boolean;
  isLoading: boolean;
  error: string | null;

  // Timer actions
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tick: () => void;
  setElapsed: (seconds: number) => void;
  
  // Session actions
  setActiveSession: (session: FocusSession | null) => void;
  setSessions: (sessions: FocusSession[]) => void;
  addSession: (session: FocusSession) => void;
  updateSession: (sessionId: string, updates: Partial<FocusSession>) => void;
  
  // Settings actions
  setSettings: (settings: FocusSettings) => void;
  updateSettings: (updates: Partial<FocusSettings>) => void;
  
  // Stats actions
  setStats: (stats: FocusStats) => void;
  
  // API actions
  fetchSessions: (filters?: any) => Promise<void>;
  startSession: (data: Partial<FocusSession>) => Promise<FocusSession>;
  pauseSession: (sessionId: string) => Promise<void>;
  resumeSession: (sessionId: string) => Promise<void>;
  completeSession: (sessionId: string, productivity?: number, notes?: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
  fetchSettings: () => Promise<void>;
  saveSettings: (updates: Partial<FocusSettings>) => Promise<void>;
  fetchStats: (period?: 'day' | 'week' | 'month' | 'year') => Promise<void>;
  
  clearError: () => void;
}

let timerInterval: NodeJS.Timeout | null = null;

export const useFocusModeStore = create<FocusModeState>((set, get) => ({
  // Initial state
  activeSession: null,
  sessions: [],
  settings: {
    defaultTechnique: 'pomodoro',
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStartBreaks: false,
    autoStartPomodoros: false,
    soundEnabled: true,
    notificationsEnabled: true,
  },
  stats: null,
  elapsed: 0,
  isTimerRunning: false,
  isLoading: false,
  error: null,

  // Start timer
  startTimer: () => {
    if (timerInterval) return;
    
    set({ isTimerRunning: true });
    
    timerInterval = setInterval(() => {
      get().tick();
    }, 1000);
  },

  // Pause timer
  pauseTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({ isTimerRunning: false });
  },

  // Resume timer
  resumeTimer: () => {
    get().startTimer();
  },

  // Stop timer
  stopTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({ isTimerRunning: false, elapsed: 0 });
  },

  // Tick (increment elapsed time)
  tick: () => {
    set((state) => ({ elapsed: state.elapsed + 1 }));
  },

  // Set elapsed time
  setElapsed: (seconds: number) => {
    set({ elapsed: seconds });
  },

  // Set active session
  setActiveSession: (session: FocusSession | null) => {
    set({ activeSession: session });
  },

  // Set sessions
  setSessions: (sessions: FocusSession[]) => {
    set({ sessions });
  },

  // Add session
  addSession: (session: FocusSession) => {
    set((state) => ({
      sessions: [...state.sessions, session],
    }));
  },

  // Update session
  updateSession: (sessionId: string, updates: Partial<FocusSession>) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
      activeSession:
        state.activeSession?.id === sessionId
          ? { ...state.activeSession, ...updates }
          : state.activeSession,
    }));
  },

  // Set settings
  setSettings: (settings: FocusSettings) => {
    set({ settings });
  },

  // Update settings
  updateSettings: (updates: Partial<FocusSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }));
  },

  // Set stats
  setStats: (stats: FocusStats) => {
    set({ stats });
  },

  // Fetch sessions
  fetchSessions: async (filters?: any) => {
    set({ isLoading: true, error: null });
    
    try {
      const sessions = await focusService.getSessions(filters);
      set({ sessions, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch sessions',
        isLoading: false,
      });
    }
  },

  // Start session
  startSession: async (data: Partial<FocusSession>) => {
    set({ isLoading: true, error: null });
    
    try {
      const newSession = await focusService.startSession(data);
      set({
        activeSession: newSession,
        elapsed: 0,
        isLoading: false,
      });
      get().addSession(newSession);
      get().startTimer();
      return newSession;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to start session',
        isLoading: false,
      });
      throw error;
    }
  },

  // Pause session
  pauseSession: async (sessionId: string) => {
    try {
      const updatedSession = await focusService.pauseSession(sessionId);
      get().updateSession(sessionId, updatedSession);
      get().pauseTimer();
    } catch (error: any) {
      set({ error: error.message || 'Failed to pause session' });
      throw error;
    }
  },

  // Resume session
  resumeSession: async (sessionId: string) => {
    try {
      const updatedSession = await focusService.resumeSession(sessionId);
      get().updateSession(sessionId, updatedSession);
      get().resumeTimer();
    } catch (error: any) {
      set({ error: error.message || 'Failed to resume session' });
      throw error;
    }
  },

  // Complete session
  completeSession: async (sessionId: string, productivity?: number, notes?: string) => {
    try {
      const completedSession = await focusService.completeSession(
        sessionId,
        productivity,
        notes
      );
      get().updateSession(sessionId, completedSession);
      get().stopTimer();
      set({ activeSession: null });
    } catch (error: any) {
      set({ error: error.message || 'Failed to complete session' });
      throw error;
    }
  },

  // Cancel session
  cancelSession: async (sessionId: string) => {
    try {
      await focusService.cancelSession(sessionId);
      get().stopTimer();
      set({ activeSession: null });
    } catch (error: any) {
      set({ error: error.message || 'Failed to cancel session' });
      throw error;
    }
  },

  // Fetch settings
  fetchSettings: async () => {
    try {
      const settings = await focusService.getSettings();
      set({ settings });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch settings' });
    }
  },

  // Save settings
  saveSettings: async (updates: Partial<FocusSettings>) => {
    try {
      const updatedSettings = await focusService.updateSettings(updates);
      set({ settings: updatedSettings });
    } catch (error: any) {
      set({ error: error.message || 'Failed to save settings' });
      throw error;
    }
  },

  // Fetch stats
  fetchStats: async (period?: 'day' | 'week' | 'month' | 'year') => {
    try {
      const normalizedPeriod = period === 'day' ? 'today' : period;
      const stats = await focusService.getStats(normalizedPeriod);
      set({ stats });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch stats' });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

// Selectors
export const selectActiveSession = (state: FocusModeState) => state.activeSession;
export const selectElapsed = (state: FocusModeState) => state.elapsed;
export const selectIsTimerRunning = (state: FocusModeState) => state.isTimerRunning;
export const selectSettings = (state: FocusModeState) => state.settings;
export const selectStats = (state: FocusModeState) => state.stats;
