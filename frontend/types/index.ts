export enum AppRoute {
  LANDING = 'landing',
  ROLE_SELECTION = 'role-selection',
  DASHBOARD = 'dashboard',
  STUDY_BOARD = 'study-board',
  STUDY_NOTEBOOK = 'study-notebook',
  PLANNER = 'planner',
  FOCUS = 'focus',
  FLASHCARDS = 'flashcards',
  PROFILE = 'profile',
  PROFILE_USAGE = 'usage',
  SETTINGS = 'settings',
  SUBSCRIPTION = 'subscription',
  PRICING = 'pricing',
  ADMIN = 'admin',
  ADMIN_USERS = 'admin-users',
  ADMIN_MODERATION = 'admin-moderation',
  ADMIN_AI = 'admin-ai',
  ADMIN_REPORTS = 'admin-reports',
  ADMIN_BOARDS = 'admin-boards',
  ADMIN_COUPONS = 'admin-coupons',
  ADMIN_AUDIT = 'admin-audit',
  ADMIN_NOTIFICATIONS = 'admin-notifications',
  ADMIN_SUBSCRIPTIONS = 'admin-subscriptions',
  ADMIN_SETTINGS = 'admin-settings',
  LOGIN = 'login',
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot-password',
  LEARNING_JOURNAL = 'learning-journal',
  VISUAL_AIDS = 'visual-aids',
  STUDY_BUDDY = 'study-buddy',
  SOCIAL = 'social',
  RECYCLE_BIN = 'recycle-bin'
}

export type ThemeType = 'indigo' | 'blue' | 'amber' | 'emerald' | 'rose' | 'purple' | 'cyan' | 'pink' | 'teal' | 'violet' | 'orange' | 'yellow';

export * from './user.types';
export * from './planner.types';
export * from './studyBoard.types';
export * from './focus.types';
export * from './collaboration.types';
export * from './visualAids.types';

export interface Activity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  type: 'upload' | 'comment' | 'edit' | 'invite';
}
