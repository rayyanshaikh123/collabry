'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, ProgressBar } from '../components/UIElements';
import { ICONS } from '../constants';
import { AppRoute } from '../types';
import { useAuthStore } from '../src/stores/auth.store';
import { gamificationService, GamificationStats, LeaderboardEntry } from '../src/services/gamification.service';
import { studyPlannerService, StudyPlan, StudyTask } from '../src/services/studyPlanner.service';
import PersonalProgress from '../components/gamification/PersonalProgress';

interface DashboardProps {
  onNavigate?: (route: AppRoute) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S';
  
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
    <div className="space-y-8 pb-10 text-slate-800 dark:text-slate-200">
      {/* Hero / Profile Stats */}
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
      {gamificationStats && (
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Active Study Plans */}
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Active Learning Paths</h3>
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.(AppRoute.PLANNER)}>View All</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {studyPlans.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <p className="text-slate-500 dark:text-slate-400 mb-4 font-medium">No active study plans yet. Create your first one!</p>
                  <Button onClick={() => onNavigate?.(AppRoute.PLANNER)}>Create Study Plan</Button>
                </div>
              ) : studyPlans.map((plan, index) => {
                const color = getColorForPlan(index);
                return (
                  <div key={plan.id} onClick={() => onNavigate?.(AppRoute.PLANNER)} className="cursor-pointer">
                    <Card hoverable className="group">
                      <div className="flex items-start gap-5">
                        <div className={`w-16 h-16 ${color} rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-slate-100 dark:shadow-slate-900/50 bouncy-hover`}>
                          <ICONS.Book size={32} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <h4 className="text-lg font-black text-slate-800 dark:text-slate-200 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {plan.title}
                          </h4>
                          {plan.subject && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                              {plan.subject}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                            {plan.completedTasks} of {plan.totalTasks} tasks completed
                          </p>
                          <div className="pt-3">
                            <ProgressBar 
                              progress={plan.completionPercentage} 
                              color={color.replace('bg-', 'bg-')} 
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar Mini Components */}
        <div className="space-y-8">
          {/* Today's Tasks */}
          <Card className="border-indigo-100 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-900/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">Today's Tasks</h3>
              <Badge variant="indigo">{todayTasks.filter(t => t.status === 'completed').length}/{todayTasks.length}</Badge>
            </div>
            <div className="space-y-4">
              {todayTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400 dark:text-slate-500 mb-4">No tasks scheduled for today</p>
                  <Button variant="outline" size="sm" onClick={() => onNavigate?.(AppRoute.PLANNER)}>
                    Create Task
                  </Button>
                </div>
              ) : todayTasks.map(task => {
                const TaskIcon = task.status === 'completed' ? ICONS.Check : ICONS.Uncheck;
                const isCompleted = task.status === 'completed';
                return (
                  <div key={task.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 transition-all border-2 ${isCompleted ? 'border-emerald-100 dark:border-emerald-800' : 'border-white dark:border-slate-800'}`}>
                    <button className={`${isCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-400'} shrink-0`}>
                      <TaskIcon size={24} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black truncate ${isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                        {task.title}
                      </p>
                      <p className="text-[10px] text-indigo-400 dark:text-indigo-500 font-bold uppercase">
                        {task.duration} min • {task.priority}
                      </p>
                    </div>
                  </div>
                );
              })}
              {todayTasks.length > 0 && (
                <Button variant="outline" className="w-full mt-2 border-dashed rounded-2xl" onClick={() => onNavigate?.(AppRoute.PLANNER)}>
                  View All Tasks
                </Button>
              )}
            </div>
          </Card>

          {/* Leaderboard */}
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

          {/* You vs You - Personal Progress */}
          {personalProgress?.hasHistory && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">You vs You</h3>
                <ICONS.TrendingUp className="text-green-500" size={20} />
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
