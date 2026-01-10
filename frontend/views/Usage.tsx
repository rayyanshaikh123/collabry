'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, ProgressBar } from '../components/UIElements';
import { ICONS } from '../constants';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { usageService, type UsageStats } from '../src/services/usage.service';
import { useAuthStore } from '../src/stores/auth.store';
import { useRouter } from 'next/navigation';

const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    limit: 10000, // 10K tokens/day
    price: '₹0/month',
    features: ['10K tokens/day', 'Basic AI features', 'Community support', 'Resets every 24 hours']
  },
  basic: {
    name: 'Basic',
    limit: 100000, // 100K tokens/day (updated from 50K)
    price: '₹9/month',
    features: ['100K tokens/day', 'All AI features', 'Priority support', 'Export data']
  },
  pro: {
    name: 'Pro',
    limit: 1000000, // 1M tokens/day (updated from 200K)
    price: '₹29/month',
    features: ['Unlimited tokens', 'Advanced AI models', '24/7 support', 'Custom integrations']
  },
  enterprise: {
    name: 'Enterprise',
    limit: 10000000, // 10M tokens/day
    price: '₹99,999 lifetime',
    features: ['Everything in Pro', 'Dedicated AI instance', 'SLA guarantee', 'Custom training']
  }
};

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const UsageView: React.FC = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(7);

  useEffect(() => {
    loadUsage();
  }, [selectedPeriod]);

  const loadUsage = async () => {
    try {
      setLoading(true);
      const data = await usageService.getMyUsage(selectedPeriod);
      setUsage(data);
    } catch (error: any) {
      console.error('Failed to load usage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user's subscription tier (default to free)
  const subscriptionTier = (user?.subscriptionTier as keyof typeof SUBSCRIPTION_TIERS) || 'free';
  const tierInfo = SUBSCRIPTION_TIERS[subscriptionTier];
  const usagePercentage = usage ? (usage.total_tokens / tierInfo.limit) * 100 : 0;
  const remainingTokens = usage ? Math.max(0, tierInfo.limit - usage.total_tokens) : tierInfo.limit;

  // Prepare chart data
  const dailyData = usage?.daily_usage 
    ? Object.entries(usage.daily_usage).map(([date, data]) => ({
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tokens: data.tokens,
        operations: data.operations
      })).slice(-14) // Last 14 days
    : [];

  const operationsData = usage?.operations_by_type
    ? Object.entries(usage.operations_by_type).map(([name, value]) => ({
        name: formatOperationName(name),
        value
      }))
    : [];

  function formatOperationName(opType: string): string {
    const names: Record<string, string> = {
      chat: 'Chat',
      chat_stream: 'Chat',
      session_chat: 'Chat',
      summarize: 'Summarize',
      summarize_stream: 'Summarize',
      qa: 'Q&A',
      qa_stream: 'Q&A',
      qa_file: 'Q&A (File)',
      qa_file_stream: 'Q&A (File)',
      mindmap: 'Mind Map',
      upload: 'Upload',
    };
    return names[opType] || opType;
  }

  const getUsageColor = () => {
    if (usagePercentage < 50) return 'emerald';
    if (usagePercentage < 80) return 'amber';
    return 'rose';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-800 dark:text-slate-200 mb-2">AI Usage</h1>
          <p className="text-slate-500 dark:text-slate-400">Monitor your AI token consumption and activity</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400 dark:text-slate-500">Loading usage data...</div>
          </div>
        ) : (
          <>
            {/* Current Plan & Usage Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <Card className="lg:col-span-2">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-1">Current Usage</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedPeriod} day{selectedPeriod > 1 ? 's' : ''} period
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {[7, 30, 90].map((days) => (
                      <button
                        key={days}
                        onClick={() => setSelectedPeriod(days as 7 | 30 | 90)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          selectedPeriod === days
                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Token Usage */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Tokens Used</p>
                        <p className="text-3xl font-black text-slate-800 dark:text-slate-200">
                          {usage?.total_tokens.toLocaleString() || 0}
                          <span className="text-lg text-slate-400 dark:text-slate-500 font-medium ml-2">
                            / {tierInfo.limit.toLocaleString()}
                          </span>
                        </p>
                      </div>
                      <Badge variant={getUsageColor() as any}>
                        {usagePercentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <ProgressBar 
                      progress={Math.min(100, usagePercentage)} 
                      color={getUsageColor() as any}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {remainingTokens.toLocaleString()} tokens remaining
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl p-4">
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">Operations</p>
                      <p className="text-2xl font-black text-indigo-900 dark:text-indigo-300">
                        {usage?.total_operations || 0}
                      </p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl p-4">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Success Rate</p>
                      <p className="text-2xl font-black text-emerald-900 dark:text-emerald-300">
                        {usage?.success_rate.toFixed(1) || 0}%
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/30 rounded-2xl p-4">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Avg Response</p>
                      <p className="text-2xl font-black text-amber-900 dark:text-amber-300">
                        {usage?.avg_response_time_ms.toFixed(0) || 0}ms
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Current Plan Card */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">Current Plan</h3>
                  <Badge variant="indigo">{tierInfo.name}</Badge>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-200 mb-1">{tierInfo.price}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">per month</p>
                  </div>
                  <div className="space-y-2">
                    {tierInfo.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <ICONS.Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
                      </div>
                    ))}
                  </div>
                  {subscriptionTier === 'free' && (
                    <button 
                      onClick={() => router.push('/pricing')}
                      className="w-full mt-4 px-4 py-3 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors"
                    >
                      Upgrade Plan
                    </button>
                  )}
                </div>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Daily Usage Chart */}
              <Card>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Daily Token Usage</h3>
                <div className="h-[300px]">
                  {dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyData}>
                        <defs>
                          <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} 
                        />
                        <Tooltip 
                          contentStyle={{
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                            backgroundColor: '#1e293b',
                            color: '#f1f5f9'
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="tokens" 
                          stroke="#6366f1" 
                          strokeWidth={3}
                          fill="url(#colorTokens)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                      No usage data available
                    </div>
                  )}
                </div>
              </Card>

              {/* Operations Breakdown */}
              <Card>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Operations Breakdown</h3>
                <div className="h-[300px]">
                  {operationsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={operationsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {operationsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                            backgroundColor: '#1e293b',
                            color: '#f1f5f9'
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                      No operations data available
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Usage Tips */}
            {usagePercentage > 80 && (
              <Card className="bg-gradient-to-r from-rose-50 dark:from-rose-900/30 to-orange-50 dark:to-orange-900/30 border-rose-200 dark:border-rose-800">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                    <ICONS.Sparkles className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">High Usage Alert</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      You've used {usagePercentage.toFixed(1)}% of your daily token limit. 
                      {usagePercentage >= 100 
                        ? ' Your AI features will be limited until the next 24-hour reset or you upgrade your plan.'
                        : ' Consider upgrading to avoid hitting your daily limit.'}
                    </p>
                    {subscriptionTier === 'free' && (
                      <button className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors">
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

export default UsageView;
