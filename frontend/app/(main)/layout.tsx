'use client';

/**
 * Main Layout
 * Protected routes layout with sidebar and top navbar
 * Used for: dashboard, study-board, planner, focus, profile, study-buddy, visual-aids
 */

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { ICONS } from '../../constants';
import { useAuthStore } from '../../src/stores/auth.store';
import { useUIStore } from '../../src/stores/ui.store';
import { useSocket } from '../../src/hooks/useCollaboration';
import { AppRoute } from '../../types';
import { DarkModeToggle } from '../../src/components/DarkModeToggle';
import NotificationDropdown from '../../components/NotificationDropdown';
import FocusWidget from '../../components/FocusWidget';

const THEMES = ['indigo', 'blue', 'amber', 'emerald', 'rose'];

// Map pathnames to AppRoute enum values
const getAppRouteFromPath = (path: string): string => {
  const routeMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/study-board': 'study-board',
    '/study-notebook': 'study-notebook',
    '/planner': 'planner',
    '/focus': 'focus',
    '/flashcards': 'flashcards',
    '/profile': 'profile',
    '/usage': 'usage',
    '/subscription': 'subscription',
    '/pricing': 'pricing',
    '/study-buddy': 'study-buddy',
    '/visual-aids': 'visual-aids',
    '/social': 'social',
  };
  // Handle dynamic routes like /study-notebook/[id] and /study-board/[id]
  if (path.startsWith('/study-notebook')) return 'study-notebook';
  if (path.startsWith('/study-board')) return 'study-board';
  return routeMap[path] || 'dashboard';
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated, isLoading } = useAuthStore();
  const { isMobileSidebarOpen, toggleMobileSidebar, theme, setTheme } = useUIStore();

  // Initialize socket connection
  useSocket();

  // Check authentication state and redirect if not authenticated
  useEffect(() => {
    // Allow pricing page to be accessible without authentication
    const publicPaths = ['/pricing', '/subscription'];
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
    
    if (!isAuthenticated && !isLoading && !isPublicPath) {
      // Save current path for redirect after login
      const currentPath = pathname;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  const cycleTheme = () => {
    const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIndex] as 'indigo' | 'blue' | 'amber' | 'emerald' | 'rose');
  };

  const handleLogout = async () => {
    try {
      await logout();
      // The useEffect will handle the redirect based on isAuthenticated state
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect on error
      router.push('/login');
    }
  };

  const handleNavigate = (route: string | AppRoute) => {
    const routeStr = typeof route === 'string' ? route : String(route);
    const pathMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'study-board': '/study-board',
      'study-notebook': '/study-notebook',
      'planner': '/planner',
      'focus': '/focus',
      'flashcards': '/flashcards',
      'profile': '/profile',
      'usage': '/usage',
      'subscription': '/subscription',
      'pricing': '/pricing',
      'study-buddy': '/study-buddy',
      'visual-aids': '/visual-aids',
      'social': '/social',
    };
    router.push(pathMap[routeStr] || '/dashboard');
  };

  const currentRoute = getAppRouteFromPath(pathname);

  // Show loading state during logout
  if (!isAuthenticated && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 dark:border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400 font-semibold">Logging out...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Sidebar 
        currentRoute={currentRoute as AppRoute} 
        onNavigate={handleNavigate} 
        isMobileOpen={isMobileSidebarOpen}
        setMobileOpen={toggleMobileSidebar}
        onLogout={handleLogout}
        userRole={user?.role || 'student'}
        onCycleTheme={cycleTheme}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleMobileSidebar}
              className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            <div className="hidden md:flex items-center bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-2 w-72 border-2 border-transparent focus-within:border-indigo-200 dark:focus-within:border-indigo-700 focus-within:bg-white dark:focus-within:bg-slate-700 transition-all shadow-inner">
              <span className="text-slate-300 dark:text-slate-500"><ICONS.Search size={18} strokeWidth={3} /></span>
              <input 
                type="text" 
                placeholder="Search your knowledge..." 
                className="bg-transparent border-none outline-none text-sm ml-2 w-full text-slate-600 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-500 font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <DarkModeToggle />
            <NotificationDropdown />
            <div className="h-8 w-1 bg-slate-100 dark:bg-slate-700 mx-1 hidden md:block rounded-full"></div>
            <div 
              className="flex items-center gap-3 pl-1 md:pl-2 cursor-pointer group"
              onClick={() => router.push('/profile')}
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{user?.role || 'Student'}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-indigo-400 to-indigo-500 dark:from-indigo-600 dark:to-indigo-700 flex items-center justify-center text-white font-black text-xl border-2 border-white dark:border-slate-800 shadow-lg group-hover:scale-105 transition-all">
                {(user?.name?.[0] || 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto md:p-8  bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>

      {/* Focus Widget - only shown on protected pages when logged in */}
      <FocusWidget />
    </div>
  );
}
