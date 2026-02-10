'use client';

import React from 'react';
import { Card } from '../UIElements';
import type { GamificationStats } from '@/lib/services/gamification.service';

interface StatsCardsProps {
  gamificationStats: GamificationStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ gamificationStats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 border-blue-100 dark:border-blue-800">
        <div className="text-center space-y-2">
          <div className="text-3xl font-black text-blue-600 dark:text-blue-400">{gamificationStats.stats.tasksCompleted}</div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Tasks Completed</div>
        </div>
      </Card>
      <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 border-emerald-100 dark:border-emerald-800">
        <div className="text-center space-y-2">
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{Math.round(gamificationStats.stats.totalStudyTime / 60)}h</div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Study Time</div>
        </div>
      </Card>
      <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800 border-purple-100 dark:border-purple-800">
        <div className="text-center space-y-2">
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400">{gamificationStats.badges.length}</div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Badges Earned</div>
        </div>
      </Card>
      <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 border-amber-100 dark:border-amber-800">
        <div className="text-center space-y-2">
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{gamificationStats.streak.longest}</div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Longest Streak</div>
        </div>
      </Card>
    </div>
  );
};
