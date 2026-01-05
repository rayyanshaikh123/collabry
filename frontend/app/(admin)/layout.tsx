'use client';

/**
 * Admin Layout
 * Protected admin routes with admin sidebar and role guard
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '../../src/guards/RoleGuard';
import { useAuthStore } from '../../src/stores/auth.store';
import Sidebar from '../../components/Sidebar';
import { useUIStore } from '../../src/stores/ui.store';
import { ICONS } from '../../constants';
import { AppRoute } from '../../types';

const THEMES = ['indigo', 'blue', 'amber', 'emerald', 'rose'];

// Create a context to share the admin sub-route state
export const AdminRouteContext = React.createContext<{
  currentSubRoute: AppRoute;
  setCurrentSubRoute: (route: AppRoute) => void;
}>({
  currentSubRoute: AppRoute.ADMIN,
  setCurrentSubRoute: () => {},
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) { 
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isMobileSidebarOpen, toggleMobileSidebar, theme, setTheme } = useUIStore();
  const [currentSubRoute, setCurrentSubRoute] = useState<AppRoute>(AppRoute.ADMIN);

  const cycleTheme = () => {
    const nextIndex = (THEMES.indexOf(theme) + 1) % THEMES.length;
    setTheme(THEMES[nextIndex] as any);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleNavigate = (route: string | AppRoute) => {
    // Convert route to AppRoute enum if it's a string
    const routeValue = typeof route === 'string' ? route : route.toString();
    
    // Map the route to AppRoute enum
    const routeEnumMap: Record<string, AppRoute> = {
      'admin': AppRoute.ADMIN,
      'admin-users': AppRoute.ADMIN_USERS,
      'admin-moderation': AppRoute.ADMIN_MODERATION,
      'admin-ai': AppRoute.ADMIN_AI,
      'admin-reports': AppRoute.ADMIN_REPORTS,
      'admin-boards': AppRoute.ADMIN_BOARDS,
      'admin-settings': AppRoute.ADMIN_SETTINGS,
    };
    
    const targetRoute = routeEnumMap[routeValue] || AppRoute.ADMIN;
    setCurrentSubRoute(targetRoute);
  };

  return (
    <RoleGuard 
      allowedRoles={['admin']} 
      onRedirect={() => router.push('/dashboard')}
    >
      <AdminRouteContext.Provider value={{ currentSubRoute, setCurrentSubRoute }}>
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <Sidebar 
            currentRoute={currentSubRoute} 
            onNavigate={handleNavigate as any} 
            isMobileOpen={isMobileSidebarOpen}
            setMobileOpen={toggleMobileSidebar}
            onLogout={handleLogout}
            userRole={user?.role || 'admin'}
            onCycleTheme={cycleTheme}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
          {/* Admin Top Navbar */}
          <header className="h-16 bg-white border-b-2 border-slate-100 flex items-center justify-between px-4 md:px-8 shrink-0 z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleMobileSidebar}
                className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <ICONS.Admin size={24} className="text-rose-500" />
                <h1 className="text-xl font-black text-slate-800">Admin Dashboard</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <button className="p-2.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-2xl relative transition-all">
                <ICONS.Notification size={22} strokeWidth={2.5} />
                <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 border-2 border-white rounded-full"></span>
              </button>
              <div className="h-8 w-1 bg-slate-100 mx-1 hidden md:block rounded-full"></div>
              <div className="flex items-center gap-3 pl-1 md:pl-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-700">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-rose-500 font-bold uppercase">Administrator</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center text-white font-black text-xl border-2 border-white shadow-lg">
                  {(user?.name?.[0] || 'A').toUpperCase()}
                </div>
              </div>
            </div>
          </header>

          {/* Admin Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
        </div>
      </AdminRouteContext.Provider>
    </RoleGuard>
  );
}