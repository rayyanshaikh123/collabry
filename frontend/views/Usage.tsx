'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, ProgressBar } from '../components/UIElements';
import { ICONS } from '../constants';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid } from 'recharts';
import { usageService, type UsageStats } from '@/lib/services/usage.service';
import { useAuthStore } from '@/lib/stores/auth.store';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';

/* ────────────────────────────────────────── */
/*  Types for /api/usage/summary response     */
/* ────────────────────────────────────────── */
interface LimitEntry {
  used: number;
  limit: number; // -1 = unlimited
  remaining: number | 'unlimited';
}
interface StorageEntry {
  used: string;
  usedBytes: number;
  limit: string;
  limitBytes: number;
  percentUsed: number;
}
interface UsageSummary {
  plan: string;
  today: {
    aiQuestions: LimitEntry;
    fileUploads: LimitEntry;
  };
  totals: {
    boards: LimitEntry;
    notebooks: LimitEntry;
    storage: StorageEntry;
  };
  monthly: {
    totalQuestions: number;
    totalTokens: number;
    totalFileUploads: number;
    avgDailyQuestions: number;
  } | null;
  limits: Record<string, number>;
  resetTime: string;
}

interface HistoryRecord {
  date: string;
  aiQuestions: number;
  aiTokensUsed: number;
  fileUploads: number;
}

/* ────────────────────────────────────────── */
/*  Constants                                 */
/* ────────────────────────────────────────── */
const PLAN_BADGES: Record<string, { label: string; color: 'indigo' | 'emerald' | 'amber' | 'rose' }> = {
  free: { label: 'Free', color: 'indigo' },
  basic: { label: 'Basic', color: 'emerald' },
  pro: { label: 'Pro', color: 'amber' },
  enterprise: { label: 'Enterprise', color: 'rose' },
};

