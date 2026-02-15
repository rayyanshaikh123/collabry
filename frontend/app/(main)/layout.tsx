'use client';

/**
 * Main Layout
 * Protected routes layout with sidebar and top navbar
 * Used for: dashboard, study-board, planner, profile, study-buddy, visual-aids
 */

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import FocusWidget from '../../components/FocusWidget';
import { ICONS } from '../../constants';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useUIStore } from '@/lib/stores/ui.store';
import { useSocket } from '@/hooks/useCollaboration';
import { AppRoute, ThemeType } from '../../types';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import NotificationDropdown from '../../components/NotificationDropdown';

const THEMES = ['indigo', 'blue', 'amber', 'emerald', 'rose', 'purple', 'cyan', 'pink', 'teal', 'violet', 'orange', 'yellow'];

// Map pathnames to AppRoute enum values
const getAppRouteFromPath = (path: string): string => {
  const routeMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/study-board': 'study-board',
    '/study-notebook': 'study-notebook',
    '/planner': 'planner',
    '/flashcards': 'flashcards',
    '/profile': 'profile',
    '/usage': 'usage',
    '/settings': 'settings',
    '/subscription': 'subscription',
    '/pricing': 'pricing',
    '/study-buddy': 'study-buddy',
    '/visual-aids': 'visual-aids',
    '/social': 'social',
    '/recycle-bin': 'recycle-bin',
  };
  // Handle dynamic routes like /study-notebook/[id] and /study-board/[id]
  if (path.startsWith('/study-notebook')) return 'study-notebook';
  if (path.startsWith('/study-board')) return 'study-board';
  if (path.startsWith('/settings')) return 'settings';
  return routeMap[path] || 'dashboard';
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { isMobileSidebarOpen, toggleMobileSidebar, theme, setTheme } = useUIStore();

  // Client-side mount detection (avoids SSR mismatch).
  const [mounted, setMounted] = useState(false);
  // True once Zustand persist has hydrated AND any needed token refresh has resolved.
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Initialize socket connection
  useSocket();

  // ── Auth resolution: hydration → token refresh → authReady ──────────────
  // After Zustand persist reads localStorage we know whether the user was
  // previously authenticated.  If so, the in-memory accessToken is gone
  // (it's never persisted) so we must refresh it via the httpOnly cookie
  // before any "redirect-to-login" decision is made.
  useEffect(() => {
    let cancelled = false;
    let unsubHydration: (() => void) | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;

    const resolveAuth = async () => {
      if (cancelled) return;
      const state = useAuthStore.getState();
      if (state.isAuthenticated && !state.accessToken) {
        // Persisted auth but no in-memory token → refresh from httpOnly cookie
        try {
          await state.checkAuth();
        } catch {
          // checkAuth already sets isAuthenticated=false on failure
        }
      }
      if (!cancelled) setAuthReady(true);
    };

    // Use Zustand persist's public API to wait for hydration
    if ((useAuthStore as any).persist?.hasHydrated?.()) {
      resolveAuth();
    } else if ((useAuthStore as any).persist?.onFinishHydration) {
      unsubHydration = (useAuthStore as any).persist.onFinishHydration(() => {
        if (!cancelled) resolveAuth();
      });
      // Safety: if hydration callback never fires, proceed after 3 s
      safetyTimer = setTimeout(() => {
        if (!cancelled) resolveAuth();
      }, 3000);
    } else {
      // Fallback: persist API unavailable — resolve after a short wait
      safetyTimer = setTimeout(() => {
        if (!cancelled) resolveAuth();
      }, 150);
    }

    return () => {
      cancelled = true;
      unsubHydration?.();
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  // ── Redirect to login ONLY after auth is definitively resolved ──────────
  // No arbitrary timers — we wait for checkAuth() to finish/fail first.
  useEffect(() => {
    if (!mounted || !authReady) return;

    const publicPaths = ['/pricing', '/subscription'];
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    if (!isAuthenticated && !isPublicPath) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, authReady, isAuthenticated, router, pathname]);

  const cycleTheme = () => {
    const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIndex] as ThemeType);
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
      'flashcards': '/flashcards',
      'profile': '/profile',
      'usage': '/usage',
      'settings': '/settings?tab=notifications',
      'subscription': '/subscription',
      'pricing': '/pricing',
      'study-buddy': '/study-buddy',
      'visual-aids': '/visual-aids',
      'social': '/social',
      'recycle-bin': '/recycle-bin',
    };
    router.push(pathMap[routeStr] || '/dashboard');
  };

  const currentRoute = getAppRouteFromPath(pathname);

  // During SSR / before client mount or auth resolution, render nothing to avoid flash/race conditions.
  if (!mounted || !authReady) {
    return null;
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
            {/* Search bar removed per user request */}
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
          {/* Global Focus widget (fixed bottom-right, only when authenticated) */}
          <FocusWidget />
        </main>
      </div>
    </div>
  );
}


