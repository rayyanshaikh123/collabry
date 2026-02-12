import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Input } from '../UIElements';
import { ICONS } from '../../constants';
import {
  adminSubscriptionService,
  type AdminSubscription,
  type AdminPayment,
  type SubscriptionStats,
} from '@/lib/services/adminSubscription.service';

const SubscriptionManagement: React.FC = () => {
  const [tab, setTab] = useState<'overview' | 'subscriptions' | 'payments'>('overview');
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [subPage, setSubPage] = useState(1);
  const [subTotalPages, setSubTotalPages] = useState(1);
  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [subSearch, setSubSearch] = useState('');
  const [paySearch, setPaySearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [payStatusFilter, setPayStatusFilter] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const data = await adminSubscriptionService.getStats();
      setStats(data);
    } catch {
      // silent
    }
  }, []);

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminSubscriptionService.getSubscriptions({
        page: subPage,
        limit: 20,
        search: subSearch || undefined,
        plan: planFilter || undefined,
        status: statusFilter || undefined,
      });
      setSubscriptions(data.subscriptions);
      setSubTotalPages(data.pagination.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [subPage, subSearch, planFilter, statusFilter]);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminSubscriptionService.getPayments({
        page: payPage,
        limit: 20,
        search: paySearch || undefined,
        status: payStatusFilter || undefined,
      });
      setPayments(data.payments);
      setPayTotalPages(data.pagination.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [payPage, paySearch, payStatusFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'subscriptions') loadSubscriptions(); }, [tab, loadSubscriptions]);
  useEffect(() => { if (tab === 'payments') loadPayments(); }, [tab, loadPayments]);

  const fmt = adminSubscriptionService.formatCurrency;

  const handleExportCSV = () => {
    if (tab === 'payments' && payments.length > 0) {
      const headers = ['Date', 'Payment ID', 'User', 'Email', 'Amount', 'Status', 'Method'];
      const rows = payments.map((p) => [
        new Date(p.createdAt).toISOString(),
        p.razorpay_payment_id,
        p.userData.name,
        p.userData.email,
        (p.amount / 100).toFixed(2),
        p.status,
        p.method || '-',
      ]);
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      downloadCSV(csv, 'payments');
    } else if (tab === 'subscriptions' && subscriptions.length > 0) {
      const headers = ['User', 'Email', 'Plan', 'Status', 'Amount', 'Interval', 'Created'];
      const rows = subscriptions.map((s) => [
        s.userData.name,
        s.userData.email,
        s.plan,
        s.status,
        (s.amount / 100).toFixed(2),
        s.interval,
        new Date(s.createdAt).toISOString(),
      ]);
      const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
      downloadCSV(csv, 'subscriptions');
    }
  };

  const downloadCSV = (csv: string, name: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const planColors: Record<string, string> = {
    free: 'slate', basic: 'indigo', pro: 'amber', enterprise: 'emerald',
  };
  const statusColors: Record<string, string> = {
    active: 'emerald', cancelled: 'rose', expired: 'slate', pending: 'amber', paused: 'amber',
    captured: 'emerald', failed: 'rose', refunded: 'sky', authorized: 'amber',
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        {(['overview', 'subscriptions', 'payments'] as const).map((t) => (
          <Button key={t} variant={tab === t ? 'primary' : 'outline'} size="sm" onClick={() => setTab(t)} className="capitalize">
            {t}
          </Button>
        ))}
      </div>

      {tab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Revenue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Revenue</p>
              <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{fmt(stats.totalRevenue)}</h4>
              <p className="text-xs text-emerald-500 mt-1">{stats.totalPayments} payments</p>
            </Card>
            <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Subscriptions by Plan</p>
              <div className="flex flex-wrap gap-3 mt-3">
                {Object.entries(stats.byPlan).map(([plan, count]) => (
                  <div key={plan} className="text-center">
                    <p className="text-xl font-black text-slate-800 dark:text-slate-200">{count}</p>
                    <Badge variant={planColors[plan] as any} className="capitalize">{plan}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Subscription Status</p>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <Badge variant={statusColors[status] as any} className="capitalize">{status}</Badge>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Revenue by Month */}
          {stats.revenueByMonth.length > 0 && (
            <Card>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Monthly Revenue</p>
              <div className="space-y-3">
                {stats.revenueByMonth.slice(0, 6).map((m) => {
                  const maxRev = Math.max(...stats.revenueByMonth.map((r) => r.revenue), 1);
                  return (
                    <div key={m.month}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{m.month}</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {fmt(m.revenue)} <span className="text-slate-400">({m.count} txns)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${(m.revenue / maxRev) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'overview' && !stats && (
        <Card className="text-center py-12 text-slate-400">Loading stats...</Card>
      )}

      {tab === 'subscriptions' && (
        <Card noPadding>
          <div className="p-6 border-b-2 border-slate-50 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">All Subscriptions</h3>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search user..." className="w-48" value={subSearch} onChange={(e) => { setSubSearch(e.target.value); setSubPage(1); }} />
              <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setSubPage(1); }} className="text-xs font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300">
                <option value="">All Plans</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setSubPage(1); }} className="text-xs font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleExportCSV}><ICONS.Download size={14} className="mr-1" /> CSV</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black dark:text-slate-200 text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Interval</th>
                  <th className="px-4 py-3">Period End</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50 font-bold text-sm">
                {loading && subscriptions.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : subscriptions.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No subscriptions found</td></tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="leading-tight">
                          <p className="text-xs text-slate-700 dark:text-slate-300">{sub.userData.name}</p>
                          <p className="text-[10px] text-slate-400">{sub.userData.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant={planColors[sub.plan] as any} className="capitalize">{sub.plan}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={statusColors[sub.status] as any} className="capitalize">{sub.status}</Badge></td>
                      <td className="px-4 py-3 text-xs">{fmt(sub.amount, sub.currency)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 capitalize">{sub.interval}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {subTotalPages > 1 && (
            <div className="p-4 border-t-2 border-slate-50 flex items-center justify-between">
              <p className="text-sm text-slate-500 font-bold">Page {subPage} of {subTotalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={subPage === 1} onClick={() => setSubPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={subPage === subTotalPages} onClick={() => setSubPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 'payments' && (
        <Card noPadding>
          <div className="p-6 border-b-2 border-slate-50 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Payment History</h3>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search..." className="w-48" value={paySearch} onChange={(e) => { setPaySearch(e.target.value); setPayPage(1); }} />
              <select value={payStatusFilter} onChange={(e) => { setPayStatusFilter(e.target.value); setPayPage(1); }} className="text-xs font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300">
                <option value="">All Status</option>
                <option value="captured">Captured</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="pending">Pending</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleExportCSV}><ICONS.Download size={14} className="mr-1" /> CSV</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black dark:text-slate-200 text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Payment ID</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-50 font-bold text-sm">
                {loading && payments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No payments found</td></tr>
                ) : (
                  payments.map((pay) => (
                    <tr key={pay._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(pay.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="leading-tight">
                          <p className="text-xs text-slate-700 dark:text-slate-300">{pay.userData.name}</p>
                          <p className="text-[10px] text-slate-400">{pay.userData.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{pay.razorpay_payment_id}</td>
                      <td className="px-4 py-3 text-xs">
                        {fmt(pay.amount, pay.currency)}
                        {pay.discountApplied ? (
                          <span className="text-emerald-500 ml-1">(-{fmt(pay.discountApplied, pay.currency)})</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3"><Badge variant={statusColors[pay.status] as any} className="capitalize">{pay.status}</Badge></td>
                      <td className="px-4 py-3 text-xs text-slate-400 capitalize">{pay.method || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {payTotalPages > 1 && (
            <div className="p-4 border-t-2 border-slate-50 flex items-center justify-between">
              <p className="text-sm text-slate-500 font-bold">Page {payPage} of {payTotalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={payPage === 1} onClick={() => setPayPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={payPage === payTotalPages} onClick={() => setPayPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default SubscriptionManagement;
