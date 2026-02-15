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

interface BoardMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: string;
}

interface Board {
  _id: string;
  title: string;
  description?: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  members: BoardMember[];
  isPublic: boolean;
  isArchived?: boolean;
  elementCount?: number;
  memberCount?: number;
  thumbnail?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatingBoardId, setDuplicatingBoardId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Reset to full list when search is cleared
      fetchBoards();
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await studyBoardService.searchBoards(searchQuery.trim());
        setBoards(results as Board[]);
      } catch {
        // Fall back to client-side filter if search endpoint fails
        const response = await studyBoardService.getBoards();
        const filtered = (response as Board[]).filter((b: Board) =>
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setBoards(filtered);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchBoards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await studyBoardService.getBoards({ includeArchived: true });
      setBoards(response as Board[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load boards';
      setError(message);
      console.error('Error fetching boards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewBoard = async (template?: BoardTemplate) => {
    try {
      setIsCreating(true);
      const payload: Record<string, unknown> = {
        title: template ? `${template.name} - ${boards.length + 1}` : `New Board ${boards.length + 1}`,
        description: template ? template.description : 'Collaborative study board',
        isPublic: false,
      };

      if (template?.id) payload.template = template.id;

      const newBoard = await studyBoardService.createBoard(payload as Record<string, string | boolean>) as Board;
      
      // Store template shapes with fresh IDs in sessionStorage
      if (template && template.shapes.length > 0) {
        const shapesWithIds = getTemplateShapes(template);
        sessionStorage.setItem(`board-${newBoard._id}-template`, JSON.stringify(shapesWithIds));
      }
      
      // Navigate to the new board
      router.push(`/study-board/${newBoard._id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to create board: ' + message);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete board';
      alert(message);
      console.error('Error deleting board:', err);
    } finally {
      setDeletingBoardId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setBoardToDelete(null);
  };

  const handleDuplicate = async (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation();
    try {
      setDuplicatingBoardId(boardId);
      const newBoard = await studyBoardService.duplicateBoard(boardId);
      setBoards(prev => [newBoard as Board, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate board';
      showError(message);
    } finally {
      setDuplicatingBoardId(null);
    }
  };

  const handleArchive = async (e: React.MouseEvent, board: Board) => {
    e.stopPropagation();
    const newArchived = !board.isArchived;
    try {
      await studyBoardService.archiveBoard(board._id, newArchived);
      setBoards(prev =>
        prev.map(b =>
          b._id === board._id ? { ...b, isArchived: newArchived } : b
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : newArchived ? 'Failed to archive board' : 'Failed to unarchive board';
      showError(message);
    }
  };

  const filteredBoards = showArchived
    ? boards.filter(b => b.isArchived)
    : boards.filter(b => !b.isArchived);

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

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <ICONS.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>
        <Button
          variant={showArchived ? 'primary' : 'secondary'}
          className="gap-2 whitespace-nowrap"
          onClick={() => setShowArchived(!showArchived)}
        >
          <ICONS.FileText size={16} />
          {showArchived ? 'Archived' : 'Active'}
        </Button>
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
      {filteredBoards.length === 0 ? (
        <Card className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {searchQuery ? (
                <ICONS.Search size={32} className="text-indigo-600" />
              ) : (
                <ICONS.Plus size={32} className="text-indigo-600" />
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
              {searchQuery ? 'No boards found' : 'No boards yet'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {searchQuery
                ? `No boards match "${searchQuery}". Try a different search term.`
                : 'Create your first collaborative study board to start working with others'
              }
            </p>
            {!searchQuery && (
              <Button variant="primary" onClick={() => setShowTemplateModal(true)} disabled={isCreating}>
                <ICONS.Plus size={16} className="mr-2" />
                {isCreating ? 'Creating...' : 'Create Your First Board'}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoards.map((board) => (
            <Card 
              key={board._id}
              className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
              onClick={() => openBoard(board._id)}
            >
              {/* Thumbnail Preview */}
              {board.thumbnail ? (
                <div className="-mx-4 -mt-4 mb-4 h-36 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={board.thumbnail}
                    alt={board.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="-mx-4 -mt-4 mb-4 h-36 bg-linear-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                  <ICONS.FileText size={40} className="text-indigo-300 dark:text-slate-500" />
                </div>
              )}

              {/* Card Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 flex items-center justify-center shadow-lg border-b-2 border-indigo-700 dark:border-indigo-800 shrink-0">
                    <ICONS.StudyBoard size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-black text-slate-800 dark:text-slate-200 text-lg leading-tight truncate">
                    {board.title}
                  </h3>
                  <div className="flex flex-col gap-1.5 shrink-0 ml-auto">
                    {board.owner._id !== user?.id && (
                      <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 text-[10px] font-black uppercase tracking-wide rounded-lg">Shared</span>
                    )}
                    {board.isPublic && (
                      <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wide rounded-lg">Public</span>
                    )}
                  </div>
                </div>
                {board.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {board.description}
                  </p>
                )}
              </div>

              {/* Owner info for shared boards */}
              {board.owner._id !== user?.id && (
                <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                  <div className="w-6 h-6 rounded-full bg-linear-to-br from-indigo-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black">
                    {(board.owner.name?.[0] || board.owner.email?.[0] || '?').toUpperCase()}
                  </div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                    by {board.owner.name || board.owner.email}
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3">
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
              <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-slate-100 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <ICONS.Calendar size={12} />
                  {new Date(board.lastActivity || board.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-1">
                  {/* Duplicate */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDuplicate(e, board._id)}
                    disabled={duplicatingBoardId === board._id}
                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                    title="Duplicate board"
                  >
                    {duplicatingBoardId === board._id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500" />
                    ) : (
                      <ICONS.Copy size={15} />
                    )}
                  </Button>
                  {/* Archive */}
                  {board.owner._id === user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleArchive(e, board)}
                      className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                      title={board.isArchived ? 'Unarchive board' : 'Archive board'}
                    >
                      <ICONS.FileText size={15} />
                    </Button>
                  )}
                  {/* Delete */}
                  {board.owner._id === user?.id && (
                    <button 
                      onClick={(e) => handleDeleteClick(e, board)}
                      disabled={deletingBoardId === board._id}
                      className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all disabled:opacity-50"
                    >
                      {deletingBoardId === board._id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-500" />
                      ) : (
                        <ICONS.Trash size={15} />
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
            </Card>
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
            
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-100">&ldquo;{boardToDelete.title}&rdquo;</strong>?
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



