import React from 'react';
import { Card, ProgressBar } from '../UIElements';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import type { GlobalUsage, RealtimeStats } from '@/lib/services/usage.service';
import { usageService } from '@/lib/services/usage.service';

interface AdminOverviewProps {
  stats: Array<{
    label: string;
    value: string;
    change: string;
    icon: React.ComponentType<any>;
    color: string;
    bg: string;
  }>;
  chartData: Array<{
    name: string;
    usage: number;
    growth: number;
  }>;
  globalUsage: GlobalUsage | null;
  realtimeStats: RealtimeStats | null;
}

const AdminOverview: React.FC<AdminOverviewProps> = ({
  stats,
  chartData,
  globalUsage,
  realtimeStats,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Card key={i} className="flex items-center gap-5 border-b-8 border-slate-100">
            <div className={`w-14 h-14 ${s.bg} ${s.color} rounded-[1.5rem] flex items-center justify-center shadow-lg`}>
              <s.icon size={28} strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <h4 className="text-2xl font-black text-slate-800 dark:text-slate-200">{s.value}</h4>
              <span className={`text-[10px] font-black ${s.change.includes('active') || s.change.includes('success') || s.change.includes('in') ? 'text-emerald-500' : s.change.startsWith('+') ? 'text-emerald-500' : 'text-slate-500'}`}>{s.change}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-8">Platform Traffic</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="usage" stroke="#818cf8" strokeWidth={4} fillOpacity={1} fill="url(#colorUsage)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-8">Active Operations</h3>
          <div className="space-y-4">
            {globalUsage?.operations_by_type && Object.keys(globalUsage.operations_by_type).length > 0 ? (
              Object.entries(globalUsage.operations_by_type)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 4)
                .map(([type, count], i) => {
                  const colors = ['bg-emerald-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-500'];
                  const percentage = globalUsage.total_operations > 0 
                    ? Math.round(((count as number) / globalUsage.total_operations) * 100) 
                    : 0;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span>{percentage}% ({count as number} ops)</span>
                      </div>
                      <ProgressBar progress={percentage} color={colors[i % colors.length]} />
                    </div>
                  );
                })
            ) : realtimeStats?.last_hour?.total_operations ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm font-bold">{realtimeStats.last_hour.total_operations} operations</p>
                <p className="text-xs mt-2">in the last hour</p>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm font-bold">No operations yet</p>
                <p className="text-xs mt-2">Start using AI features to see activity</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;
