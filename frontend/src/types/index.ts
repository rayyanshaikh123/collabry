/**
 * Centralized Type Exports
 */

// Re-export all types
export * from './user.types';
export * from './studyBoard.types';
export * from './planner.types';
export * from './focus.types';
export * from './collaboration.types';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// UI State Types
export enum AppRoute {
  LANDING = 'landing',
  ROLE_SELECTION = 'role-selection',
  DASHBOARD = 'dashboard',
  STUDY_BOARD = 'study-board',
  PLANNER = 'planner',
  FOCUS = 'focus',
  FLASHCARDS = 'flashcards',
  PROFILE = 'profile',
  ADMIN = 'admin',
  ADMIN_USERS = 'admin-users',
  ADMIN_MODERATION = 'admin-moderation',
  ADMIN_AI = 'admin-ai',
  ADMIN_REPORTS = 'admin-reports',
  ADMIN_BOARDS = 'admin-boards',
  ADMIN_SETTINGS = 'admin-settings',
  LOGIN = 'login',
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot-password',
  LEARNING_JOURNAL = 'learning-journal',
  VISUAL_AIDS = 'visual-aids',
  STUDY_BUDDY = 'study-buddy',
}

export type ThemeType = 'indigo' | 'blue' | 'amber' | 'emerald' | 'rose';
