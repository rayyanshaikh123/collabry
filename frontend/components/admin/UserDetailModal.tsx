'use client';

import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, ProgressBar } from '../UIElements';
import { adminService } from '@/lib/services/admin.service';
import type { UserUsageData } from '@/lib/services/admin.service';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  subscriptionTier?: string;
  isActive: boolean;
  emailVerified?: boolean;
  storageUsed?: number;
  createdAt: string;
  updatedAt: string;
  gamification?: {
    xp: number;
    level: number;
    streak: { current: number; longest: number; lastStudyDate?: string };
    badges: Array<{ id: string; name: string; unlockedAt: string }>;
    stats: {
      totalStudyTime: number;
      tasksCompleted: number;
      plansCreated: number;
      notesCreated: number;
      quizzesCompleted: number;
    };
  };
}

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [usage, setUsage] = useState<UserUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await adminService.getUser(userId);
        setUser(res.user as unknown as UserDetail);
        if (res.usage) setUsage(res.usage);
      } catch {
        // silent
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const g = user?.gamification;
  const stats = g?.stats;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end" onClick={onClose}>
      {/* Slide-in panel from right */}
      <div
        className="h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p className="text-sm">User not found</p>
            <Button onClick={onClose} className="mt-4 text-xs px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">Close</Button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {user.avatar ? (
                  <img src={user.avatar} className="w-14 h-14 rounded-xl object-cover" alt={user.name} />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
                    {user.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">{user.name}</h3>
                  <p className="text-xs text-slate-400">{user.email}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant={user.role === 'admin' ? 'indigo' : user.role === 'mentor' ? 'amber' : 'slate'} className="capitalize text-[10px]">
                      {user.role}
                    </Badge>
                    <Badge variant={user.isActive ? 'emerald' : 'rose'} className="text-[10px]">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {user.emailVerified && (
                      <Badge variant="emerald" className="text-[10px]">Verified</Badge>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                ✕
              </button>
            </div>

            {/* Account Info */}
            <Card className="p-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Account</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Joined</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Last Updated</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(user.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Subscription</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{user.subscriptionTier || 'free'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Storage</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{formatBytes(user.storageUsed || 0)}</p>
                </div>
              </div>
            </Card>

            {/* Gamification */}
            {g && (
              <Card className="p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gamification</h4>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center">
                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{g.level}</p>
                    <p className="text-[10px] text-slate-400">Level</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">{g.xp.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">XP</p>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 text-center">
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400">{g.streak?.current || 0}🔥</p>
                    <p className="text-[10px] text-slate-400">Streak</p>
                  </div>
                </div>

                {/* Activity Stats */}
                {stats && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Study Time</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{stats.totalStudyTime} min</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Tasks Completed</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{stats.tasksCompleted}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Plans Created</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{stats.plansCreated}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Notes Created</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{stats.notesCreated}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Quizzes Completed</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{stats.quizzesCompleted}</span>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Badges */}
            {g?.badges && g.badges.length > 0 && (
              <Card className="p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Badges ({g.badges.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {g.badges.map((b) => (
                    <div key={b.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{b.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1">{formatDate(b.unlockedAt)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Streak detail */}
            {g?.streak && (
              <Card className="p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Streak</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400">Current</p>
                    <p className="font-bold text-slate-700 dark:text-slate-300">{g.streak.current} days</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Longest</p>
                    <p className="font-bold text-slate-700 dark:text-slate-300">{g.streak.longest} days</p>
                  </div>
                  {g.streak.lastStudyDate && (
                    <div className="col-span-2">
                      <p className="text-slate-400">Last Study</p>
                      <p className="font-bold text-slate-700 dark:text-slate-300">{formatDate(g.streak.lastStudyDate)}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Usage & Plan Limits */}
            {usage && (
              <Card className="p-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Usage & Limits</h4>
                <div className="space-y-3">
                  {/* AI Questions today */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">AI Questions Today</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {usage.today.aiQuestions} / {usage.limits.aiQuestionsPerDay === -1 ? '∞' : usage.limits.aiQuestionsPerDay}
                      </span>
                    </div>
                    {usage.limits.aiQuestionsPerDay !== -1 && (
                      <ProgressBar
                        progress={Math.min((usage.today.aiQuestions / usage.limits.aiQuestionsPerDay) * 100, 100)}
                        color={usage.today.aiQuestions >= usage.limits.aiQuestionsPerDay ? 'bg-rose-500' : 'bg-indigo-500'}
                      />
                    )}
                  </div>
                  {/* Boards */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Boards</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {usage.totals.boards} / {usage.limits.boards === -1 ? '∞' : usage.limits.boards}
                      </span>
                    </div>
                    {usage.limits.boards !== -1 && (
                      <ProgressBar
                        progress={Math.min((usage.totals.boards / usage.limits.boards) * 100, 100)}
                        color={usage.totals.boards >= usage.limits.boards ? 'bg-rose-500' : 'bg-emerald-500'}
                      />
                    )}
                  </div>
                  {/* Notebooks */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Notebooks</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {usage.totals.notebooks} / {usage.limits.notebooks === -1 ? '∞' : usage.limits.notebooks}
                      </span>
                    </div>
                    {usage.limits.notebooks !== -1 && (
                      <ProgressBar
                        progress={Math.min((usage.totals.notebooks / usage.limits.notebooks) * 100, 100)}
                        color={usage.totals.notebooks >= usage.limits.notebooks ? 'bg-rose-500' : 'bg-amber-500'}
                      />
                    )}
                  </div>
                  {/* File uploads today */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">File Uploads Today</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {usage.today.fileUploads} / {usage.limits.fileUploadsPerDay === -1 ? '∞' : usage.limits.fileUploadsPerDay}
                      </span>
                    </div>
                    {usage.limits.fileUploadsPerDay !== -1 && (
                      <ProgressBar
                        progress={Math.min((usage.today.fileUploads / usage.limits.fileUploadsPerDay) * 100, 100)}
                        color={usage.today.fileUploads >= usage.limits.fileUploadsPerDay ? 'bg-rose-500' : 'bg-cyan-500'}
                      />
                    )}
                  </div>
                  {/* Storage */}
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Storage Limit</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatBytes(user?.storageUsed || 0)} / {usage.limits.storageGB} GB
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
