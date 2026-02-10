'use client';

import React from 'react';
import { Card, Button } from '../UIElements';
import { ICONS } from '../../constants';
import { AppRoute } from '../../types';
import type { GamificationStats } from '@/lib/services/gamification.service';

interface DashboardHeroProps {
  user: any;
  gamificationStats: GamificationStats | null;
  onNavigate?: (route: AppRoute) => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({ 
  user, 
  gamificationStats, 
  onNavigate 
}) => {
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const userInitials = user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'S';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
      <div className="lg:col-span-8 flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-700 dark:to-purple-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl dark:shadow-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative shrink-0">
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt="Profile" 
              className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] border-4 border-white/30 shadow-2xl object-cover"
            />
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] border-4 border-white/30 shadow-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 dark:from-indigo-600 dark:to-indigo-800 flex items-center justify-center text-white font-black text-4xl">
              {userInitials}
            </div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
          <h2 className="text-3xl font-black">Welcome back, {firstName}! 🚀</h2>
          <p className="text-indigo-100 font-medium">
            {gamificationStats ? (
              <>
                You have <span className="text-amber-300 font-black">{gamificationStats.xp.toLocaleString()} XP</span>!
              </>
            ) : (
              'Keep learning and growing!'
            )}
          </p>
        </div>
        <div className="flex gap-3 md:flex-col lg:flex-row">
          <Button variant="warning" size="sm" className="gap-2" onClick={() => onNavigate?.(AppRoute.PROFILE)}>
            <ICONS.Trophy size={16}/> Achievements
          </Button>
          <Button variant="success" size="sm" className="gap-2" onClick={() => onNavigate?.(AppRoute.STUDY_BOARD)}>
            <ICONS.Plus size={16}/> New Study
          </Button>
        </div>
      </div>

      <div className="lg:col-span-4 h-full">
        <div onClick={() => onNavigate?.(AppRoute.FOCUS)} className="cursor-pointer">
          <Card className="h-full flex flex-col justify-center bg-gradient-to-br from-rose-50 dark:from-rose-900/30 to-white dark:to-slate-800 border-rose-100 dark:border-rose-800 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-rose-500 dark:bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/50">
                <ICONS.Flame size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">
                  {gamificationStats?.streak.current || 0} Day Streak!
                </h3>
                <p className="text-xs text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider">
                  {gamificationStats?.streak.current === 0 ? 'Start studying today!' : "Keep it going!"}
                </p>
              </div>
            </div>
            <div className="flex justify-between gap-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                const isActive = i < (gamificationStats?.streak.current || 0);
                return (
                  <div key={i} className={`flex-1 h-12 rounded-xl flex items-center justify-center text-[10px] font-black ${isActive ? 'bg-rose-500 dark:bg-rose-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-400'}`}>
                    {day}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
