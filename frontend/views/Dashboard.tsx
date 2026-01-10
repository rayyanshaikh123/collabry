'use client';


import React from 'react';
import { Card, Button, Badge, ProgressBar } from '../components/UIElements';
import { ICONS, MOCK_BOARDS, MOCK_ACTIVITIES, MOCK_TASKS } from '../constants';
import { AppRoute } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuthStore } from '../src/stores/auth.store';

interface DashboardProps {
  onNavigate?: (route: AppRoute) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const userInitials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S';
  
  return (
    <div className="space-y-8 pb-10">
      {/* Hero / Profile Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 flex flex-col md:flex-row items-center gap-6 bg-indigo-500 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative shrink-0">
             {user?.avatar ? (
               <img 
                 src={user.avatar} 
                 alt="Profile" 
                 className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] border-4 border-white/30 shadow-2xl object-cover"
               />
             ) : (
               <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] border-4 border-white/30 shadow-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-4xl">
                 {userInitials}
               </div>
             )}
              <div className="absolute -bottom-2 -right-2 bg-amber-400 dark:bg-amber-500 text-slate-900 dark:text-slate-200 w-10 h-10 rounded-full flex items-center justify-center font-black border-4 border-indigo-500 dark:border-indigo-600 shadow-lg">
                12
              </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h2 className="text-3xl font-black">Hi {firstName}! 🚀</h2>
            <p className="text-indigo-100 font-medium">Level 12 Explorer • <span className="text-amber-300">2,450 XP</span> to next rank!</p>
            <div className="w-full max-w-md mt-4">
              <ProgressBar progress={68} color="bg-amber-400" label="Rank Progress" />
            </div>
          </div>
          <div className="flex gap-3 md:flex-col lg:flex-row">
            <Button variant="warning" size="sm" className="gap-2" onClick={() => onNavigate?.(AppRoute.PROFILE)}><ICONS.Trophy size={16}/> Rewards</Button>
            <Button variant="success" size="sm" className="gap-2" onClick={() => onNavigate?.(AppRoute.STUDY_BOARD)}><ICONS.Plus size={16}/> New Study</Button>
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
                 <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">8 Day Streak!</h3>
                 <p className="text-xs text-rose-500 dark:text-rose-400 font-bold uppercase tracking-wider">Don't let it go cold!</p>
               </div>
             </div>
             <div className="flex justify-between gap-1">
               {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                 <div key={i} className={`flex-1 h-12 rounded-xl flex items-center justify-center text-[10px] font-black ${i < 5 ? 'bg-rose-500 dark:bg-rose-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                   {day}
                 </div>
               ))}
             </div>
           </Card>
           </div>
        </div>
      </div>

      {/* Main Feature Entry Points */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Progress Insights', icon: ICONS.Dashboard, color: 'bg-indigo-100 text-indigo-600', route: AppRoute.PROFILE },
          { label: 'Consistency Journal', icon: ICONS.Planner, color: 'bg-emerald-100 text-emerald-600', route: AppRoute.PLANNER },
          { label: 'Visual Learning', icon: ICONS.StudyBoard, color: 'bg-amber-100 text-amber-600', route: AppRoute.STUDY_BOARD },
          { label: 'Focus Tracker', icon: ICONS.Focus, color: 'bg-rose-100 text-rose-600', route: AppRoute.FOCUS },
        ].map((item, i) => (
          <button 
            key={i} 
            onClick={() => onNavigate?.(item.route)}
            className="flex items-center gap-4 p-5 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border-2 border-slate-50 dark:border-slate-700 text-left bouncy-hover group"
          >
            <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center transition-all group-hover:scale-110`}>
              <item.icon size={24} strokeWidth={3} />
            </div>
            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Course Grid */}
          <section>
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">My Learning Path</h3>
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.(AppRoute.STUDY_BOARD)}>Explore More</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MOCK_BOARDS.map(board => (
                <div key={board.id} onClick={() => onNavigate?.(AppRoute.STUDY_BOARD)} className="cursor-pointer">
                  <Card hoverable className="group">
                  <div className="flex items-start gap-5">
                    <div className={`w-16 h-16 ${board.color} rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-slate-100 dark:shadow-slate-900/50 bouncy-hover`}>
                      <ICONS.Book size={32} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-lg font-black text-slate-800 dark:text-slate-200 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {board.title}
                      </h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">
                        Last Active {board.lastActive}
                      </p>
                      <div className="pt-3">
                        <ProgressBar progress={board.progress} color={board.color.replace('bg-', 'bg-')} />
                      </div>
                    </div>
                  </div>
                </Card>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Mini Components */}
        <div className="space-y-8">
          {/* Daily Quests */}
          <Card className="border-indigo-100 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-900/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">Daily Quests</h3>
              <Badge variant="indigo">3/5</Badge>
            </div>
            <div className="space-y-4">
              {MOCK_TASKS.map(task => {
                const TaskIcon = task.completed ? ICONS.Check : ICONS.Uncheck;
                return (
                  <div key={task.id} className={`flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 transition-all border-2 ${task.completed ? 'border-emerald-100 dark:border-emerald-800' : 'border-white dark:border-slate-800'}`}>
                    <button className={`${task.completed ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-200 dark:text-slate-600'} shrink-0`}>
                      <TaskIcon size={24} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black truncate ${task.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</p>
                      <p className="text-[10px] text-indigo-400 dark:text-indigo-500 font-bold uppercase">{task.dueDate}</p>
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" className="w-full mt-2 border-dashed rounded-2xl" onClick={() => onNavigate?.(AppRoute.PLANNER)}>
                <ICONS.Plus size={18} className="mr-2"/> New Task
              </Button>
            </div>
          </Card>

          {/* Activity Feed Entry Point */}
          <Card>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">Study Squad</h3>
            <div className="space-y-4">
               {[
                 { name: 'Alex K.', status: 'Studying Math', color: 'bg-emerald-500' },
                 { name: 'Sarah L.', status: 'On a break', color: 'bg-slate-300 dark:bg-slate-600' },
                 { name: 'Tom H.', status: 'Live Session!', color: 'bg-indigo-500' }
               ].map((friend, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <div className="relative">
                     <img src={`https://picsum.photos/seed/${friend.name}/50/50`} className="w-10 h-10 rounded-2xl border-2 border-slate-100 dark:border-slate-700" alt={friend.name} />
                     <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${friend.color}`}></div>
                   </div>
                   <div className="flex-1 text-left">
                     <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{friend.name}</p>
                     <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{friend.status}</p>
                   </div>
                   <Button variant="ghost" size="icon" className="h-8 w-8"><ICONS.Share size={14}/></Button>
                 </div>
               ))}
            </div>
            <Button variant="secondary" className="w-full mt-6">Invite Friends</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

