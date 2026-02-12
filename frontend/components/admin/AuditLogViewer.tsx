import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Input } from '../UIElements';
import { ICONS } from '../../constants';
import { auditLogService, type AuditLog, type AuditLogStats } from '@/lib/services/auditLog.service';

const EVENT_TYPES = [
  'register', 'login_success', 'login_failed', 'logout', 'logout_all',
  'token_refresh', 'token_theft_detected', 'password_change',
  'password_reset_request', 'password_reset_complete',
  'email_verification', 'account_locked',
];

const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await auditLogService.getLogs({
        page,
        limit: 30,
        search: search || undefined,
        event: eventFilter || undefined,
        success: successFilter || undefined,
      });
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, search, eventFilter, successFilter]);

  const loadStats = useCallback(async () => {
    try {
      const data = await auditLogService.getStats();
      setStats(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Time', 'Event', 'User', 'Email', 'IP', 'Success'];
    const rows = logs.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.event,
      typeof l.userId === 'object' && l.userId ? l.userId.name : '-',
      l.email || (typeof l.userId === 'object' && l.userId ? l.userId.email : '-'),
      l.ipAddress || '-',
      l.success ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Events (24h)</p>
            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{stats.last24hCount}</h4>
          </Card>
          <Card className="bg-rose-50 dark:bg-rose-950/30 border-rose-100">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Failed Logins (24h)</p>
            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{stats.failedLogins}</h4>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-100">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Security Alerts (7d)</p>
            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{stats.recentSecurityEvents.length}</h4>
          </Card>
        </div>
      )}

      {/* Security Alerts */}
      {stats && stats.recentSecurityEvents.length > 0 && (
        <Card className="border-rose-200 dark:border-rose-800">
          <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-3">
            <ICONS.AlertCircle size={14} className="inline mr-1" /> Recent Security Events
          </h3>
          <div className="space-y-2">
            {stats.recentSecurityEvents.slice(0, 5).map((ev) => (
              <div key={ev._id} className="flex items-center justify-between text-xs p-2 bg-rose-50 dark:bg-rose-950/20 rounded-lg">
                <div>
                  <Badge variant="rose">{auditLogService.formatEvent(ev.event)}</Badge>
                  <span className="ml-2 text-slate-600 dark:text-slate-400">
                    {typeof ev.userId === 'object' && ev.userId ? ev.userId.email : ev.email || 'Unknown'}
                  </span>
                </div>
                <span className="text-slate-400">{new Date(ev.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Log Table */}
      <Card noPadding>
        <div className="p-6 border-b-2 border-slate-50 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Audit Logs</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="Search email/IP..."
              className="w-48"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select
              value={eventFilter}
              onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}
              className="text-xs font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300"
            >
              <option value="">All Events</option>
              {EVENT_TYPES.map((e) => (
                <option key={e} value={e}>{auditLogService.formatEvent(e)}</option>
              ))}
            </select>
            <select
              value={successFilter}
              onChange={(e) => { setSuccessFilter(e.target.value); setPage(1); }}
              className="text-xs font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300"
            >
              <option value="">All Results</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <ICONS.Download size={14} className="mr-1" /> Export CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black dark:text-slate-200 text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50 font-bold text-sm">
              {loading && logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">No logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={auditLogService.getEventColor(log.event) as any}>
                        {auditLogService.formatEvent(log.event)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="leading-tight">
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          {typeof log.userId === 'object' && log.userId ? log.userId.name : '-'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {log.email || (typeof log.userId === 'object' && log.userId ? log.userId.email : '-')}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.ipAddress || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={log.success ? 'emerald' : 'rose'}>
                        {log.success ? 'OK' : 'FAIL'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t-2 border-slate-50 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-bold">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AuditLogViewer;
