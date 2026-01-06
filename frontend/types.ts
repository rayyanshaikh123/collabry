
export enum AppRoute {
  LANDING = 'landing',
  ROLE_SELECTION = 'role-selection',
  DASHBOARD = 'dashboard',
  STUDY_BOARD = 'study-board',
  PLANNER = 'planner',
  FOCUS = 'focus',
  FLASHCARDS = 'flashcards',
  PROFILE = 'profile',
  PROFILE_USAGE = 'usage',
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
  STUDY_BUDDY = 'study-buddy'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'student' | 'admin' | 'mentor';
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  category: 'Exam' | 'Reading' | 'Assignment' | 'Other';
}

export interface StudyBoard {
  id: string;
  title: string;
  lastActive: string;
  participants: number;
  color: string;
  progress: number;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  type: 'upload' | 'comment' | 'edit' | 'invite';
}
