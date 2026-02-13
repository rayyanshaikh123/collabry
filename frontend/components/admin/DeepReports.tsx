'use client';

import React, { useEffect, useState } from 'react';
import { Card, Badge, ProgressBar } from '../UIElements';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import deepReportsService, {
  type UserGrowthReport,
  type EngagementReport,
  type AIUsageReport,
  type BoardsReport,
  type RevenueReport,
} from '@/lib/services/deepReports.service';

type ReportTab = 'growth' | 'engagement' | 'ai' | 'boards' | 'revenue';

const TABS: { key: ReportTab; label: string; icon: string }[] = [
  { key: 'growth', label: 'User Growth', icon: '👥' },
  { key: 'engagement', label: 'Engagement', icon: '🔥' },
  { key: 'ai', label: 'AI Usage', icon: '🤖' },
  { key: 'boards', label: 'Boards', icon: '📋' },
  { key: 'revenue', label: 'Revenue', icon: '💰' },
];

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e'];
const PERIOD_OPTIONS = [7, 14, 30, 90, 365];

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'bg-indigo-500' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-800 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

// ── Leaderboard table ────────────────────────────────────────────────────────
function LeaderboardTable({ title, rows, columns }: { title: string; rows: Record<string, any>[]; columns: { key: string; label: string }[] }) {
  return (
    <Card className="p-5">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">No data yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left pb-2 font-semibold text-slate-500">#</th>
                {columns.map((c) => (
                  <th key={c.key} className="text-left pb-2 font-semibold text-slate-500">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="py-2 font-semibold text-indigo-500">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key} className="py-2 text-slate-700 dark:text-slate-300">{row[c.key] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DeepReports() {
  const [tab, setTab] = useState<ReportTab>('growth');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const [growth, setGrowth] = useState<UserGrowthReport | null>(null);
  const [engagement, setEngagement] = useState<EngagementReport | null>(null);
  const [aiUsage, setAIUsage] = useState<AIUsageReport | null>(null);
  const [boards, setBoards] = useState<BoardsReport | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      switch (tab) {
        case 'growth':
          setGrowth(await deepReportsService.getUserGrowth(days));
          break;
        case 'engagement':
          setEngagement(await deepReportsService.getEngagement(days));
          break;
        case 'ai':
          setAIUsage(await deepReportsService.getAIUsage(days));
          break;
        case 'boards':
          setBoards(await deepReportsService.getBoards(days));
          break;
        case 'revenue':
          setRevenue(await deepReportsService.getRevenue(days));
          break;
      }
    } catch (err) {
      // Graceful — data stays null, sections show "No data"
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab, days]);

  // ── Renderers ──────────────────────────────────────────────────────────────

  const renderGrowth = () => {
    if (!growth) return null;
    const { signupTrend, roleDistribution, tierDistribution, summary } = growth;
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Users" value={summary.totalUsers} />
          <StatCard label="Active Users" value={summary.activeUsers} sub={`${((summary.activeUsers / Math.max(summary.totalUsers, 1)) * 100).toFixed(0)}% of total`} />
          <StatCard label="Verified" value={summary.verifiedUsers} />
          <StatCard label="Logins (7d)" value={summary.recentLogins} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <Card className="lg:col-span-2 p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Signup Trend</h4>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={signupTrend}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#signupGrad)" name="Signups" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Role Distribution</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie 
                  data={roleDistribution} 
                  dataKey="count" 
                  nameKey="role" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={70} 
                  label={(props) => `${props.payload.role}: ${props.payload.count}`}
                >
                  {roleDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card className="p-5">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Subscription Tier Breakdown</h4>
          <div className="space-y-3">
            {tierDistribution.map((t) => (
              <div key={t.tier} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 w-20 capitalize">{t.tier}</span>
                <div className="flex-1">
                  <ProgressBar progress={Math.round((t.count / Math.max(summary.totalUsers, 1)) * 100)} color="bg-indigo-500" label={`${t.count} users`} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </>
    );
  };

  const renderEngagement = () => {
    if (!engagement) return null;
    const { dauTrend, topByStudyTime, topByXP, focusStats, planStats } = engagement;
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Focus Sessions" value={focusStats.totalSessions} sub={`${focusStats.completedSessions} completed`} />
          <StatCard label="Study Minutes" value={focusStats.totalMinutes.toLocaleString()} />
          <StatCard label="Study Plans" value={planStats.totalPlans} sub={`${planStats.aiGenerated} AI-generated`} />
          <StatCard label="Avg Completion" value={`${(planStats.avgCompletion || 0).toFixed(0)}%`} sub={`${planStats.completedPlans} fully done`} />
        </div>

        <Card className="p-5 mb-6">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Daily Active Users</h4>
          {dauTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dauTrend}>
                <defs>
                  <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="activeUsers" stroke="#8b5cf6" fill="url(#dauGrad)" name="Active Users" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No login data in this period</p>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeaderboardTable
            title="🏆 Top by Study Time"
            rows={topByStudyTime}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'studyTime', label: 'Minutes' },
              { key: 'level', label: 'Level' },
            ]}
          />
          <LeaderboardTable
            title="⭐ Top by XP"
            rows={topByXP}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'xp', label: 'XP' },
              { key: 'streak', label: 'Streak' },
            ]}
          />
        </div>
      </>
    );
  };

  const renderAIUsage = () => {
    if (!aiUsage) return null;
    const { dailyTrend, byQuestionType, byModel, topConsumers, summary } = aiUsage;
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <StatCard label="LLM Tokens Used" value={summary.totalTokens.toLocaleString()} />
          <StatCard label="Total Questions" value={summary.totalQuestions.toLocaleString()} />
          <StatCard label="Unique AI Users" value={summary.uniqueUsers} />
        </div>

        <Card className="p-5 mb-6">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Daily AI Questions</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="totalQuestions" fill="#6366f1" radius={[4, 4, 0, 0]} name="Questions" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card className="p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">By Question Type</h4>
            {byQuestionType.length > 0 ? (
              <div className="space-y-2">
                {byQuestionType.map((t) => (
                  <div key={t.type} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{t.type || 'unknown'}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{t.count} calls · {t.totalTokens.toLocaleString()} tokens</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No detailed breakdown available</p>
            )}
          </Card>

          <Card className="p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">By Model</h4>
            {byModel.length > 0 ? (
              <div className="space-y-2">
                {byModel.map((m) => (
                  <div key={m.model} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-mono">{m.model || 'unknown'}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{m.count} calls · {m.totalTokens.toLocaleString()} tokens</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No detailed breakdown available</p>
            )}
          </Card>
        </div>

        <LeaderboardTable
          title="🔋 Top AI Consumers"
          rows={topConsumers}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'totalQuestions', label: 'Questions' },
            { key: 'totalTokens', label: 'LLM Tokens' },
          ]}
        />
      </>
    );
  };

  const renderBoards = () => {
    if (!boards) return null;
    const { creationTrend, collabMetrics, topCreators, popularTags } = boards;
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Boards" value={collabMetrics.totalBoards} />
          <StatCard label="Collab Boards" value={collabMetrics.collabBoards} sub={`${collabMetrics.soloBoards} solo`} />
          <StatCard label="Avg Members" value={collabMetrics.avgMembers.toFixed(1)} />
          <StatCard label="Avg Elements" value={collabMetrics.avgElements.toFixed(0)} />
        </div>

        <Card className="p-5 mb-6">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Board Creation Trend</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={creationTrend}>
              <defs>
                <linearGradient id="boardGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#boardGrad)" name="Boards Created" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LeaderboardTable
            title="🏗️ Top Board Creators"
            rows={topCreators}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'boardCount', label: 'Boards' },
            ]}
          />
          <Card className="p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Popular Tags</h4>
            {popularTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {popularTags.map((t) => (
                  <Badge key={t.tag} className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-0">
                    {t.tag} <span className="ml-1 opacity-60">({t.count})</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No tags used yet</p>
            )}
          </Card>
        </div>
      </>
    );
  };

  const renderRevenue = () => {
    if (!revenue) return null;
    const { revenueTrend, subDistribution, byMethod, summary } = revenue;
    const formatCurrency = (paise: number) => `₹${(paise / 100).toLocaleString()}`;
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Revenue" value={formatCurrency(summary.totalRevenue)} sub={`${summary.totalPayments} payments`} />
          <StatCard label="Avg Payment" value={formatCurrency(summary.avgPayment)} />
          <StatCard label="Active Subs" value={summary.activeSubscriptions} />
          <StatCard label="Discounts Given" value={formatCurrency(summary.totalDiscount)} />
        </div>

        <Card className="p-5 mb-6">
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Revenue Trend</h4>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueTrend.map((r) => ({ ...r, revenue: r.revenue / 100 }))}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => `₹${typeof v === 'number' ? v.toLocaleString() : v}`} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No payments in this period</p>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Subscription Plans</h4>
            {subDistribution.length > 0 ? (
              <div className="space-y-2">
                {subDistribution.map((s) => (
                  <div key={s.plan} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{s.plan}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No active subscriptions</p>
            )}
          </Card>
          <Card className="p-5">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Payment Methods</h4>
            {byMethod.length > 0 ? (
              <div className="space-y-2">
                {byMethod.map((m) => (
                  <div key={m.method} className="flex items-center justify-between text-xs">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{m.method || 'unknown'}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{m.count} txns · {formatCurrency(m.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No payment data</p>
            )}
          </Card>
        </div>
      </>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      );
    }
    switch (tab) {
      case 'growth': return renderGrowth();
      case 'engagement': return renderEngagement();
      case 'ai': return renderAIUsage();
      case 'boards': return renderBoards();
      case 'revenue': return renderRevenue();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white">Deep Reports</h3>
          <p className="text-xs text-slate-400">Platform analytics with aggregated insights</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                days === d
                  ? 'bg-indigo-500 text-white shadow'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {d === 365 ? '1y' : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="mr-1">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
