'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../components/UIElements';
import { AppRoute } from '../types';
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

  // Load all data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Services now handle their own errors and return null/empty arrays
      const [stats, progress, plans, tasks, leaderboardData] = await Promise.all([
        gamificationService.getUserStats(),
        gamificationService.getPersonalProgress(),
        studyPlannerService.getPlans({ status: 'active' }).catch(() => []),
        studyPlannerService.getTodayTasks().catch(() => []),
        gamificationService.getFriendLeaderboard(),
      ]);

      setGamificationStats(stats);
      setPersonalProgress(progress);
      setStudyPlans(plans.slice(0, 4)); // Show top 4 plans
      setTodayTasks(tasks.slice(0, 5)); // Show top 5 tasks
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8 pb-10 text-slate-800 dark:text-slate-200">
      {/* Hero / Profile Stats */}
      <DashboardHero 
        user={user} 
        gamificationStats={gamificationStats}
        onNavigate={onNavigate}
      />

      {/* Stats Cards */}
      {gamificationStats && <StatsCards gamificationStats={gamificationStats} />}

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
