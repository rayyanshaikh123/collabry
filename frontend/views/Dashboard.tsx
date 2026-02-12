'use client';

import React, { useEffect, useState } from 'react';
import { Card, LoadingPage } from '../components/UIElements';
import { AppRoute } from '@/types';
import { useAuthStore } from '@/lib/stores/auth.store';
import { gamificationService, GamificationStats, LeaderboardEntry } from '@/lib/services/gamification.service';
import { studyPlannerService, StudyPlan, StudyTask } from '@/lib/services/studyPlanner.service';
import PersonalProgress from '../components/gamification/PersonalProgress';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { StatsCards } from '../components/dashboard/StatsCards';
import { ActivityOverview } from '../components/dashboard/ActivityOverview';
import { StudyPlansSection } from '../components/dashboard/StudyPlansSection';
import { TodayTasks } from '../components/dashboard/TodayTasks';
import { DashboardLeaderboard } from '../components/dashboard/DashboardLeaderboard';

interface DashboardProps {
  onNavigate?: (route: AppRoute) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();

  // State management
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);
  const [personalProgress, setPersonalProgress] = useState<any>(null);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [todayTasks, setTodayTasks] = useState<StudyTask[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all data with a hard timeout to prevent infinite loading
  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('Dashboard data loading timeout — showing dashboard with defaults');
        setLoading(false);
      }
    }, 10000); // 10s hard timeout

    const loadDashboardData = async () => {
      try {
        // Each call is individually wrapped so one failure doesn't block others
        const [stats, progress, plans, tasks, leaderboardData] = await Promise.all([
          gamificationService.getUserStats().catch(() => null),
          gamificationService.getPersonalProgress().catch(() => null),
          studyPlannerService.getPlans({ status: 'active' }).catch(() => []),
          studyPlannerService.getTodayTasks().catch(() => []),
          gamificationService.getFriendLeaderboard().catch(() => []),
        ]);

        if (!cancelled) {
          setGamificationStats(stats);
          setPersonalProgress(progress);
          setStudyPlans((plans as StudyPlan[]).slice(0, 4));
          setTodayTasks((tasks as StudyTask[]).slice(0, 5));
          setLeaderboard(leaderboardData as LeaderboardEntry[]);
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  if (loading) {
    return <LoadingPage />;
  }

  const getColorForPlan = (index: number) => {
    const colors = [
      'bg-indigo-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-purple-500',
      'bg-blue-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-8 pb-10 text-slate-800 dark:text-slate-200 animate-in fade-in duration-700">
      {/* Hero / Profile Stats */}
      <DashboardHero
        user={user}
        gamificationStats={gamificationStats}
        onNavigate={onNavigate}
      />

      {/* Stats Cards */}
      {gamificationStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      )}

      {/* Activity Overview - Graphical Dashboard */}
      {gamificationStats && <ActivityOverview gamificationStats={gamificationStats} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Active Study Plans */}
          <StudyPlansSection studyPlans={studyPlans} onNavigate={onNavigate} />
        </div>

        {/* Sidebar Mini Components */}
        <div className="space-y-8">
          {/* Today's Tasks */}
          <TodayTasks todayTasks={todayTasks} onNavigate={onNavigate} />

          {/* Leaderboard */}
          <DashboardLeaderboard leaderboard={leaderboard} onNavigate={onNavigate} />

          {/* You vs You - Personal Progress */}
          {personalProgress?.hasHistory && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">You vs You</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Your progress compared to last week
              </p>
              <PersonalProgress
                currentStats={personalProgress.current}
                previousStats={personalProgress.previous}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
