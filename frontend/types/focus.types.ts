/**
 * Focus Mode Types
 */

export type FocusSessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type FocusTechnique = 'pomodoro' | 'custom' | 'deep-work';

export interface FocusSession {
  id: string;
  userId: string;
  taskId?: string;
  technique: FocusTechnique;
  duration: number; // in minutes
  breakDuration?: number; // in minutes
  elapsed: number; // in seconds
  status: FocusSessionStatus;
  startedAt: string;
  completedAt?: string;
  pausedAt?: string;
  notes?: string;
  productivity?: number; // 1-5 rating
  createdAt: string;
  updatedAt: string;
}

export interface FocusSettings {
  defaultTechnique: FocusTechnique;
  pomodoroDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface FocusStats {
  totalSessions: number;
  totalMinutes: number;
  averageProductivity: number;
  completedToday: number;
  currentStreak: number;
  longestStreak: number;
}
