import React, { useEffect, useState } from 'react';
import { Card, Badge } from '../UIElements';
import { ICONS } from '../../constants';
import { gamificationService, GamificationStats } from '@/lib/services/gamification.service';

interface AchievementsDisplayProps {
  userId?: string;
}

const AchievementsDisplay: React.FC<AchievementsDisplayProps> = ({ userId }) => {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await gamificationService.getUserStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading gamification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
      </div>
    );
  }

  if (!stats) return null;

  const incompleteAchievements = stats.achievements.filter(a => !a.completed);
  const completedAchievements = stats.achievements.filter(a => a.completed);

  return (
    <div className="space-y-8">
      {/* XP Overview */}
      <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black mb-2">{stats.xp.toLocaleString()} XP</h2>
            <p className="text-indigo-100 font-medium">
              Total Experience Points Earned
            </p>
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <ICONS.Trophy size={40} className="text-amber-300" />
          </div>
        </div>
      </Card>

      {/* Badges Collection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Badges Collected</h3>
          <Badge variant="indigo">{stats.badges.length}</Badge>
        </div>
        {stats.badges.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                No badges yet. Complete tasks to earn your first badge!
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.badges.map((badge) => (
              <Card key={badge.id} className="text-center hover:shadow-lg transition-all cursor-pointer group">
                <div className="text-5xl mb-3 transform group-hover:scale-110 transition-transform">
                  {badge.icon}
                </div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1">
                  {badge.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  {badge.description}
                </p>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold">
                  Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Active Achievements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Active Achievements</h3>
          <Badge variant="emerald">
            {completedAchievements.length}/{stats.achievements.length}
          </Badge>
        </div>
        <div className="space-y-4">
          {incompleteAchievements.length === 0 ? (
            <Card>
              <div className="text-center py-8">
                <div className="text-5xl mb-3">🎯</div>
                <p className="text-slate-600 dark:text-slate-400 font-bold">
                  All achievements completed! 🎉
                </p>
              </div>
            </Card>
          ) : (
            incompleteAchievements.map((achievement) => {
              const progressPercent = (achievement.progress / achievement.target) * 100;
              return (
                <Card key={achievement.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                      <ICONS.Target size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                            {achievement.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {achievement.description}
                          </p>
                        </div>
                        <Badge variant="slate" className="ml-2">
                          {achievement.progress}/{achievement.target}
                        </Badge>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {Math.round(progressPercent)}% complete
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Completed Achievements */}
      {completedAchievements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Completed Achievements</h3>
          </div>
          <div className="space-y-3">
            {completedAchievements.map((achievement) => (
              <Card key={achievement.id} className="bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500 dark:bg-emerald-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                    <ICONS.CheckCircle size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {achievement.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Completed {achievement.completedAt ? new Date(achievement.completedAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                  <ICONS.Trophy className="text-amber-500" size={20} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div>
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-4">Your Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="text-center bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-800 border-blue-100 dark:border-blue-800">
            <ICONS.CheckCircle className="mx-auto mb-2 text-blue-500" size={24} />
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.stats.tasksCompleted}
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
              Tasks Completed
            </div>
          </Card>
          
          <Card className="text-center bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-800 border-emerald-100 dark:border-emerald-800">
            <ICONS.Clock className="mx-auto mb-2 text-emerald-500" size={24} />
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {Math.round(stats.stats.totalStudyTime / 60)}h
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
              Study Time
            </div>
          </Card>
          
          <Card className="text-center bg-gradient-to-br from-rose-50 to-white dark:from-rose-900/20 dark:to-slate-800 border-rose-100 dark:border-rose-800">
            <ICONS.Flame className="mx-auto mb-2 text-rose-500" size={24} />
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {stats.streak.longest}
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
              Longest Streak
            </div>
          </Card>
          
          <Card className="text-center bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-800 border-purple-100 dark:border-purple-800">
            <ICONS.Book className="mx-auto mb-2 text-purple-500" size={24} />
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {stats.stats.plansCreated}
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
              Study Plans
            </div>
          </Card>
          
          <Card className="text-center bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-800 border-amber-100 dark:border-amber-800">
            <ICONS.StickyNote className="mx-auto mb-2 text-amber-500" size={24} />
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.stats.notesCreated}
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
              Notes Created
            </div>
          </Card>
          
          <Card className="text-center bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 border-indigo-100 dark:border-indigo-800">
            <ICONS.Trophy className="mx-auto mb-2 text-indigo-500" size={24} />
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.badges.length}
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">
              Badges Earned
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AchievementsDisplay;
