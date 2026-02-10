'use client';

import React from 'react';
import { Card, Badge } from '../UIElements';
import type { GamificationStats } from '@/lib/services/gamification.service';

interface ActivityOverviewProps {
  gamificationStats: GamificationStats;
}

export const ActivityOverview: React.FC<ActivityOverviewProps> = ({ gamificationStats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Weekly Activity Chart */}
      <Card className="md:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Weekly Activity</h3>
          <Badge variant="indigo">Last 7 Days</Badge>
        </div>
        <div className="flex items-end justify-between gap-2 h-48">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
            const height = Math.random() * 100; // Replace with real data
            const isToday = i === new Date().getDay();
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-t-xl relative overflow-hidden" style={{ height: `${Math.max(height, 20)}%` }}>
                  <div 
                    className={`absolute bottom-0 w-full transition-all duration-500 ${isToday ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                    style={{ height: '100%' }}
                  />
                </div>
                <span className={`text-xs font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span className="text-slate-600 dark:text-slate-400">Study Sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded"></div>
            <span className="text-slate-600 dark:text-slate-400">Today</span>
          </div>
        </div>
      </Card>

      {/* Quick Stats Radial */}
      <Card className="flex flex-col items-center justify-center">
        <div className="relative w-40 h-40 mb-4">
          <svg className="transform -rotate-90" width="160" height="160">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-slate-100 dark:text-slate-700"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeDasharray={`${(gamificationStats.stats.tasksCompleted / (gamificationStats.stats.tasksCompleted + 10)) * 440} 440`}
              className="text-indigo-500 transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-200">
              {gamificationStats.stats.tasksCompleted}
            </div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Tasks Done</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="text-center">
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {gamificationStats.stats.plansCreated}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Plans</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">
              {gamificationStats.xp.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">XP</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
