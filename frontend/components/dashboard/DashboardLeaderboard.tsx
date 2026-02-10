'use client';

import React from 'react';
import { Card, Button } from '../UIElements';
import { ICONS } from '../../constants';
import { AppRoute } from '../../types';
import type { LeaderboardEntry } from '@/lib/services/gamification.service';

interface DashboardLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  onNavigate?: (route: AppRoute) => void;
}

export const DashboardLeaderboard: React.FC<DashboardLeaderboardProps> = ({ 
  leaderboard, 
  onNavigate 
}) => {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">Friend Leaderboard</h3>
        <ICONS.Trophy className="text-amber-500" size={20} />
      </div>
      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Add friends to compete!</p>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => onNavigate?.(AppRoute.PROFILE)}>
              Add Friends
            </Button>
          </div>
        ) : leaderboard.slice(0, 5).map((entry) => (
          <div 
            key={entry.userId} 
            className={`flex items-center gap-3 p-3 rounded-xl ${entry.isCurrentUser ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-700' : 'bg-slate-50 dark:bg-slate-800'}`}
          >
            <div className="font-black text-slate-400 dark:text-slate-500 w-6">#{entry.rank}</div>
            {entry.avatar ? (
              <img src={entry.avatar} alt={entry.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-sm">
                {entry.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{entry.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{entry.xp.toLocaleString()} XP</p>
            </div>
            {entry.streak > 0 && (
              <div className="flex items-center gap-1 text-xs font-bold text-rose-500">
                <ICONS.Flame size={14} />
                {entry.streak}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
