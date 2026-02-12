import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from '../UIElements';
import { ICONS } from '../../constants';
import { adminBoardService, type BoardAnalytics } from '@/lib/services/adminBoard.service';

interface BoardAnalyticsModalProps {
  boardId: string;
  onClose: () => void;
}

const BoardAnalyticsModal: React.FC<BoardAnalyticsModalProps> = ({ boardId, onClose }) => {
  const [analytics, setAnalytics] = useState<BoardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await adminBoardService.getBoardAnalytics(boardId);
        setAnalytics(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [boardId]);

  // Color palette for element types
  const typeColors = [
    'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-sky-500', 'bg-violet-500', 'bg-orange-500', 'bg-teal-500',
  ];

  const elementTypes = analytics?.stats?.elementsByType
    ? Object.entries(analytics.stats.elementsByType).sort(([, a], [, b]) => b - a)
    : [];

  const maxCount = elementTypes.length > 0 ? elementTypes[0][1] : 1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800 p-6 flex items-center justify-between z-10">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200">Board Analytics</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ICONS.close size={20} />
          </Button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-400 py-20">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4" />
            Loading analytics...
          </div>
        ) : !analytics ? (
          <div className="p-6 text-center text-slate-400 py-20">
            Failed to load analytics
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Board Info */}
            <div>
              <h4 className="text-xl font-black text-slate-800 dark:text-slate-200">
                {analytics.board.title}
              </h4>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={analytics.board.isPublic ? 'emerald' : 'slate'}>
                  {analytics.board.isPublic ? 'Public' : 'Private'}
                </Badge>
                <Badge variant={analytics.board.isArchived ? 'rose' : 'emerald'}>
                  {analytics.board.isArchived ? 'Archived' : 'Active'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Created {new Date(analytics.board.createdAt).toLocaleDateString()} • 
                Last active {new Date(analytics.board.lastActivity).toLocaleDateString()}
              </p>
            </div>

            {/* Owner */}
            <Card className="bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Owner</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                  {analytics.board.owner?.name?.[0] || '?'}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {analytics.board.owner?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-400">{analytics.board.owner?.email || ''}</p>
                </div>
              </div>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-indigo-50 dark:bg-indigo-950/30 text-center">
                <p className="text-3xl font-black text-indigo-600">{analytics.stats.totalElements}</p>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Elements</p>
              </Card>
              <Card className="bg-emerald-50 dark:bg-emerald-950/30 text-center">
                <p className="text-3xl font-black text-emerald-600">{analytics.stats.totalMembers}</p>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Members</p>
              </Card>
            </div>

            {/* Elements by Type — horizontal bar chart */}
            <Card>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Elements by Type</p>
              {elementTypes.length === 0 ? (
                <p className="text-sm text-slate-400">No elements yet</p>
              ) : (
                <div className="space-y-3">
                  {elementTypes.map(([type, count], i) => (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 capitalize">
                          {type.replace(/-/g, ' ')}
                        </span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${typeColors[i % typeColors.length]}`}
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Collaborators */}
            <Card>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Collaborators</p>
              {analytics.stats.collaborators.length === 0 ? (
                <p className="text-sm text-slate-400">No collaborators — solo board</p>
              ) : (
                <div className="space-y-3">
                  {analytics.stats.collaborators.map((collab: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white font-black text-xs">
                          {collab.user?.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {collab.user?.name || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-slate-400">{collab.user?.email || ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={collab.role === 'editor' ? 'indigo' : 'slate'} className="capitalize text-[10px]">
                          {collab.role}
                        </Badge>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Joined {new Date(collab.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default BoardAnalyticsModal;
