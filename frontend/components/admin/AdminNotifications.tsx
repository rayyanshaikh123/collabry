import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Input } from '../UIElements';
import { ICONS } from '../../constants';
import { adminNotificationService, type Announcement, type BroadcastData } from '@/lib/services/adminNotification.service';

const AdminNotifications: React.FC = () => {
  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState<BroadcastData>({
    title: '',
    message: '',
    priority: 'medium',
    targetRole: '',
    targetTier: '',
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await adminNotificationService.getHistory({ page: historyPage, limit: 10 });
      setAnnouncements(data.announcements);
      setHistoryTotalPages(data.pagination.totalPages);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  const handleSend = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      setResult({ type: 'error', message: 'Title and message are required' });
      return;
    }
    try {
      setSending(true);
      setResult(null);
      const payload: BroadcastData = {
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
      };
      if (formData.targetRole) payload.targetRole = formData.targetRole;
      if (formData.targetTier) payload.targetTier = formData.targetTier;

      const res = await adminNotificationService.broadcast(payload);
      setResult({ type: 'success', message: `Sent to ${res.recipientCount} user(s)` });
      setFormData({ title: '', message: '', priority: 'medium', targetRole: '', targetTier: '' });
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to send' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'compose' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('compose')}
        >
          <ICONS.send size={14} className="mr-1" /> Compose
        </Button>
        <Button
          variant={tab === 'history' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTab('history')}
        >
          <ICONS.fileText size={14} className="mr-1" /> History
        </Button>
      </div>

      {tab === 'compose' ? (
        <Card>
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-6">Broadcast Notification</h3>

          {result && (
            <div className={`p-3 rounded-xl mb-4 text-sm font-bold ${
              result.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-rose-50 text-rose-700 border-2 border-rose-200'
            }`}>
              {result.message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Title</label>
              <Input
                placeholder="Notification title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Message</label>
              <textarea
                className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm font-bold text-slate-700 dark:text-slate-300 resize-none focus:outline-none focus:border-indigo-400"
                rows={4}
                placeholder="Write your announcement..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full text-sm font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-700 dark:text-slate-300"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Target Role (optional)</label>
                <select
                  value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                  className="w-full text-sm font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-700 dark:text-slate-300"
                >
                  <option value="">All Roles</option>
                  <option value="student">Students</option>
                  <option value="mentor">Mentors</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Target Tier (optional)</label>
                <select
                  value={formData.targetTier}
                  onChange={(e) => setFormData({ ...formData, targetTier: e.target.value })}
                  className="w-full text-sm font-bold rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-700 dark:text-slate-300"
                >
                  <option value="">All Tiers</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleSend} disabled={sending}>
                {sending ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card noPadding>
          <div className="p-6 border-b-2 border-slate-50">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Announcement History</h3>
          </div>
          <div className="divide-y-2 divide-slate-50">
            {historyLoading ? (
              <div className="p-6 text-center text-slate-400">Loading...</div>
            ) : announcements.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No announcements sent yet</div>
            ) : (
              announcements.map((a) => (
                <div key={a._id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">{a.title}</h4>
                        <Badge variant={
                          a.priority === 'urgent' ? 'rose' :
                          a.priority === 'high' ? 'amber' :
                          a.priority === 'medium' ? 'indigo' : 'slate'
                        }>
                          {a.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{a.message}</p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 uppercase tracking-widest font-black">
                        <span>{a.recipientCount} recipients</span>
                        <span>{a.readCount} read ({a.recipientCount > 0 ? Math.round((a.readCount / a.recipientCount) * 100) : 0}%)</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(a.sentAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {historyTotalPages > 1 && (
            <div className="p-4 border-t-2 border-slate-50 flex items-center justify-between">
              <p className="text-sm text-slate-500 font-bold">Page {historyPage} of {historyTotalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={historyPage === 1} onClick={() => setHistoryPage((p) => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={historyPage === historyTotalPages} onClick={() => setHistoryPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AdminNotifications;