/* ────────────────────────────────────────── */
/*  Helper: human-readable "remaining" label  */
/* ────────────────────────────────────────── */
function limitLabel(limit: number): string {
  if (limit === -1) return 'Unlimited';
  return limit.toLocaleString();
}
function remainingLabel(r: number | 'unlimited'): string {
  if (r === 'unlimited') return '∞';
  return r.toLocaleString();
}
function pct(used: number, limit: number): number {
  if (limit === -1) return 0;
  if (limit === 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}
function pctColor(p: number): 'emerald' | 'amber' | 'rose' {
  if (p < 50) return 'emerald';
  if (p < 80) return 'amber';
  return 'rose';
}

/* ────────────────────────────────────────── */
/*  Component                                 */
/* ────────────────────────────────────────── */
const UsageView: React.FC = () => {
  const { user } = useAuthStore(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyDays, setHistoryDays] = useState<7 | 30 | 90>(30);
  const [countdown, setCountdown] = useState('');

  /* ── Fetch data ── */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryRes, historyRes] = await Promise.all([
        apiClient.get('/usage/summary').catch(() => null),
        apiClient.get(`/usage/history?days=${historyDays}`).catch(() => null),
      ]);

      if (summaryRes?.data) setSummary(summaryRes.data);
      if (historyRes?.data?.history) setHistory(historyRes.data.history);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load usage data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [historyDays]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Countdown timer to daily reset ── */
  useEffect(() => {
    if (!summary?.resetTime) return;
    const tick = () => {
      const now = Date.now();
      const reset = new Date(summary.resetTime).getTime();
      const diff = Math.max(0, reset - now);
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setCountdown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [summary?.resetTime]);

  /* ── Chart data ── */
  const chartData = history
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      name: new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      questions: r.aiQuestions,
      tokens: r.aiTokensUsed,
      uploads: r.fileUploads,
    }));

  const planBadge = PLAN_BADGES[summary?.plan || 'free'] ?? PLAN_BADGES.free;

  /* ── Derived percentages ── */
  const aiPct = summary ? pct(summary.today.aiQuestions.used, summary.today.aiQuestions.limit) : 0;
  const uploadPct = summary ? pct(summary.today.fileUploads.used, summary.today.fileUploads.limit) : 0;
  const boardPct = summary ? pct(summary.totals.boards.used, summary.totals.boards.limit) : 0;
  const nbPct = summary ? pct(summary.totals.notebooks.used, summary.totals.notebooks.limit) : 0;
  const storagePct = summary?.totals.storage.percentUsed ?? 0;

  /* ──────────────────────── Render ──────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-slate-200 mb-1">
              Usage &amp; Limits
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Track your resource consumption and plan limits
            </p>
          </div>
          <button
            onClick={loadData}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <ICONS.Clock className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
              <p className="text-sm text-slate-400 dark:text-slate-500 font-bold">Loading usage data…</p>
            </div>
          </div>
        ) : error || !summary ? (
          <Card className="text-center py-16">
            <ICONS.Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">
              {error || 'Unable to load usage data'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Make sure the backend is running and try again.
            </p>
            <button
              onClick={loadData}
              className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors"
            >
              Retry
            </button>
          </Card>
        ) : (
          <>
            {/* ═══════ Row 1: Plan + Reset + Quick Stats ═══════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Plan */}
              <Card className="flex flex-col items-start justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Current Plan
                </p>
                <Badge variant={planBadge.color} className="text-sm px-4! py-1.5!">
                  {planBadge.label}
                </Badge>
                {summary.plan === 'free' && (
                  <button
                    onClick={() => router.push('/pricing')}
                    className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Upgrade →
                  </button>
                )}
              </Card>

              {/* Daily Reset */}
              <Card className="flex flex-col items-start justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Daily Reset In
                </p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tabular-nums">
                  {countdown || '—'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Limits reset at midnight</p>
              </Card>

              {/* AI Questions Today */}
              <Card className="flex flex-col justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  AI Questions Today
                </p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                  {summary.today.aiQuestions.used}
                  <span className="text-base text-slate-400 dark:text-slate-500 font-medium ml-1">
                    / {limitLabel(summary.today.aiQuestions.limit)}
                  </span>
                </p>
                {summary.today.aiQuestions.limit !== -1 && (
                  <div className="mt-2">
                    <ProgressBar progress={aiPct} color={pctColor(aiPct)} />
                  </div>
                )}
              </Card>

              {/* File Uploads Today */}
              <Card className="flex flex-col justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  File Uploads Today
                </p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                  {summary.today.fileUploads.used}
                  <span className="text-base text-slate-400 dark:text-slate-500 font-medium ml-1">
                    / {limitLabel(summary.today.fileUploads.limit)}
                  </span>
                </p>
                {summary.today.fileUploads.limit !== -1 && (
                  <div className="mt-2">
                    <ProgressBar progress={uploadPct} color={pctColor(uploadPct)} />
                  </div>
                )}
              </Card>
            </div>

            {/* ═══════ Row 2: Resource Limits ═══════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Boards */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <ICONS.StudyBoard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Study Boards</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Total created</p>
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-200">
                    {summary.totals.boards.used}
                    <span className="text-sm text-slate-400 dark:text-slate-500 font-medium ml-1">
                      / {limitLabel(summary.totals.boards.limit)}
                    </span>
                  </p>
                </div>
                {summary.totals.boards.limit !== -1 && (
                  <ProgressBar progress={boardPct} color={pctColor(boardPct)} />
                )}
                {summary.totals.boards.limit !== -1 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {remainingLabel(summary.totals.boards.remaining)} remaining
                  </p>
                )}
              </Card>

              {/* Notebooks */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <ICONS.StickyNote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Notebooks</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Total created</p>
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-200">
                    {summary.totals.notebooks.used}
                    <span className="text-sm text-slate-400 dark:text-slate-500 font-medium ml-1">
                      / {limitLabel(summary.totals.notebooks.limit)}
                    </span>
                  </p>
                </div>
                {summary.totals.notebooks.limit !== -1 && (
                  <ProgressBar progress={nbPct} color={pctColor(nbPct)} />
                )}
                {summary.totals.notebooks.limit !== -1 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    {remainingLabel(summary.totals.notebooks.remaining)} remaining
                  </p>
                )}
              </Card>

              {/* Storage */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <ICONS.Upload className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Storage</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Files &amp; documents</p>
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-800 dark:text-slate-200">
                    {summary.totals.storage.used}
                    <span className="text-sm text-slate-400 dark:text-slate-500 font-medium ml-1">
                      / {summary.totals.storage.limit}
                    </span>
                  </p>
                </div>
                <ProgressBar progress={storagePct} color={pctColor(storagePct)} />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  {storagePct}% used
                </p>
              </Card>
            </div>

            {/* ═══════ Row 3: History Chart ═══════ */}
            <Card className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Activity History</h3>
                <div className="flex gap-2">
                  {([7, 30, 90] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setHistoryDays(d)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        historyDays === d
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-75">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '16px',
                          border: 'none',
                          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
                          backgroundColor: '#1e293b',
                          color: '#f1f5f9',
                        }}
                      />
                      <Bar dataKey="questions" name="AI Questions" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="uploads" name="File Uploads" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                    <ICONS.Sparkles className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm font-bold">No activity in this period</p>
                    <p className="text-xs">Start using AI features to see your history here.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* ═══════ Row 4: Token Usage + Monthly Stats ═══════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Token Trend */}
              <Card>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Token Consumption</h3>
                <div className="h-62.5">
                  {chartData.length > 0 && chartData.some((d) => d.tokens > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '16px',
                            border: 'none',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
                            backgroundColor: '#1e293b',
                            color: '#f1f5f9',
                          }}
                          formatter={(v) => [Number(v ?? 0).toLocaleString(), 'Tokens'] as [string, string]}
                        />
                        <Area
                          type="monotone"
                          dataKey="tokens"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          fill="url(#colorTokens)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                      <p className="text-sm font-bold">No token data yet</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Monthly Summary */}
              <Card>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">30-Day Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5">
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-2">
                      Total Questions
                    </p>
                    <p className="text-3xl font-black text-indigo-900 dark:text-indigo-300">
                      {summary.monthly?.totalQuestions?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-5">
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase mb-2">
                      Total Tokens
                    </p>
                    <p className="text-3xl font-black text-violet-900 dark:text-violet-300">
                      {summary.monthly?.totalTokens
                        ? summary.monthly.totalTokens >= 1000
                          ? `${(summary.monthly.totalTokens / 1000).toFixed(1)}K`
                          : summary.monthly.totalTokens
                        : 0}
                    </p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                      File Uploads
                    </p>
                    <p className="text-3xl font-black text-emerald-900 dark:text-emerald-300">
                      {summary.monthly?.totalFileUploads?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-2">
                      Avg Daily Qs
                    </p>
                    <p className="text-3xl font-black text-amber-900 dark:text-amber-300">
                      {summary.monthly?.avgDailyQuestions?.toFixed(1) || 0}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* ═══════ Row 5: Plan Limits Reference ═══════ */}
            <Card className="mb-6">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-4">
                Your Plan Limits
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-100 dark:border-slate-800">
                      <th className="text-left py-3 px-4 font-bold text-slate-500 dark:text-slate-400">Resource</th>
                      <th className="text-right py-3 px-4 font-bold text-slate-500 dark:text-slate-400">Used</th>
                      <th className="text-right py-3 px-4 font-bold text-slate-500 dark:text-slate-400">Limit</th>
                      <th className="text-right py-3 px-4 font-bold text-slate-500 dark:text-slate-400">Remaining</th>
                      <th className="text-right py-3 px-4 font-bold text-slate-500 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    <LimitRow
                      label="AI Questions / day"
                      used={summary.today.aiQuestions.used}
                      limit={summary.today.aiQuestions.limit}
                      remaining={summary.today.aiQuestions.remaining}
                    />
                    <LimitRow
                      label="File Uploads / day"
                      used={summary.today.fileUploads.used}
                      limit={summary.today.fileUploads.limit}
                      remaining={summary.today.fileUploads.remaining}
                    />
                    <LimitRow
                      label="Study Boards"
                      used={summary.totals.boards.used}
                      limit={summary.totals.boards.limit}
                      remaining={summary.totals.boards.remaining}
                    />
                    <LimitRow
                      label="Notebooks"
                      used={summary.totals.notebooks.used}
                      limit={summary.totals.notebooks.limit}
                      remaining={summary.totals.notebooks.remaining}
                    />
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Storage</td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{summary.totals.storage.used}</td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{summary.totals.storage.limit}</td>
                      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">—</td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={pctColor(storagePct)}>{storagePct}%</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {summary.plan === 'free' && (
                <div className="mt-6 flex items-center gap-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4">
                  <ICONS.Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex-1">
                    Upgrade to <span className="font-bold text-indigo-600 dark:text-indigo-400">Basic</span> for
                    100 AI questions/day, 5 boards, 20 notebooks, 5 GB storage and more.
                  </p>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="px-5 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors text-sm shrink-0"
                  >
                    View Plans
                  </button>
                </div>
              )}
            </Card>

            {/* ═══════ High Usage Alert ═══════ */}
            {aiPct >= 80 && summary.today.aiQuestions.limit !== -1 && (
              <Card className="bg-linear-to-r from-rose-50 dark:from-rose-900/20 to-orange-50 dark:to-orange-900/20 border-rose-200 dark:border-rose-800">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                    <ICONS.Sparkles className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-1">
                      High Usage Alert
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      You&apos;ve used {summary.today.aiQuestions.used} of {summary.today.aiQuestions.limit} daily AI
                      questions ({aiPct}%).{' '}
                      {aiPct >= 100
                        ? 'Your AI features are limited until the next reset.'
                        : 'Consider upgrading to avoid hitting your limit.'}
                    </p>
                    {summary.plan === 'free' && (
                      <button
                        onClick={() => router.push('/pricing')}
                        className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors text-sm"
                      >
                        Upgrade Now
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ── Table row helper ── */
function LimitRow({
  label,
  used,
  limit,
  remaining,
}: {
  label: string;
  used: number;
  limit: number;
  remaining: number | 'unlimited';
}) {
  const p = pct(used, limit);
  return (
    <tr>
      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{label}</td>
      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{used}</td>
      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{limitLabel(limit)}</td>
      <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">{remainingLabel(remaining)}</td>
      <td className="py-3 px-4 text-right">
        {limit === -1 ? (
          <Badge variant="emerald">Unlimited</Badge>
        ) : (
          <Badge variant={pctColor(p)}>{p}%</Badge>
        )}
      </td>
    </tr>
  );
}

export default UsageView;
