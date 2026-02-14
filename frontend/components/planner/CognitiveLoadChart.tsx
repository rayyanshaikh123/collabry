/**
 * CognitiveLoadChart Component
 * Visualizes task distribution and cognitive load per day
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StudyTask } from '@/lib/services/studyPlanner.service';
import type { StrategyMode } from '@/types/planner.types';

interface CognitiveLoadChartProps {
  tasks: StudyTask[];
  strategyMode: StrategyMode;
  days?: number;
}

interface DayLoad {
  date: string;
  dateFormatted: string;
  totalTasks: number;
  easyTasks: number;
  mediumTasks: number;
  hardTasks: number;
  totalMinutes: number;
  loadPercentage: number;
}

export const CognitiveLoadChart: React.FC<CognitiveLoadChartProps> = ({
  tasks,
  strategyMode,
  days = 7,
}) => {
  // Calculate max tasks per day based on strategy
  const maxTasksPerDay = {
    balanced: 4,
    adaptive: 6,
    emergency: 8,
  }[strategyMode];

  // Group tasks by day
  const getDayLoads = (): DayLoad[] => {
    const today = new Date();
    const dayLoads: DayLoad[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTasks = tasks.filter(
        (task) => task.scheduledDate && task.scheduledDate.split('T')[0] === dateStr
      );

      const easyTasks = dayTasks.filter((t) => t.difficulty === 'easy').length;
      const mediumTasks = dayTasks.filter((t) => t.difficulty === 'medium').length;
      const hardTasks = dayTasks.filter((t) => t.difficulty === 'hard').length;
      const totalMinutes = dayTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
      const totalTasks = dayTasks.length;

      dayLoads.push({
        date: dateStr,
        dateFormatted: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        totalTasks,
        easyTasks,
        mediumTasks,
        hardTasks,
        totalMinutes,
        loadPercentage: (totalTasks / maxTasksPerDay) * 100,
      });
    }

    return dayLoads;
  };

  const dayLoads = getDayLoads();
  const maxLoad = Math.max(...dayLoads.map((d) => d.loadPercentage), 100);

  // Color coding based on load
  const getLoadColor = (percentage: number): string => {
    if (percentage <= 60) return 'bg-green-500';
    if (percentage <= 85) return 'bg-yellow-500';
    if (percentage <= 100) return 'bg-orange-500';
    return 'bg-red-600';
  };

  const getLoadLabel = (percentage: number): string => {
    if (percentage <= 60) return 'Light';
    if (percentage <= 85) return 'Moderate';
    if (percentage <= 100) return 'Heavy';
    return 'Overload';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <span>Cognitive Load</span>
          </div>
          <div className="text-xs font-normal text-gray-500">
            Max: {maxTasksPerDay} tasks/day
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        <div className="space-y-2">
          {dayLoads.map((day, idx) => (
            <div key={day.date} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium min-w-[100px]">
                  {idx === 0 ? 'Today' : day.dateFormatted}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{day.totalTasks} tasks</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{Math.round(day.totalMinutes / 60)}h</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      day.loadPercentage <= 60
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : day.loadPercentage <= 85
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : day.loadPercentage <= 100
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {getLoadLabel(day.loadPercentage)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden flex">
                  {/* Easy tasks */}
                  {day.easyTasks > 0 && (
                    <div
                      className="bg-green-400 dark:bg-green-600 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${(day.easyTasks / maxTasksPerDay) * 100}%` }}
                      title={`${day.easyTasks} easy tasks`}
                    >
                      {day.easyTasks > 0 && <span>{day.easyTasks}</span>}
                    </div>
                  )}
                  {/* Medium tasks */}
                  {day.mediumTasks > 0 && (
                    <div
                      className="bg-blue-400 dark:bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${(day.mediumTasks / maxTasksPerDay) * 100}%` }}
                      title={`${day.mediumTasks} medium tasks`}
                    >
                      {day.mediumTasks > 0 && <span>{day.mediumTasks}</span>}
                    </div>
                  )}
                  {/* Hard tasks */}
                  {day.hardTasks > 0 && (
                    <div
                      className="bg-red-400 dark:bg-red-600 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${(day.hardTasks / maxTasksPerDay) * 100}%` }}
                      title={`${day.hardTasks} hard tasks`}
                    >
                      {day.hardTasks > 0 && <span>{day.hardTasks}</span>}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 min-w-[40px] text-right">
                  {Math.round(day.loadPercentage)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 dark:bg-green-600 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Easy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-400 dark:bg-blue-600 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-400 dark:bg-red-600 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Hard</span>
          </div>
        </div>

        {/* Warning if overloaded */}
        {dayLoads.some((d) => d.loadPercentage > 100) && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
            <span>⚠️</span>
            <span>
              Some days exceed the recommended cognitive load ({maxTasksPerDay} tasks/day).
              Consider rescheduling or using emergency mode.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
