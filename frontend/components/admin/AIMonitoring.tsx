import React from 'react';
import { Card, ProgressBar, Badge } from '../UIElements';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import type { GlobalUsage, RealtimeStats } from '@/lib/services/usage.service';
import { usageService } from '@/lib/services/usage.service';

interface AIMonitoringProps {
  globalUsage: GlobalUsage | null;
  realtimeStats: RealtimeStats | null;
  usageLoading: boolean;
  chartData: Array<{
    name: string;
    usage: number;
    growth: number;
  }>;
  userNames: Record<string, string>;
}

const AIMonitoring: React.FC<AIMonitoringProps> = ({
  globalUsage,
  realtimeStats,
  usageLoading,
  chartData,
  userNames,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-amber-50 border-amber-100">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">AI Questions (7d)</p>
          <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">
            {usageLoading ? '...' : usageService.formatNumber(globalUsage?.total_operations || 0)}
          </h4>
          <div className="mt-4">
            <ProgressBar 
              progress={Math.min(((globalUsage?.total_operations || 0) / 10000) * 100, 100)} 
              color="bg-amber-400" 
            />
          </div>
          <p className="text-xs text-amber-600 mt-2 font-bold">
            {realtimeStats?.last_hour?.total_operations || 0} questions in last hour
          </p>
        </Card>
        <Card className="bg-indigo-50 border-indigo-100">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Success Rate</p>
          <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">
            {usageLoading ? '...' : `${globalUsage?.success_rate?.toFixed(1) || 0}%`}
          </h4>
          <div className="mt-4">
            <ProgressBar 
              progress={globalUsage?.success_rate || 0} 
              color="bg-indigo-500" 
            />
          </div>
          <p className="text-xs text-indigo-600 mt-2 font-bold">
            {globalUsage?.successful_operations || 0} / {globalUsage?.total_operations || 0} operations
          </p>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Avg Latency</p>
          <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">
            {usageLoading ? '...' : `${(globalUsage?.avg_response_time_ms || 0).toFixed(0)}ms`}
          </h4>
          <div className="mt-4">
            <ProgressBar 
              progress={Math.min((globalUsage?.avg_response_time_ms || 0) / 50, 100)} 
              color="bg-emerald-500" 
            />
          </div>
          <p className="text-xs text-emerald-600 mt-2 font-bold">
            {realtimeStats?.last_hour?.total_operations || 0} operations last hour
          </p>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-8">Operations by Type (7d)</h3>
          <div className="h-[400px]">
            {usageLoading ? (
              <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>
            ) : globalUsage?.operations_by_type ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageService.formatOperationsByType(globalUsage.operations_by_type)}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} 
                  />
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[10, 10, 10, 10]} 
                    barSize={50} 
                    fill="#818cf8" 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No data available</div>
            )}
          </div>
        </Card>
        
        <Card>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-8">Top Users by Operations</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {usageLoading ? (
              <div className="text-slate-400 text-center py-8">Loading...</div>
            ) : globalUsage?.top_users && globalUsage.top_users.length > 0 ? (
              globalUsage.top_users.map((user: any, idx: number) => (
                <div key={user.user_id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{userNames[user.user_id] || user.user_id}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-400">{user.operations} operations</p>
                    </div>
                  </div>
                  <Badge variant="indigo">{usageService.formatNumber(user.operations)}</Badge>
                </div>
              ))
            ) : (
              <div className="text-slate-400 text-center py-8">No user data available</div>
            )}
          </div>
        </Card>
      </div>
      
      <Card>
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-8">Daily Activity (Last 7 Days)</h3>
        <div className="h-[300px]">
          {usageLoading ? (
            <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQuestions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} 
                />
                <Tooltip 
                  contentStyle={{
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="usage" 
                  stroke="#818cf8" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorUsage)" 
                  name="Operations"
                />
                <Area 
                  type="monotone" 
                  dataKey="growth" 
                  stroke="#fbbf24" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorQuestions)" 
                  name="AI Questions"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AIMonitoring;
