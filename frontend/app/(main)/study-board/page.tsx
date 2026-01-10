'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '../../../components/UIElements';
import { ICONS } from '../../../constants';
import { useAuthStore } from '../../../src/stores/auth.store';
import { studyBoardService } from '../../../src/services/studyBoard.service';
import TemplateSelectorModal from '../../../components/TemplateSelectorModal';
import { BoardTemplate, getTemplateShapes } from '../../../lib/boardTemplates';
import { showError } from '../../../src/lib/alert';

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
      const newBoard = await studyBoardService.createBoard({
        title: template ? `${template.name} - ${boards.length + 1}` : `New Board ${boards.length + 1}`,
        description: template ? template.description : 'Collaborative study board',
        isPublic: false,
        template: template?.id,
      });
      
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
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Study Boards</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Collaborate with others in real-time</p>
        </div>
        <Button 
          variant="primary" 
          className="gap-2"
          onClick={() => setShowTemplateModal(true)}
          disabled={isCreating}
        >
          <ICONS.Plus size={16} />
          {isCreating ? 'Creating...' : 'New Board'}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          <Button variant="secondary" size="small" onClick={fetchBoards} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Boards Grid */}
      {boards.length === 0 ? (
        <Card className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ICONS.Plus size={32} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">No boards yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Create your first collaborative study board to start working with others
            </p>
            <Button variant="primary" onClick={() => setShowTemplateModal(true)} disabled={isCreating}>
              <ICONS.Plus size={16} className="mr-2" />
              {isCreating ? 'Creating...' : 'Create Your First Board'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <Card 
              key={board._id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => openBoard(board._id)}
            >
              <div className="space-y-4">
                {/* Board Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">
                      {board.title}
                    </h3>
                    {board.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>
                  {board.isPublic && (
                    <Badge variant="indigo" className="ml-2">Public</Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <ICONS.Users size={16} />
                    <span>{board.memberCount || 1} member{(board.memberCount || 1) > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ICONS.FileText size={16} />
                    <span>{board.elementCount || 0} element{(board.elementCount || 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    Updated {new Date(board.lastActivity || board.createdAt).toLocaleDateString()}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      openBoard(board._id);
                    }}
                  >
                    Open →
                  </Button>
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
    </div>
  );
}

