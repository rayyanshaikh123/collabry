"use client";

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from './UIElements';
import { useAuthStore } from '@/lib/stores/auth.store';

const DEFAULT_DURATION = 25 * 60; // 25 minutes

const FocusWidget: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('25');

  useEffect(() => {
    let interval: number | null = null;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      setSessionsCompleted(s => s + 1);
      // notify (beep) when session ends
      if (!muted) {
        try { playBeep(); } catch (e) { /* ignore audio errors */ }
      }
    }
    return () => { if (interval) window.clearInterval(interval); };
  }, [isActive, timeLeft]);

  // Persist/load settings and sessions
  useEffect(() => {
    try {
      const raw = localStorage.getItem('collabry_focus');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.duration) setDuration(parsed.duration);
        if (typeof parsed.muted === 'boolean') setMuted(parsed.muted);
        if (typeof parsed.sessionsCompleted === 'number') setSessionsCompleted(parsed.sessionsCompleted);
        setTimeLeft(parsed.duration || DEFAULT_DURATION);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('collabry_focus', JSON.stringify({ duration, muted, sessionsCompleted }));
    } catch (e) {}
  }, [duration, muted, sessionsCompleted]);

  // If duration changes while idle, update timeLeft
  useEffect(() => {
    if (!isActive) setTimeLeft(duration);
  }, [duration]);

  // Play a short beep using WebAudio API
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

  const reset = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsActive(false);
    setTimeLeft(DEFAULT_DURATION);
  };

  const applyPreset = (mins: number) => {
    const secs = mins * 60;
    setDuration(secs);
    setTimeLeft(secs);
    setCustomMinutes(mins.toString());
    setShowSettings(false);
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
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setCustomMinutes(numericValue);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = ((duration - timeLeft) / Math.max(1, duration)) || 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress * circumference);

  // Only show widget when user is authenticated
  if (!isAuthenticated) return null;

  return (
    <div className="fixed z-50 bottom-6 right-6">
      {/* Collapsed View - Minimalist Floating Icon */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="group relative"
          aria-label="Open Pomodoro Timer"
        >
          {/* Animated Ring Indicator */}
          <div className="absolute inset-0 animate-pulse">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4f46e5" />
                </linearGradient>
              </defs>
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="url(#ring-gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                opacity="0.6"
              />
            </svg>
          </div>

          {/* Main Timer Button */}
          <div className="relative w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/50 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 border-2 border-white/20">
            {isActive && (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl animate-pulse opacity-75"></div>
            )}
            <div className="relative z-10 text-center">
              <div className="text-white font-black text-lg leading-none tracking-tight">
                {Math.floor(timeLeft / 60)}
              </div>
              <div className="text-white/80 text-[10px] font-bold">
                MIN
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          {isActive && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-bounce shadow-lg"></div>
          )}

          {/* Hover Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
            {isActive ? 'Timer Running' : 'Start Focus'} • {formatTime(timeLeft)}
          </div>
        </button>
      )}

      {/* Expanded View - Premium Dashboard */}
      {open && (
        <>
          {/* Backdrop - Click to close */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <div className="relative z-50 w-[380px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden transform transition-all duration-300 animate-in slide-in-from-bottom-4">
            {/* Header with Gradient */}
            <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 pb-20">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🍅</span>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-xl tracking-tight">Pomodoro</h3>
                    <p className="text-white/80 text-sm font-medium">Deep Focus Session</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Minimize Button */}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-9 h-9 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-white group"
                    aria-label="Minimize"
                    title="Minimize"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* Close Button */}
                  <button
                    onClick={() => setOpen(false)}
                    className="w-9 h-9 bg-white/10 hover:bg-rose-500 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 text-white"
                    aria-label="Close"
                    title="Collapse to icon"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

          {/* Timer Circle - Centered */}
          <div className="px-6 -mt-16 relative z-10">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
              {/* Animated Background Glow */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 animate-pulse"></div>
              )}
              
              <div className="relative w-48 h-48 mx-auto">
                {/* Background Circle */}
                <svg className="w-48 h-48 -rotate-90" viewBox="0 0 120 120">
                  <defs>
                    <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-slate-10 dark:text-slate-700"
                  />
                  {/* Progress */}
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#timer-gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    filter="url(#glow)"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>

                {/* Timer Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-6xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight transition-all ${
                    isActive ? 'scale-100' : 'scale-95 opacity-80'
                  }`}>
                    {formatTime(timeLeft)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm font-bold">
                      {Math.round(progress * 100)}% Complete
                    </div>
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-3 mt-6 relative">
                <button
                  onClick={reset}
                  className="w-12 h-12 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                  aria-label="Reset"
                >
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-300 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setIsActive(v => !v)}
                  className="relative w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50 transition-all hover:scale-110 active:scale-95 border-4 border-white dark:border-slate-800 group overflow-hidden"
                  aria-label={isActive ? 'Pause' : 'Start'}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  {isActive ? (
                    <svg className="w-8 h-8 text-white relative z-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white ml-1 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => setShowSettings(s => !s)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group ${
                    showSettings 
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50' 
                      : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300'
                  }`}
                  aria-label="Settings"
                >
                  <svg className={`w-5 h-5 transition-transform ${showSettings ? 'rotate-180' : 'group-hover:rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="px-6 pt-4 pb-2 animate-in slide-in-from-top-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border-2 border-slate-200 dark:border-slate-700">
                {/* Quick Presets */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Quick Presets</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-700/50 px-2 py-1 rounded-lg">
                      {Math.floor(duration / 60)} min
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[15, 25, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        onClick={() => applyPreset(mins)}
                        className={`py-3 px-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95 relative overflow-hidden ${
                          duration === mins * 60
                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border-2 border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {duration === mins * 60 && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer"></div>
                        )}
                        <div className="relative">{mins}m</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Duration Input */}
                <div className="mb-5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                    Custom Duration
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={customMinutes}
                        onChange={(e) => handleCustomInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            applyCustomDuration();
                          }
                        }}
                        placeholder="Enter minutes"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-bold pointer-events-none">
                        min
                      </div>
                    </div>
                    <button
                      onClick={applyCustomDuration}
                      disabled={!customMinutes || parseInt(customMinutes) <= 0 || parseInt(customMinutes) > 180}
                      className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-600 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 disabled:shadow-none"
                    >
                      Set
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Enter 1-180 minutes for your custom focus session
                  </p>
                </div>

                {/* Sound Toggle */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Sound Alerts</span>
                    <span className="text-xs bg-white/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-400">
                      {muted ? 'Off' : 'On'}
                    </span>
                  </div>
                  <button
                    onClick={() => setMuted(m => !m)}
                    className={`relative w-14 h-8 rounded-full transition-all ${
                      muted ? 'bg-slate-300 dark:bg-slate-600' : 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform flex items-center justify-center ${
                      muted ? 'translate-x-0' : 'translate-x-6'
                    }`}>
                      <span className="text-xs">{muted ? '🔇' : '🔔'}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl p-4 text-center border-2 border-indigo-100 dark:border-indigo-900">
                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {sessionsCompleted}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1 tracking-wider">
                  Sessions
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-4 text-center border-2 border-emerald-100 dark:border-emerald-900">
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {Math.floor(sessionsCompleted * 25)}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1 tracking-wider">
                  Minutes
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-2xl p-4 text-center border-2 border-blue-100 dark:border-blue-900">
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {sessionsCompleted > 0 ? Math.floor(sessionsCompleted / 4) : 0}
                </div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-1 tracking-wider">
                  Cycles
                </div>
              </div>
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FocusWidget;
