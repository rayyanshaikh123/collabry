'use client';

import React from 'react';
import { Card, Button, Badge } from '../UIElements';
import { ICONS } from '../../constants';
import { AppRoute } from '../../types';
import type { StudyTask } from '@/lib/services/studyPlanner.service';

interface TodayTasksProps {
  todayTasks: StudyTask[];
  onNavigate?: (route: AppRoute) => void;
}

export const TodayTasks: React.FC<TodayTasksProps> = ({ todayTasks, onNavigate }) => {
  return (
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
  );
};
