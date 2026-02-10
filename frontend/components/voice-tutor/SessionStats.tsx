'use client';

import React from 'react';

interface SessionStatsProps {
  questionsAsked: number;
  questionsAnswered: number;
  currentTopic: string;
  understandingScore: number; // 0..1
  attentionScore: number;
}

export const SessionStats: React.FC<SessionStatsProps> = ({
  questionsAsked,
  questionsAnswered,
  currentTopic,
  understandingScore,
  attentionScore
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
      <h2 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">
        Session Stats
      </h2>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Current Topic
          </p>
          <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {currentTopic}
          </p>
        </div>

        <div>
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Questions Asked
          </p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
            {questionsAsked}
          </p>
        </div>

        <div>
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Questions Answered
          </p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
            {questionsAnswered}
          </p>
        </div>

        <div>
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Understanding Score
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${understandingScore * 100}%` }}
              />
            </div>
            <span className="text-sm font-black text-slate-700 dark:text-slate-300">
              {Math.round(understandingScore * 100)}%
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            Attention Score
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 dark:bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${attentionScore * 100}%` }}
              />
            </div>
            <span className="text-sm font-black text-slate-700 dark:text-slate-300">
              {Math.round(attentionScore * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
