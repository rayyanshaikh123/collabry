/**
 * Route Configuration
 * Centralized route definitions with protection rules
 */

import { AppRoute } from '@/types';
import type { UserRole } from '@/types';

export interface RouteConfig {
  route: AppRoute;
  path: string;
  requiresAuth: boolean;
  allowedRoles?: UserRole[];
  title: string;
}

export const ROUTES: Partial<Record<AppRoute, RouteConfig>> = {
  [AppRoute.LANDING]: {
    route: AppRoute.LANDING,
    path: '/',
    requiresAuth: false,
    title: 'Collabry - AI-Powered Collaborative Study',
  },
  [AppRoute.ROLE_SELECTION]: {
    route: AppRoute.ROLE_SELECTION,
    path: '/select-role',
    requiresAuth: false,
    title: 'Select Your Role',
  },
  [AppRoute.LOGIN]: {
    route: AppRoute.LOGIN,
    path: '/login',
    requiresAuth: false,
    title: 'Login',
  },
  [AppRoute.REGISTER]: {
    route: AppRoute.REGISTER,
    path: '/register',
    requiresAuth: false,
    title: 'Register',
  },
  [AppRoute.FORGOT_PASSWORD]: {
    route: AppRoute.FORGOT_PASSWORD,
    path: '/forgot-password',
    requiresAuth: false,
    title: 'Forgot Password',
  },
  [AppRoute.DASHBOARD]: {
    route: AppRoute.DASHBOARD,
    path: '/dashboard',
    requiresAuth: true,
    allowedRoles: ['student', 'mentor', 'admin'],
    title: 'Dashboard',
  },
  [AppRoute.STUDY_BOARD]: {
    route: AppRoute.STUDY_BOARD,
    path: '/study-board',
    requiresAuth: true,
    allowedRoles: ['student', 'mentor', 'admin'],
    title: 'Study Board',
  },
  [AppRoute.PLANNER]: {
    route: AppRoute.PLANNER,
    path: '/planner',
    requiresAuth: true,
    allowedRoles: ['student', 'mentor', 'admin'],
    title: 'Planner',
  },
  [AppRoute.FOCUS]: {
    route: AppRoute.FOCUS,
    path: '/focus',
    requiresAuth: true,
    allowedRoles: ['student', 'mentor', 'admin'],
    title: 'Focus Mode',
  },
  [AppRoute.FLASHCARDS]: {
    route: AppRoute.FLASHCARDS,
    path: '/flashcards',
    requiresAuth: true,
    allowedRoles: ['student', 'mentor', 'admin'],
    title: 'Flashcards',
  },
  [AppRoute.STUDY_NOTEBOOK]: {
    route: AppRoute.STUDY_NOTEBOOK,
    path: '/study-notebook',
    requiresAuth: true,
    allowedRoles: ['student', 'mentor', 'admin'],
    title: 'Study Notebook',
  },
  [AppRoute.LEARNING_JOURNAL]: {
    route: AppRoute.LEARNING_JOURNAL,
    path: '/journal',
    requiresAuth: true,
    allowedRoles: ['student', 'mentor', 'admin'],
    title: 'Learning Journal',
  },
  [AppRoute.PROFILE]: {
    route: AppRoute.PROFILE,
    path: '/profile',
    requiresAuth: true,
    allowedRoles: ['student', 'mentor', 'admin'],
    title: 'Profile',
  },
  [AppRoute.ADMIN]: {
    route: AppRoute.ADMIN,
    path: '/admin',
    requiresAuth: true,
    allowedRoles: ['admin'],
    title: 'Admin Dashboard',
  },
  [AppRoute.ADMIN_USERS]: {
    route: AppRoute.ADMIN_USERS,
    path: '/admin/users',
    requiresAuth: true,
    allowedRoles: ['admin'],
    title: 'User Management',
  },
  [AppRoute.ADMIN_MODERATION]: {
    route: AppRoute.ADMIN_MODERATION,
    path: '/admin/moderation',
    requiresAuth: true,
    allowedRoles: ['admin'],
    title: 'Content Moderation',
  },
  [AppRoute.ADMIN_AI]: {
    route: AppRoute.ADMIN_AI,
    path: '/admin/ai',
    requiresAuth: true,
    allowedRoles: ['admin'],
    title: 'AI Configuration',
  },
  [AppRoute.ADMIN_REPORTS]: {
    route: AppRoute.ADMIN_REPORTS,
    path: '/admin/reports',
    requiresAuth: true,
    allowedRoles: ['admin'],
    title: 'Reports',
  },
  [AppRoute.ADMIN_BOARDS]: {
    route: AppRoute.ADMIN_BOARDS,
    path: '/admin/boards',
    requiresAuth: true,
    allowedRoles: ['admin'],
    title: 'Board Management',
  },
  [AppRoute.ADMIN_SETTINGS]: {
    route: AppRoute.ADMIN_SETTINGS,
    path: '/admin/settings',
    requiresAuth: true,
    allowedRoles: ['admin'],
    title: 'Settings',
  },
};

/**
 * Check if a route requires authentication
 */
export const requiresAuth = (route: AppRoute): boolean => {
  return ROUTES[route]?.requiresAuth ?? false;
};

/**
 * Check if user has access to a route
 */
export const hasAccess = (route: AppRoute, userRole?: UserRole): boolean => {
  const config = ROUTES[route];
  
  if (!config) return false;
  if (!config.requiresAuth) return true;
  if (!userRole) return false;
  if (!config.allowedRoles) return true;
  
  return config.allowedRoles.includes(userRole);
};

/**
 * Get route configuration
 */
export const getRouteConfig = (route: AppRoute): RouteConfig | undefined => {
  return ROUTES[route];
};
