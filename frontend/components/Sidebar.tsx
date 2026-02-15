'use client';

import React, { useState } from 'react';
import { ICONS } from '../constants';
import { AppRoute } from '@/types';

interface NavItemProps {
  id: AppRoute;
  label: string;
  icon: React.ElementType;
  currentRoute: AppRoute;
  isCollapsed: boolean;
  onNavigate: (route: AppRoute) => void;
  setMobileOpen: (open: boolean) => void;
}

const NavItem: React.FC<NavItemProps> = ({
  id,
  label,
  icon: Icon,
  currentRoute,
  isCollapsed,
  onNavigate,
  setMobileOpen
}) => {
  const isActive = currentRoute === id;
  return (
    <button
      onClick={() => {
        onNavigate(id);
        setMobileOpen(false);
      }}
      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-4 px-4 py-3.5'} rounded-[1.5rem] transition-all mb-2 bouncy-hover press-effect border-b-2 ${isActive
        ? 'bg-indigo-500 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-indigo-900/50 border-indigo-700 dark:border-indigo-800'
        : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-500 dark:hover:text-indigo-400 border-transparent'
        }`}
    >
      <span className={`${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'} flex items-center justify-center`}>
        <Icon size={22} strokeWidth={isActive ? 3 : 2} />
      </span>
      {!isCollapsed && <span className="font-black text-sm text-left truncate">{label}</span>}
    </button>
  );
};

interface SidebarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  onLogout: () => void;
  userRole: 'student' | 'admin' | 'mentor';
  onCycleTheme?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate, isMobileOpen, setMobileOpen, onLogout, userRole, onCycleTheme }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLogoClick = () => {
    if (onCycleTheme) {
      setIsAnimating(true);
      onCycleTheme();
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const studentItems = [
    { id: AppRoute.DASHBOARD, label: 'Learning Path', icon: ICONS.Dashboard },
    { id: AppRoute.STUDY_BOARD, label: 'Study Boards', icon: ICONS.StudyBoard },


    { id: AppRoute.SOCIAL, label: 'Social Hub', icon: ICONS.Profile },
    { id: AppRoute.STUDY_NOTEBOOK, label: 'Study Notebook', icon: ICONS.Book },
    { id: AppRoute.PLANNER, label: 'Plan It', icon: ICONS.Planner },
    { id: AppRoute.RECYCLE_BIN, label: 'Recycle Bin', icon: ICONS.Trash },

  ];

  const adminItems = [
    { id: AppRoute.ADMIN, label: 'Platform Overview', icon: ICONS.Dashboard },
    { id: AppRoute.ADMIN_USERS, label: 'Manage Users', icon: ICONS.Profile },
    { id: AppRoute.ADMIN_MODERATION, label: 'Reported Content', icon: ICONS.Admin },
    { id: AppRoute.ADMIN_AI, label: 'Monitor AI Usage', icon: ICONS.Sparkles },
    { id: AppRoute.ADMIN_REPORTS, label: 'Deep Reports', icon: ICONS.Download },
    { id: AppRoute.ADMIN_BOARDS, label: 'Govern Boards', icon: ICONS.StudyBoard },
    { id: AppRoute.ADMIN_COUPONS, label: 'Manage Coupons', icon: ICONS.Flashcards },
    { id: AppRoute.ADMIN_AUDIT, label: 'Audit Logs', icon: ICONS.Eye },
    { id: AppRoute.ADMIN_NOTIFICATIONS, label: 'Notifications', icon: ICONS.Notification },
    { id: AppRoute.ADMIN_SUBSCRIPTIONS, label: 'Subscriptions', icon: ICONS.TrendingUp },
    { id: AppRoute.ADMIN_SETTINGS, label: 'Platform Settings', icon: ICONS.Settings },
  ];

  const sidebarClasses = `fixed inset-y-0 left-0 z-50 bg-slate-50/50 dark:bg-slate-900/50 border-r-2 border-slate-100 dark:border-slate-800 transition-all duration-300 lg:static 
    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
    ${isCollapsed ? 'w-24' : 'w-72'}`;

  const currentMenuItems = userRole === 'admin' ? adminItems : studentItems;

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-indigo-900/10 dark:bg-indigo-950/30 backdrop-blur-md z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full p-6">
          <div className={`flex items-center mb-12 px-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogoClick}
                  className={`w-12 h-12 bg-linear-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 border-b-4 border-indigo-700 transition-all active:translate-y-1 active:border-b-0 ${isAnimating ? 'animate-logo-pop' : ''}`}
                  title="Click to cycle theme!"
                >
                  <span className="text-white font-black text-3xl font-display">C</span>
                </button>
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-200 font-display tracking-tight">Collabry</h1>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800 rounded-xl hidden lg:block border-2 border-transparent hover:border-slate-100 dark:hover:border-slate-700"
            >
              <svg className={`w-6 h-6 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto no-scrollbar pb-4">
            <p className={`text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] mb-4 px-4 ${isCollapsed ? 'text-center' : ''}`}>
              {userRole === 'admin' ? 'COMMAND CENTER' : 'MAIN'}
            </p>
            {currentMenuItems.map(item => (
              <NavItem
                key={item.id}
                {...item}
                currentRoute={currentRoute}
                isCollapsed={isCollapsed}
                onNavigate={onNavigate}
                setMobileOpen={setMobileOpen}
              />
            ))}

            {userRole === 'student' && (
              <>
                <div className="mt-10 mb-4 px-4 border-t border-slate-100 dark:border-slate-800 pt-6" />
                <p className={`text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] mb-4 px-4 ${isCollapsed ? 'text-center' : ''}`}>
                  PERSONAL
                </p>
                <NavItem
                  id={AppRoute.PROFILE}
                  label="My Journey"
                  icon={ICONS.Profile}
                  currentRoute={currentRoute}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                  setMobileOpen={setMobileOpen}
                />
                <NavItem
                  id={AppRoute.PROFILE_USAGE}
                  label="AI Usage"
                  icon={ICONS.Focus}
                  currentRoute={currentRoute}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                  setMobileOpen={setMobileOpen}
                />
                <NavItem
                  id={AppRoute.SETTINGS}
                  label="Settings"
                  icon={ICONS.Settings}
                  currentRoute={currentRoute}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                  setMobileOpen={setMobileOpen}
                />
                <NavItem
                  id={AppRoute.SUBSCRIPTION}
                  label="Subscription"
                  icon={ICONS.TrendingUp}
                  currentRoute={currentRoute}
                isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                  setMobileOpen={setMobileOpen}
                />
                <NavItem
                  id={AppRoute.PRICING}
                  label="Pricing"
                  icon={ICONS.Download}
                  currentRoute={currentRoute}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                  setMobileOpen={setMobileOpen}
                />
              </>
            )}
          </nav>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-[1.5rem] text-rose-400 dark:text-rose-500 font-black hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all bouncy-hover ${isCollapsed ? 'justify-center' : ''}`}
            >
              <span><ICONS.Logout size={24} strokeWidth={3} /></span>
              {!isCollapsed && <span className="text-sm">Leave Studio</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
