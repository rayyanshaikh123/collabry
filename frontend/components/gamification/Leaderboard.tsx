import React, { useEffect, useState } from 'react';
import { Card, Badge, Button } from '../UIElements';
import { ICONS } from '../../constants';
import { gamificationService, LeaderboardEntry } from '@/lib/services/gamification.service';
import { useAuthStore } from '@/lib/stores/auth.store';

interface LeaderboardProps {
  type?: 'xp' | 'level' | 'streak' | 'tasks';
  friendsOnly?: boolean;
  limit?: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  type = 'xp', 
  friendsOnly = false,
  limit = 10 
}) => {
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(type);

  useEffect(() => {
    loadLeaderboard();
  }, [selectedType, friendsOnly]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = friendsOnly 
        ? await gamificationService.getFriendLeaderboard()
        : await gamificationService.getLeaderboard(selectedType, limit);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'xp': return { label: 'XP', icon: ICONS.Zap };
      case 'level': return { label: 'Level', icon: ICONS.Trophy };
      case 'streak': return { label: 'Streak', icon: ICONS.Flame };
      case 'tasks': return { label: 'Tasks', icon: ICONS.CheckCircle };
      default: return { label: 'XP', icon: ICONS.Zap };
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-amber-500';
    if (rank === 2) return 'text-slate-400';
    if (rank === 3) return 'text-amber-700';
    return 'text-slate-400';
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-amber-100 dark:bg-amber-900/30';
    if (rank === 2) return 'bg-slate-100 dark:bg-slate-700/30';
    if (rank === 3) return 'bg-amber-50 dark:bg-amber-900/20';
    return '';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      {!friendsOnly && (
        <div className="flex gap-2 flex-wrap">
          {(['xp', 'streak', 'tasks'] as const).map((t) => {
            const display = getTypeDisplay(t);
            return (
              <Button
                key={t}
                variant={selectedType === t ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(t)}
                className="gap-2"
              >
                <display.icon size={16} />
                {display.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Leaderboard Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">
          {friendsOnly ? 'Friend Rankings' : 'Global Leaderboard'}
        </h3>
        <Badge variant="indigo">{leaderboard.length} Students</Badge>
      </div>

      {/* Empty State */}
      {leaderboard.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">
              {friendsOnly 
                ? 'Add friends to see rankings!' 
                : 'No rankings yet. Be the first!'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.userId === user?.id || entry.isCurrentUser;
            const TypeIcon = getTypeDisplay(selectedType).icon;
            
            return (
              <Card 
                key={entry.userId}
                className={`${isCurrentUser ? 'border-2 border-indigo-500 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : ''} ${getRankBg(entry.rank)}`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`text-2xl font-black ${getRankColor(entry.rank)} w-8 text-center`}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </div>

                  {/* Avatar */}
                  {entry.avatar ? (
                    <img 
                      src={entry.avatar} 
                      alt={entry.name} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-lg border-2 border-white dark:border-slate-700 shadow-md">
                      {entry.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-black text-slate-800 dark:text-slate-200 truncate">
                        {entry.name}
                      </h4>
                      {isCurrentUser && (
                        <Badge variant="indigo" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                        {entry.xp.toLocaleString()} XP
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <TypeIcon size={18} className="text-slate-400" />
                      <span className="text-xl font-black text-slate-800 dark:text-slate-200">
                        {selectedType === 'xp' && entry.xp.toLocaleString()}
                        {selectedType === 'streak' && entry.streak}
                        {selectedType === 'tasks' && entry.tasksCompleted}
                      </span>
                    </div>
                    
                    {/* Additional indicators */}
                    <div className="flex items-center gap-2">
                      {entry.streak > 0 && (
                        <div className="flex items-center gap-1 text-xs font-bold text-rose-500">
                          <ICONS.Flame size={12} />
                          {entry.streak}
                        </div>
                      )}
                      {entry.badges && entry.badges > 0 && (
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                          <ICONS.Trophy size={12} />
                          {entry.badges}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
