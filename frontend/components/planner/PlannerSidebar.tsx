'use client';

import React from 'react';
import { Card, Badge } from '../UIElements';
import { ICONS } from '@/constants';
import { StudyPlan } from '@/lib/services/studyPlanner.service';

interface PlannerSidebarProps {
  plans: StudyPlan[];
  loading: boolean;
  selectedPlan: string[];
  onPlanToggle: (planId: string) => void;
  onPlanDelete: (plan: StudyPlan) => void;
  onAutoSchedule?: (plan: StudyPlan) => void;
  onRecoverMissed?: (plan: StudyPlan) => void;
}

export const PlannerSidebar: React.FC<PlannerSidebarProps> = ({
  plans,
  loading,
  selectedPlan,
  onPlanToggle,
  onPlanDelete,
  onAutoSchedule,
  onRecoverMissed,
}) => {
  return (
    <div className="md:col-span-4 lg:col-span-3 space-y-4">
      <Card>
        <h3 className="font-black text-slate-800 dark:text-slate-200 text-lg mb-4">My Plans</h3>
        <div className="space-y-2">
          {loading && <p className="text-sm text-slate-400 dark:text-slate-500">Loading plans...</p>}
          {plans.length === 0 && !loading && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
              No plans yet.
              <br />
              Create your first AI plan! 🚀
            </p>
          )}
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative group w-full text-left p-3 rounded-xl border-2 transition-all ${
                selectedPlan.includes(plan.id)
                  ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30'
                  : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <button onClick={() => onPlanToggle(plan.id)} className="w-full text-left">
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{plan.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{plan.subject}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="indigo" className="text-[10px]">
                    {plan.completionPercentage}%
                  </Badge>
                  <Badge variant="emerald" className="text-[10px]">
                    {plan.completedTasks}/{plan.totalTasks} tasks
                  </Badge>
                </div>
              </button>

              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onRecoverMissed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRecoverMissed(plan);
                    }}
                    className="p-1 bg-amber-100 hover:bg-amber-200 rounded-lg"
                    title="Recover missed sessions"
                  >
                    <ICONS.Focus size={14} className="text-amber-600" />
                  </button>
                )}
                {onAutoSchedule && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAutoSchedule(plan);
                    }}
                    className="p-1 bg-indigo-100 hover:bg-indigo-200 rounded-lg"
                    title="Auto-schedule time blocks"
                  >
                    <ICONS.Clock size={14} className="text-indigo-600" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlanDelete(plan);
                  }}
                  className="p-1 bg-rose-100 hover:bg-rose-200 rounded-lg"
                  title="Delete plan"
                >
                  <ICONS.Plus size={14} className="text-rose-600 rotate-45" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
