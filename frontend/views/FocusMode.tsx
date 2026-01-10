'use client';


import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../components/UIElements';
import { ICONS } from '../constants';

const FocusMode: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(2);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      setSessionsCompleted(s => s + 1);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((25 * 60 - timeLeft) / (25 * 60)) * 100;

  return (
    <div className="h-full flex flex-col items-center justify-center -m-4 md:-m-8 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-400/5 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full space-y-8 px-6 text-center z-10">
        <div className="space-y-2">
          <Badge variant="rose">Deep Work Session</Badge>
          <h2 className="text-4xl font-black text-slate-800 dark:text-slate-200 tracking-tight">Stay Focused</h2>
          <p className="text-slate-500 dark:text-slate-400">Silence notifications and dive into your work.</p>
        </div>

        <div className="relative group">
          <svg className="w-80 h-80 mx-auto -rotate-90">
            <circle 
              cx="160" cy="160" r="140" 
              stroke="currentColor" strokeWidth="8" 
              fill="transparent" className="text-slate-200 dark:text-slate-800" 
            />
            <circle 
              cx="160" cy="160" r="140" 
              stroke="currentColor" strokeWidth="8" 
              fill="transparent" strokeDasharray={880} 
              strokeDashoffset={880 - (880 * progress) / 100} 
              strokeLinecap="round" className="text-indigo-600 dark:text-indigo-500 transition-all duration-1000" 
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-black text-slate-800 dark:text-slate-200 font-mono tracking-tighter">
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">Minutes Left</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button 
            variant={isActive ? 'ghost' : 'primary'} 
            size="lg" 
            className="w-40 rounded-full text-lg font-bold"
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? 'Pause' : 'Start Focus'}
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className="w-14 h-14 rounded-full border-2 border-slate-200 dark:border-slate-700"
            onClick={() => { setTimeLeft(25 * 60); setIsActive(false); }}
          >
            <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{sessionsCompleted}</p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">75m</p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Total Time</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">8d</p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Streak</p>
          </div>
        </div>

        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">"The secret of getting ahead is getting started." — Mark Twain</p>
        </Card>
      </div>
    </div>
  );
};

export default FocusMode;

