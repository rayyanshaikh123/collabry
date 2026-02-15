'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '../../../components/UIElements';
import { ICONS } from '../../../constants';
import { useAuthStore } from '@/lib/stores/auth.store';
import { studyBoardService } from '@/lib/services/studyBoard.service';
import TemplateSelectorModal from '../../../components/TemplateSelectorModal';
import { BoardTemplate, getTemplateShapes } from '../../../lib/boardTemplates';
import { showError } from '@/lib/alert';

interface Board {
  _id: string;
  title: string;
  description?: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  members: any[];
  isPublic: boolean;
  elementCount?: number;
  memberCount?: number;
  lastActivity: string;
  createdAt: string;
}

export default function StudyBoardListPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await studyBoardService.getBoards();
      setBoards(response as any);
    } catch (err: any) {
      setError(err.message || 'Failed to load boards');
      console.error('Error fetching boards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewBoard = async (template?: BoardTemplate) => {
    try {
      setIsCreating(true);
      const payload: any = {
        title: template ? `${template.name} - ${boards.length + 1}` : `New Board ${boards.length + 1}`,
        description: template ? template.description : 'Collaborative study board',
        isPublic: false,
      };

      if (template?.id) payload.template = template.id;

      const newBoard = await studyBoardService.createBoard(payload as any);
      
      // Store template shapes with fresh IDs in sessionStorage
      if (template && template.shapes.length > 0) {
        const shapesWithIds = getTemplateShapes(template);
        sessionStorage.setItem(`board-${(newBoard as any)._id}-template`, JSON.stringify(shapesWithIds));
      }
      
      // Navigate to the new board
      router.push(`/study-board/${(newBoard as any)._id}`);
    } catch (err: any) {
      showError('Failed to create board: ' + err.message);
      console.error('Error creating board:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateSelect = (template: BoardTemplate) => {
    setShowTemplateModal(false);
    createNewBoard(template);
  };

  const openBoard = (boardId: string) => {
    router.push(`/study-board/${boardId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    setBoardToDelete(board);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!boardToDelete) return;
    
    try {
      setDeletingBoardId(boardToDelete._id);
      await studyBoardService.deleteBoard(boardToDelete._id);
      setBoards(boards.filter(b => b._id !== boardToDelete._id));
      setShowDeleteConfirm(false);
      setBoardToDelete(null);
    } catch (err: any) {
      alert('Failed to delete board: ' + err.message);
      console.error('Error deleting board:', err);
    } finally {
      setDeletingBoardId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setBoardToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 flex items-center justify-center shadow-xl border-b-4 border-indigo-700 dark:border-indigo-800">
              <ICONS.StudyBoard size={24} className="text-white" strokeWidth={2.5} />
            </div>
            Study Boards
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm ml-16 mt-1">Collaborate with others in real-time</p>
        </div>
        <button
          onClick={() => setShowTemplateModal(true)}
          disabled={isCreating}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 border-b-4 border-indigo-700 dark:border-indigo-800 transition-all bouncy-hover press-effect disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ICONS.Plus size={18} strokeWidth={3} />
          {isCreating ? 'Creating...' : 'New Board'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/30 border-2 border-rose-200 dark:border-rose-800 rounded-[1.5rem] p-6 flex items-start gap-4 shadow-lg shadow-rose-100 dark:shadow-rose-950/30">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shrink-0">
            <ICONS.AlertCircle size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <h4 className="font-black text-rose-700 dark:text-rose-400 mb-1">Error Loading Boards</h4>
            <p className="text-rose-600 dark:text-rose-400 text-sm">{error}</p>
            <button
              onClick={fetchBoards}
              className="mt-3 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-all text-sm border-b-2 border-rose-700 active:translate-y-0.5 active:border-b-0"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Boards Grid */}
      {boards.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border-2 border-slate-200 dark:border-slate-800 p-12 text-center shadow-lg">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl border-b-4 border-indigo-300 dark:border-indigo-800">
              <ICONS.StudyBoard size={48} className="text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-3">No boards yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Create your first collaborative study board to start working with others in real-time
            </p>
            <button
              onClick={() => setShowTemplateModal(true)}
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 border-b-4 border-indigo-700 dark:border-indigo-800 transition-all bouncy-hover press-effect disabled:opacity-50"
            >
              <ICONS.Plus size={18} strokeWidth={3} />
              {isCreating ? 'Creating...' : 'Create Your First Board'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <div
              key={board._id}
              className="group relative bg-white dark:bg-slate-900 rounded-[1.5rem] border-2 border-slate-200 dark:border-slate-800 p-6 cursor-pointer transition-all bouncy-hover press-effect shadow-lg shadow-slate-100 dark:shadow-slate-950/50 hover:shadow-xl hover:shadow-indigo-100 dark:hover:shadow-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-700"
              onClick={() => openBoard(board._id)}
            >
              <div className="space-y-4">
                {/* Board Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 flex items-center justify-center shadow-lg border-b-2 border-indigo-700 dark:border-indigo-800 shrink-0">
                        <ICONS.StudyBoard size={20} className="text-white" strokeWidth={2.5} />
                      </div>
                      <h3 className="font-black text-slate-800 dark:text-slate-200 text-lg leading-tight truncate">
                        {board.title}
                      </h3>
                    </div>
                    {board.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {board.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {board.owner._id !== user?.id && (
                      <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-[10px] font-black uppercase tracking-wide rounded-lg">Shared</span>
                    )}
                    {board.isPublic && (
                      <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wide rounded-lg">Public</span>
                    )}
                  </div>
                </div>

                {/* Owner info for shared boards */}
                {board.owner._id !== user?.id && (
                  <div className="flex items-center gap-2 -mt-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black">
                      {(board.owner.name?.[0] || board.owner.email?.[0] || '?').toUpperCase()}
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                      by {board.owner.name || board.owner.email}
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <ICONS.Users size={16} className="text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{board.memberCount || 1}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <ICONS.FileText size={16} className="text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{board.elementCount || 0}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t-2 border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <ICONS.Calendar size={12} />
                    {new Date(board.lastActivity || board.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2">
                    {board.owner._id === user?.id && (
                      <button 
                        onClick={(e) => handleDeleteClick(e, board)}
                        disabled={deletingBoardId === board._id}
                        className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all disabled:opacity-50"
                      >
                        {deletingBoardId === board._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-500" />
                        ) : (
                          <ICONS.Trash size={16} strokeWidth={2.5} />
                        )}
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openBoard(board._id);
                      }}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 border-b-2 border-indigo-700 active:translate-y-0.5 active:border-b-0"
                    >
                      Open
                      <ICONS.ChevronRight size={12} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Selector Modal */}
      <TemplateSelectorModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleTemplateSelect}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && boardToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl max-w-md w-full p-8 space-y-6 border-2 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-800/30 rounded-2xl flex items-center justify-center border-b-4 border-rose-300 dark:border-rose-800 shadow-lg">
                <ICONS.Trash size={28} className="text-rose-600 dark:text-rose-400" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200">Delete Board?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-5 border-2 border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900 dark:text-slate-100 font-black">"{boardToDelete.title}"</strong>?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                All board data, elements, and member access will be permanently removed.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={cancelDelete}
                disabled={!!deletingBoardId}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-black rounded-xl transition-all border-2 border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={!!deletingBoardId}
                className="flex-1 px-4 py-3 bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black rounded-xl shadow-lg shadow-rose-200 dark:shadow-rose-900/50 border-b-4 border-rose-700 dark:border-rose-800 transition-all press-effect disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingBoardId ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Deleting...
                  </span>
                ) : (
                  'Delete Board'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



