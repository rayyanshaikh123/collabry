'use client';

import React from 'react';
import { Card, Button, ProgressBar } from '../UIElements';
import { ICONS } from '../../constants';
import { AppRoute } from '../../types';
import type { StudyPlan } from '@/lib/services/studyPlanner.service';

interface StudyPlansSectionProps {
  studyPlans: StudyPlan[];
  onNavigate?: (route: AppRoute) => void;
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

export const StudyPlansSection: React.FC<StudyPlansSectionProps> = ({ 
  studyPlans, 
  onNavigate 
}) => {
  return (
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
  );
};
