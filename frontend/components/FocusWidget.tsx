"use client";

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from './UIElements';

const DEFAULT_DURATION = 25 * 60; // 25 minutes

const FocusWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
    setShowSettings(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = ((duration - timeLeft) / Math.max(1, duration)) || 0;

  return (
    <div className="fixed z-50 bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 sm:bottom-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Deep Focus"
        aria-expanded={open}
        className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 rounded-2xl"
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
      >
        {!open && (
          <div className="max-w-[92vw] sm:w-56 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl flex items-center gap-3 hover:scale-[1.03] transform-gpu transition">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14">
              <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 100 100" aria-hidden>
                <defs>
                  <linearGradient id="g1_compact" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="10" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="url(#g1_compact)" strokeWidth="10" strokeLinecap="round" strokeDasharray={276} strokeDashoffset={`${276 - (276 * progress)}`} transform="rotate(-90 50 50)" />
                <g transform="translate(50 50)">
                  <text x="0" y="6" textAnchor="middle" fontSize="10" className="font-extrabold" fill="#0f172a">{formatTime(timeLeft)}</text>
                </g>
              </svg>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200">Deep Focus</div>
                  <div className="text-[12px] text-slate-400 dark:text-slate-500">Silence notifications • {sessionsCompleted} sessions</div>
                </div>
                <div className="ml-2 flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsActive(v => !v); }}
                    aria-label={isActive ? 'Pause focus' : 'Start focus'}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md hover:opacity-95 focus-visible:ring-2 focus-visible:ring-indigo-300"
                    title={isActive ? 'Pause' : 'Start'}
                  >
                    <span aria-hidden className="text-sm sm:text-base">{isActive ? '❚❚' : '▶'}</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowSettings(s => !s); }}
                    aria-label="Focus settings"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-sm hover:opacity-95 focus-visible:ring-2 focus-visible:ring-indigo-300"
                    title="Settings"
                  >
                    ⚙
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="mt-3 w-[min(92vw,340px)] sm:w-[360px] p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl transition transform-gpu">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Badge variant="rose">Deep Work</Badge>
              <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200">Pomodoro</h4>
            </div>
            <div className="text-sm font-mono font-black">{formatTime(timeLeft)}</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
              <svg className="w-20 h-20 sm:w-28 sm:h-28" viewBox="0 0 100 100" aria-hidden>
                <defs>
                  <linearGradient id="g1_expanded" x1="0%" x2="100%">
                    <stop offset="0%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(15,23,42,0.06)" strokeWidth="10" />
                <circle cx="50" cy="50" r="44" fill="none" stroke="url(#g1_expanded)" strokeWidth="10" strokeLinecap="round" strokeDasharray={276} strokeDashoffset={`${276 - (276 * progress)}`} transform="rotate(-90 50 50)" />
              </svg>
              <div className="absolute text-center">
                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{formatTime(timeLeft)}</div>
                <div className="text-[11px] sm:text-[11px] text-slate-400 dark:text-slate-500">{Math.round(progress * 100)}%</div>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">Focus on a single task for the session. The timer runs in the background.</p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button variant={isActive ? 'ghost' : 'primary'} size="md" className="w-full sm:w-36 rounded-full text-base sm:text-lg font-bold" onClick={() => setIsActive(v => !v)}>
                  {isActive ? 'Pause' : 'Start Focus'}
                </Button>
                <div className="flex gap-2 items-center">
                  <Button variant="secondary" size="icon" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-slate-200 dark:border-slate-700" onClick={reset} aria-label="Reset timer">
                    ⟲
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 sm:w-10 sm:h-10" onClick={() => setOpen(false)} aria-label="Close">
                    ✕
                  </Button>
                </div>
              </div>

              {showSettings && (
                <div className="mt-3 border-t pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Duration</div>
                    <div className="text-xs text-slate-400">Presets</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button className="px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-sm" onClick={() => applyPreset(25)}>25m</button>
                    <button className="px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-sm" onClick={() => applyPreset(50)}>50m</button>
                    <button className="px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-sm" onClick={() => applyPreset(15)}>15m</button>
                    <div className="ml-auto flex items-center gap-2">
                      <label className="text-sm">Mute</label>
                      <button onClick={() => setMuted(m => !m)} className={`w-9 h-9 rounded-md flex items-center justify-center ${muted ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-600 text-white'}`} aria-pressed={muted} aria-label="Toggle mute">
                        {muted ? '🔇' : '🔔'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
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
        </div>
      )}
    </div>
  );
};

export default FocusWidget;
