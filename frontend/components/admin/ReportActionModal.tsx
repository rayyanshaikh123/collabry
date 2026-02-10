import React from 'react';
import { Card, Button } from '../UIElements';
import type { Report } from '@/lib/services/report.service';
import { reportService } from '@/lib/services/report.service';

interface ReportActionModalProps {
  showReportModal: boolean;
  setShowReportModal: (show: boolean) => void;
  selectedReport: Report | null;
  selectedAction: string;
  setSelectedAction: (action: string) => void;
  actionNotes: string;
  setActionNotes: (notes: string) => void;
  reportsLoading: boolean;
  handleSubmitAction: () => void;
}

const ReportActionModal: React.FC<ReportActionModalProps> = ({
  showReportModal,
  setShowReportModal,
  selectedReport,
  selectedAction,
  setSelectedAction,
  actionNotes,
  setActionNotes,
  reportsLoading,
  handleSubmitAction,
}) => {
  if (!showReportModal || !selectedReport) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-4">Take Action on Report</h3>
        
        <div className="space-y-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Reported By</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedReport.reportedBy.name}</p>
            <p className="text-xs text-slate-500">{selectedReport.reportedBy.email}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Reason</p>
            <p className="text-sm font-bold text-rose-600">{reportService.formatReason(selectedReport.reason)}</p>
            <p className="text-sm text-slate-700 mt-2">{selectedReport.description}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Action to Take</label>
            <select 
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-400"
            >
              <option value="none">No Action</option>
              <option value="warning">Issue Warning</option>
              <option value="content_removed">Remove Content</option>
              <option value="user_suspended">Suspend User</option>
              <option value="user_banned">Ban User</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Review Notes</label>
            <textarea 
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="Add notes about this decision..."
              className="w-full h-32 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setShowReportModal(false)}
            disabled={reportsLoading}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            className="flex-1"
            onClick={handleSubmitAction}
            disabled={reportsLoading}
          >
            {reportsLoading ? 'Processing...' : 'Submit Action'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ReportActionModal;
