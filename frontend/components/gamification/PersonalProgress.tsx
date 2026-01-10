import React from 'react';
import { Card, Badge } from '../UIElements';
import { ICONS } from '../../constants';

interface PersonalProgressProps {
  currentStats: {
    xp: number;
    streak: number;
    tasksCompleted: number;
    studyHours: number;
  };
  previousStats?: {
    xp: number;
    streak: number;
    tasksCompleted: number;
    studyHours: number;
  };
}

const PersonalProgress: React.FC<PersonalProgressProps> = ({ currentStats, previousStats }) => {
  const calculateChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return { value: current, percentage: 100, isPositive: true };
    const change = current - previous;
    const percentage = Math.abs((change / previous) * 100);
    return {
      value: Math.abs(change),
      percentage: Math.round(percentage),
      isPositive: change >= 0,
    };
  };

  const stats = [
    {
      label: 'Total XP',
      current: currentStats.xp,
      previous: previousStats?.xp || 0,
      icon: ICONS.Zap,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    },
    {
      label: 'Current Streak',
      current: currentStats.streak,
      previous: previousStats?.streak || 0,
      icon: ICONS.Flame,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    },
    {
      label: 'Tasks Done',
      current: currentStats.tasksCompleted,
      previous: previousStats?.tasksCompleted || 0,
      icon: ICONS.CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
    },
    {
      label: 'Study Hours',
      current: currentStats.studyHours,
      previous: previousStats?.studyHours || 0,
      icon: ICONS.Clock,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    },
  ];

  return (
    <div className="space-y-3">
      {stats.map((stat) => {
        const change = calculateChange(stat.current, stat.previous);
        const StatIcon = stat.icon;

        return (
          <div
            key={stat.label}
            className={`flex items-center gap-4 p-4 rounded-xl ${stat.bgColor} border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all`}
          >
            <div className={`p-3 rounded-xl ${stat.color} bg-white dark:bg-slate-800 shadow-sm`}>
              <StatIcon size={24} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                  {stat.current.toLocaleString()}
                </span>
                {previousStats && (
                  <div className="flex items-center gap-1">
                    {change.isPositive ? (
                      <ICONS.TrendingUp className="text-green-500" size={16} />
                    ) : (
                      <ICONS.TrendingDown className="text-red-500" size={16} />
                    )}
                    <span className={`text-sm font-bold ${change.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {change.value > 0 && change.isPositive && '+'}
                      {change.value}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-1">
                {stat.label}
              </p>
            </div>

            {previousStats && change.percentage > 0 && (
              <Badge variant={change.isPositive ? 'success' : 'error'}>
                {change.isPositive ? '+' : '-'}{change.percentage}%
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PersonalProgress;
