'use client';

import React, { useEffect, useState } from 'react';
import { Button, Card } from '../UIElements';
import { ICONS } from '../../constants';
import { studyBoardService } from '@/lib/services/studyBoard.service';

type BoardListItem = {
  _id: string;
  title: string;
  description?: string;
  lastActivity?: string;
  createdAt?: string;
};

interface BoardPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBoard: (boardId: string) => void;
  title?: string;
}

export default function BoardPickerModal({
  isOpen,
  onClose,
  onSelectBoard,
  title,
}: BoardPickerModalProps) {
  const [boards, setBoards] = useState<BoardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoading(true);
    setError(null);

    studyBoardService
      .getBoards()
      .then((data: any) => {
        if (!mounted) return;
        setBoards(Array.isArray(data) ? data : []);
      })
      .catch((err: any) => {
        if (!mounted) return;
        setError(err?.message || 'Failed to load boards');
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-2 border-slate-200 dark:border-slate-800">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">{title || 'Choose a Study Board'}</h2>
              <p className="text-white/80 text-sm mt-1">Select an existing board to add this content</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
              aria-label="Close"
            >
              <ICONS.X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2">
                <ICONS.AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-sm font-semibold text-red-800 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 dark:border-indigo-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">Loading boards…</p>
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">🧩</div>
              <p className="text-slate-700 dark:text-slate-300 font-bold">No boards found</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Create a board first, then try again.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {boards.map((b) => (
                <button
                  key={b._id}
                  onClick={() => onSelectBoard(b._id)}
                  className="w-full text-left bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-indigo-500 dark:hover:border-indigo-600 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black text-slate-800 dark:text-slate-200">{b.title}</div>
                      {b.description ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{b.description}</div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-xs text-slate-400 dark:text-slate-500 font-bold">
                      Open →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
