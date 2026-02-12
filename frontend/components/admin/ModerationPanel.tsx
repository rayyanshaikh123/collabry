import React, { useState } from 'react';
import { Card, Button, Badge } from '../UIElements';
import { ICONS } from '../../constants';
import type { Report, ReportStats } from '@/lib/services/report.service';
import { reportService } from '@/lib/services/report.service';

interface ModerationPanelProps {
  reports: Report[];
  reportStats: ReportStats | null;
  reportsLoading: boolean;
  handleDismissReport: (report: Report) => void;
  handleTakeAction: (report: Report) => void;
  handleBulkDeleteReports?: (ids: string[]) => void;
}

const ModerationPanel: React.FC<ModerationPanelProps> = ({
  reports,
  reportStats,
  reportsLoading,
  handleDismissReport,
  handleTakeAction,
  handleBulkDeleteReports,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map((r) => r._id)));
    }
  };

  const handleExportCSV = () => {
    if (reports.length === 0) return;
    const headers = ['Date', 'Reporter', 'Content Type', 'Reason', 'Description', 'Priority', 'Status'];
    const rows = reports.map((r) => [
      new Date(r.createdAt).toISOString(),
      r.reportedBy.name,
      r.contentType,
      r.reason,
      `"${r.description.replace(/"/g, '""')}"`,
      r.priority,
      r.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-6">
        <Card noPadding>
          <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Flagged Activity</h3>
              <Badge variant="rose">{reportStats?.pending || 0} New</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={reports.length === 0}>
                <ICONS.Download className="w-3.5 h-3.5 mr-1" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="mx-4 mt-4 flex items-center justify-between p-3 bg-rose-50 border-2 border-rose-200 rounded-2xl">
              <span className="text-sm font-bold text-rose-700">
                {selectedIds.size} report{selectedIds.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (handleBulkDeleteReports) {
                      handleBulkDeleteReports(Array.from(selectedIds));
                      setSelectedIds(new Set());
                    }
                  }}
                >
                  <ICONS.Trash className="w-3.5 h-3.5 mr-1" /> Delete Selected
                </Button>
              </div>
            </div>
          )}

          <div className="p-4 space-y-4">
            {/* Select all toggle */}
            {reports.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  checked={selectedIds.size === reports.length && reports.length > 0}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-500">Select all ({reports.length})</span>
              </div>
            )}
            {reportsLoading ? (
              <div className="text-center py-12 text-slate-400">
                Loading reports...
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm font-bold">No pending reports</p>
                <p className="text-xs mt-2">All content is in good standing</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border-2 border-transparent hover:border-rose-100 transition-all">
                  <div className="flex gap-4 items-center flex-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(report._id)}
                      onChange={() => toggleSelect(report._id)}
                      className="w-4 h-4 rounded accent-rose-500 cursor-pointer flex-shrink-0"
                    />
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${
                      report.priority === 'critical' ? 'bg-rose-200 text-rose-700' :
                      report.priority === 'high' ? 'bg-rose-100 text-rose-600' :
                      report.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      !
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {report.reportedBy.name}
                        <span className="text-[10px] text-slate-400 uppercase font-bold ml-2">
                          reported {report.contentType}
                        </span>
                      </p>
                      <p className="text-xs text-rose-500 font-bold">
                        {reportService.formatReason(report.reason)}: {report.description.slice(0, 50)}...
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {report.timeSinceReport || new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleDismissReport(report)}
                      disabled={reportsLoading}
                    >
                      Dismiss
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleTakeAction(report)}
                      disabled={reportsLoading}
                    >
                      Take Action
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Report Statistics */}
        {reportStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-rose-50 border-rose-100">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Pending</p>
              <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{reportStats.pending}</h4>
            </Card>
            <Card className="bg-amber-50 border-amber-100">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Reviewing</p>
              <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{reportStats.reviewing}</h4>
            </Card>
            <Card className="bg-emerald-50 border-emerald-100">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Resolved</p>
              <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{reportStats.resolved}</h4>
            </Card>
            <Card className="bg-slate-50 border-slate-100">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Total</p>
              <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{reportStats.total}</h4>
            </Card>
          </div>
        )}
      </div>

      <Card className="h-fit">
        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Report Summary</h3>
        <div className="space-y-4">
          {reportStats?.byType && Object.entries(reportStats.byType).length > 0 ? (
            Object.entries(reportStats.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-sm font-bold text-slate-700 capitalize">{type}</span>
                <Badge variant="slate">{count as number}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">No reports yet</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ModerationPanel;
