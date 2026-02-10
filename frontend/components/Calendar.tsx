'use client';

import React, { useState } from 'react';
import { Card, Badge, Button } from './UIElements';
import { ICONS } from '../constants';
import { StudyTask, StudyPlan } from '@/lib/services/studyPlanner.service';

interface CalendarProps {
  tasks: StudyTask[];
  plans?: StudyPlan[];
  onTaskClick?: (task: StudyTask) => void;
  onPlanClick?: (plan: StudyPlan) => void;
  onDateClick?: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ tasks, plans = [], onTaskClick, onPlanClick, onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first and last day of month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Get previous month's last days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  
  // Build calendar grid
  const calendarDays: (Date | null)[] = [];
  
  // Previous month days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push(new Date(year, month - 1, prevMonthLastDay - i));
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }
  
  // Next month days to fill grid
  const remainingDays = 42 - calendarDays.length; // 6 rows * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push(new Date(year, month + 1, day));
  }
  
  // Group tasks by date
  const tasksByDate = tasks.reduce((acc, task) => {
    const dateKey = new Date(task.scheduledDate).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, StudyTask[]>);
  
  // Group plans by date range (show on start and end dates)
  const plansByDate = plans.reduce((acc, plan) => {
    const startKey = new Date(plan.startDate).toDateString();
    const endKey = new Date(plan.endDate).toDateString();
    
    if (!acc[startKey]) acc[startKey] = [];
    acc[startKey].push({ ...plan, isStart: true });
    
    if (startKey !== endKey) {
      if (!acc[endKey]) acc[endKey] = [];
      acc[endKey].push({ ...plan, isStart: false });
    }
    
    return acc;
  }, {} as Record<string, Array<StudyPlan & { isStart: boolean }>>);
  
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <Card className="p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={prevMonth} className="p-2">
            <ICONS.Plus size={18} className="rotate-180" />
          </Button>
          <Button variant="secondary" onClick={nextMonth} className="p-2">
            <ICONS.Plus size={18} />
          </Button>
        </div>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((date, index) => {
          if (!date) return <div key={index} />;
          
          const dateKey = date.toDateString();
          const dateTasks = tasksByDate[dateKey] || [];
          const datePlans = plansByDate[dateKey] || [];
          const isCurrentDay = isToday(date);
          const isOtherMonth = !isCurrentMonth(date);
          
          return (
            <div
              key={index}
              onClick={() => onDateClick?.(date)}
              className={`
                min-h-24 p-2 rounded-xl border-2 cursor-pointer transition-all
                ${isCurrentDay ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-200 dark:ring-indigo-900/50' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800'}
                ${isOtherMonth ? 'opacity-40' : ''}
                hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md
              `}
            >
              <div className={`text-sm font-bold mb-1 ${isCurrentDay ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {date.getDate()}
              </div>
              
              {/* Plan indicators */}
              {datePlans.length > 0 && (
                <div className="space-y-1 mb-1">
                  {datePlans.slice(0, 2).map((plan, i) => (
                    <div
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlanClick?.(plan);
                      }}
                      className="text-xs p-1 rounded truncate bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-semibold"
                      title={`${plan.title} (${plan.isStart ? 'Start' : 'End'})`}
                    >
                      📚 {plan.title.slice(0, 12)} {plan.isStart ? '▶' : '⏹'}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Task dots */}
              {dateTasks.length > 0 && (
                <div className="space-y-1">
                  {dateTasks.slice(0, 2).map((task, i) => (
                    <div
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick?.(task);
                      }}
                      className={`text-xs p-1 rounded truncate ${
                        task.status === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : task.priority === 'urgent'
                          ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      }`}
                      title={task.title}
                    >
                      {task.title.slice(0, 15)}
                    </div>
                  ))}
                  {dateTasks.length > 2 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                      +{dateTasks.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-6 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/30 rounded" />
          <span className="text-slate-600 dark:text-slate-400">Plans (▶ Start / ⏹ End)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-100 dark:bg-emerald-900/30 rounded" />
          <span className="text-slate-600 dark:text-slate-400">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-rose-100 dark:bg-rose-900/30 rounded" />
          <span className="text-slate-600 dark:text-slate-400">Urgent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 rounded" />
          <span className="text-slate-600 dark:text-slate-400">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-300 dark:border-indigo-700 rounded" />
          <span className="text-slate-600 dark:text-slate-400">Today</span>
        </div>
      </div>
    </Card>
  );
};

export default Calendar;
