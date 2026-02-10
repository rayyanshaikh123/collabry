'use client';

import React from 'react';

interface SessionStatusProps {
  connected: boolean;
  status: string;
}

export const SessionStatus: React.FC<SessionStatusProps> = ({
  connected,
  status
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">
          {connected ? 'Connected' : 'Disconnected'}
        </h2>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
        {status}
      </p>
    </div>
  );
};
