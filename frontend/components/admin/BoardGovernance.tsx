import React from 'react';
import { Card, Button, Badge, Input } from '../UIElements';
import { ICONS } from '../../constants';
import type { AdminBoard, BoardStats } from '@/lib/services/adminBoard.service';

interface BoardGovernanceProps {
  boards: AdminBoard[];
  boardStats: BoardStats | null;
  boardsLoading: boolean;
  boardSearchTerm: string;
  setBoardSearchTerm: (term: string) => void;
  boardPage: number;
  boardTotalPages: number;
  setBoardPage: (page: number | ((p: number) => number)) => void;
  handleSuspendBoard: (board: AdminBoard) => void;
  handleForceDeleteBoard: (board: AdminBoard) => void;
  handleViewAnalytics?: (board: AdminBoard) => void;
}

const BoardGovernance: React.FC<BoardGovernanceProps> = ({
  boards,
  boardStats,
  boardsLoading,
  boardSearchTerm,
  setBoardSearchTerm,
  boardPage,
  boardTotalPages,
  setBoardPage,
  handleSuspendBoard,
  handleForceDeleteBoard,
  handleViewAnalytics,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Board Statistics */}
      {boardStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-indigo-50 border-indigo-100">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Total Boards</p>
            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{boardStats.total}</h4>
          </Card>
          <Card className="bg-emerald-50 border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Public</p>
            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{boardStats.public}</h4>
          </Card>
          <Card className="bg-amber-50 border-amber-100">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Private</p>
            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{boardStats.private}</h4>
          </Card>
          <Card className="bg-rose-50 border-rose-100">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Archived</p>
            <h4 className="text-3xl font-black text-slate-800 dark:text-slate-200">{boardStats.archived}</h4>
          </Card>
        </div>
      )}

      {/* Boards Table */}
      <Card noPadding>
        <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Board Management</h3>
          <Input 
            placeholder="Search boards..." 
            className="w-64" 
            value={boardSearchTerm}
            onChange={(e) => setBoardSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black dark:text-slate-200 text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Board</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50 font-bold">
              {boardsLoading && boards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading boards...
                  </td>
                </tr>
              ) : boards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No boards found
                  </td>
                </tr>
              ) : (
                boards.map((board) => (
                  <tr key={board._id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="leading-tight">
                        <p className="text-sm text-slate-800 dark:text-slate-200 font-bold">{board.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tight">
                          {board.elements?.length || 0} elements • {board.members?.length || 0} members
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {board.owner.avatar ? (
                          <img src={board.owner.avatar} className="w-8 h-8 rounded-lg object-cover" alt={board.owner.name} />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-black text-xs">
                            {board.owner.name[0]}
                          </div>
                        )}
                        <div className="leading-tight">
                          <p className="text-xs text-slate-700">{board.owner.name}</p>
                          <p className="text-[10px] text-slate-400">{board.owner.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={board.isPublic ? 'emerald' : 'slate'}>
                        {board.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={board.isArchived ? 'rose' : 'emerald'}>
                        {board.isArchived ? 'Archived' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(board.lastActivity).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {handleViewAnalytics && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleViewAnalytics(board)}
                            title="View analytics"
                            className="text-indigo-500 hover:text-indigo-600"
                          >
                            <ICONS.Search size={16} />
                          </Button>
                        )}
                        {!board.isArchived && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleSuspendBoard(board)}
                            title="Suspend board"
                            className="text-amber-500 hover:text-amber-600"
                          >
                            <ICONS.Admin size={18} />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleForceDeleteBoard(board)}
                          title="Delete board permanently"
                          className="text-rose-500 hover:text-rose-600"
                        >
                          <ICONS.Trash size={18} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {boardTotalPages > 1 && (
          <div className="p-6 border-t-2 border-slate-50 flex items-center justify-between">
            <p className="text-sm text-slate-500 font-bold">
              Page {boardPage} of {boardTotalPages}
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={boardPage === 1}
                onClick={() => setBoardPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={boardPage === boardTotalPages}
                onClick={() => setBoardPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BoardGovernance;
