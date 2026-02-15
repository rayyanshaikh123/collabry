'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/UIElements';
import { useAuthStore } from '@/lib/stores/auth.store';

const DEFAULT_DURATION = 25 * 60; // 25 minutes

export default function FocusPage() {
  const { user } = useAuthStore();
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('25');
  const [focusHistory, setFocusHistory] = useState<Array<{ date: string; sessions: number; minutes: number }>>([]);

  // Timer countdown
  useEffect(() => {
    let interval: number | null = null;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setSessionsCompleted(s => s + 1);
      saveSessionToHistory();
      // notify when session ends
      if (!muted) {
        try { playBeep(); } catch (e) { /* ignore audio errors */ }
      }
    }
    return () => { if (interval) window.clearInterval(interval); };
  }, [isActive, timeLeft, muted]);

  // Load saved data
  useEffect(() => {
    try {
      const raw = localStorage.getItem('collabry_focus');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.duration) setDuration(parsed.duration);
        if (typeof parsed.muted === 'boolean') setMuted(parsed.muted);
        if (typeof parsed.sessionsCompleted === 'number') setSessionsCompleted(parsed.sessionsCompleted);
        if (parsed.focusHistory) setFocusHistory(parsed.focusHistory);
        setTimeLeft(parsed.duration || DEFAULT_DURATION);
      }
    } catch (e) {}
  }, []);

  // Save data
  useEffect(() => {
    try {
      localStorage.setItem('collabry_focus', JSON.stringify({ 
        duration, 
        muted, 
        sessionsCompleted,
        focusHistory
      }));
    } catch (e) {}
  }, [duration, muted, sessionsCompleted, focusHistory]);

  // Reset timeLeft when duration changes
  useEffect(() => {
    if (!isActive) setTimeLeft(duration);
  }, [duration, isActive]);

  const saveSessionToHistory = () => {
    const today = new Date().toISOString().split('T')[0];
    setFocusHistory(prev => {
      const existing = prev.find(h => h.date === today);
      if (existing) {
        return prev.map(h => 
          h.date === today 
            ? { ...h, sessions: h.sessions + 1, minutes: h.minutes + Math.floor(duration / 60) }
            : h
        );
      } else {
        return [...prev, { date: today, sessions: 1, minutes: Math.floor(duration / 60) }].slice(-30); // Keep last 30 days
      }
    });
  };

  const playBeep = () => {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); try { ctx.close(); } catch {} }, 250);
  };

  const reset = () => {
    setIsActive(false);
    setTimeLeft(duration);
  };

  const applyPreset = (mins: number) => {
    const secs = mins * 60;
    setDuration(secs);
    setTimeLeft(secs);
    setCustomMinutes(mins.toString());
  };

  const applyCustomDuration = () => {
    const mins = parseInt(customMinutes, 10);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      const secs = mins * 60;
      setDuration(secs);
      setTimeLeft(secs);
    }
  };

  const handleCustomInput = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setCustomMinutes(numericValue);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = ((duration - timeLeft) / Math.max(1, duration)) || 0;
  const circumference = 2 * Math.PI * 100;
  const strokeDashoffset = circumference - (progress * circumference);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const weekStats = last7Days.map(date => {
    const dayData = focusHistory.find(h => h.date === date);
    return {
      date,
      sessions: dayData?.sessions || 0,
      minutes: dayData?.minutes || 0,
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
    };
  });

  const totalMinutesThisWeek = weekStats.reduce((sum, day) => sum + day.minutes, 0);
  const totalSessionsThisWeek = weekStats.reduce((sum, day) => sum + day.sessions, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-900 dark:via-indigo-950/20 dark:to-purple-950/20 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Focus Session
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Boost your productivity with the Pomodoro Technique
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Timer */}
          <div className="lg:col-span-2">
            <Card className="p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-2 border-indigo-100 dark:border-indigo-900/30">
              {/* Timer Circle */}
              <div className="flex justify-center mb-8">
                <div className="relative w-72 h-72">
                  <svg className="w-72 h-72 -rotate-90" viewBox="0 0 240 240">
                    <defs>
                      <linearGradient id="timer-gradient-page" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <circle
                      cx="120"
                      cy="120"
                      r="100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-slate-10 dark:text-slate-700"
                    />
                    <circle
                      cx="120"
                      cy="120"
                      r="100"
                      fill="none"
                      stroke="url(#timer-gradient-page)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      filter="url(#glow)"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={`text-7xl font-black bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight transition-all ${
                      isActive ? 'scale-100' : 'scale-95 opacity-80'
                    }`}>
                      {formatTime(timeLeft)}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                      <div className="text-slate-600 dark:text-slate-400 text-base font-bold">
                        {isActive ? 'Focus Mode' : 'Ready'}
                      </div>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
                      {Math.round(progress * 100)}% Complete
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={reset}
                  className="w-16 h-16 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                  aria-label="Reset"
                >
                  <svg className="w-6 h-6 text-slate-600 dark:text-slate-300 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setIsActive(v => !v)}
                  className="relative w-24 h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/50 transition-all hover:scale-110 active:scale-95 border-4 border-white dark:border-slate-800 group overflow-hidden"
                  aria-label={isActive ? 'Pause' : 'Start'}
                  disabled={timeLeft === 0}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  {isActive ? (
                    <svg className="w-10 h-10 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-white ml-1 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => setShowSettings(s => !s)}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group ${
                    showSettings 
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30' 
                      : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                  }`}
                  aria-label="Settings"
                >
                  <svg className={`w-6 h-6 transition-transform ${showSettings ? 'rotate-180' : 'group-hover:rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                  <div className="space-y-6">
                    {/* Quick Presets */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Quick Presets</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg font-medium">
                          {Math.floor(duration / 60)} min
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {[15, 25, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => applyPreset(mins)}
                            disabled={isActive}
                            className={`py-4 px-4 rounded-xl font-bold text-base transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                              duration === mins * 60
                                ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/40'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border-2 border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Duration */}
                    <div>
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                        Custom Duration
                      </label>
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={customMinutes}
                            onChange={(e) => handleCustomInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyCustomDuration()}
                            placeholder="Enter minutes"
                            disabled={isActive}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all disabled:opacity-50"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium pointer-events-none">
                            min
                          </div>
                        </div>
                        <button
                          onClick={applyCustomDuration}
                          disabled={!customMinutes || parseInt(customMinutes) <= 0 || parseInt(customMinutes) > 180 || isActive}
                          className="px-8 py-3 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          Set
                        </button>
                      </div>
                    </div>

                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Sound Alerts
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Play sound when timer completes
                        </span>
                      </div>
                      <button
                        onClick={() => setMuted(m => !m)}
                        className={`relative w-16 h-9 rounded-full transition-all ${
                          muted ? 'bg-slate-300 dark:bg-slate-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30'
                        }`}
                      >
                        <div className={`absolute top-1 left-1 w-7 h-7 bg-white rounded-full shadow-md transform transition-transform flex items-center justify-center ${
                          muted ? 'translate-x-0' : 'translate-x-7'
                        }`}>
                          <span className="text-sm">{muted ? '🔇' : '🔔'}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-6">
            {/* Today's Stats */}
            <Card className="p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-2 border-purple-100 dark:border-purple-900/30">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Today's Progress</h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900">
                  <div className="text-4xl font-black bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {sessionsCompleted}
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                    Sessions Completed
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-4 border border-purple-100 dark:border-purple-900">
                  <div className="text-4xl font-black bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {Math.floor(sessionsCompleted * (duration / 60))}
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                    Minutes Focused
                  </div>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-xl p-4 border border-pink-100 dark:border-pink-900">
                  <div className="text-4xl font-black bg-gradient-to-br from-pink-600 to-rose-600 bg-clip-text text-transparent">
                    {sessionsCompleted > 0 ? Math.floor(sessionsCompleted / 4) : 0}
                  </div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                    Pomodoro Cycles
                  </div>
                </div>
              </div>
            </Card>

            {/* Weekly Overview */}
            <Card className="p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-2 border-emerald-100 dark:border-emerald-900/30">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">This Week</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Sessions</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalSessionsThisWeek}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Minutes</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalMinutesThisWeek}</span>
                </div>
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between gap-1">
                    {weekStats.map((day, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{day.day[0]}</div>
                        <div
                          className={`w-full h-16 rounded-lg transition-all ${
                            day.sessions > 0
                              ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-700'
                          }`}
                          style={{ 
                            height: day.sessions > 0 ? `${Math.min(day.sessions * 12 + 32, 64)}px` : '32px'
                          }}
                          title={`${day.sessions} sessions`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-900/30">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">Pomodoro Tip</h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Take a 5-minute break after each session. After 4 sessions, take a longer 15-30 minute break to recharge.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
