'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './UIElements';
import { ICONS } from '../constants';

interface BoardSettingsModalProps {
  board: {
    _id: string;
    title: string;
    description?: string;
    isPublic: boolean;
    settings?: {
      allowComments?: boolean;
      allowExport?: boolean;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updates: any) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
  board,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description || '');
  const [isPublic, setIsPublic] = useState(board.isPublic);
  const [allowComments, setAllowComments] = useState(board.settings?.allowComments ?? true);
  const [allowExport, setAllowExport] = useState(board.settings?.allowExport ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(board.title);
      setDescription(board.description || '');
      setIsPublic(board.isPublic);
      setAllowComments(board.settings?.allowComments ?? true);
      setAllowExport(board.settings?.allowExport ?? true);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, board]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Board title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (onSave) {
        await onSave({
          title: title.trim(),
          description: description.trim(),
          isPublic,
          settings: {
            allowComments,
            allowExport
          }
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      if (onDelete) {
        await onDelete();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete board');
      setIsLoading(false);
    }
  };

  return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border-2 border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">Board Settings</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <ICONS.X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
              <ICONS.AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-800 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ICONS.FileText className="w-5 h-5" />
              Basic Information
            </h3>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Board Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Study Board"
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:outline-none transition-colors"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this board about?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-600 focus:outline-none transition-colors resize-none"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ICONS.Lock className="w-5 h-5" />
              Privacy
            </h3>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border-2 border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">Public Board</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Anyone with the link can access this board
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="sr-only peer"
                    disabled={isLoading}
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Board Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ICONS.Settings className="w-5 h-5" />
              Features
            </h3>

            <div className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border-2 border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">Comments</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Allow members to add comments
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowComments}
                      onChange={(e) => setAllowComments(e.target.checked)}
                      className="sr-only peer"
                      disabled={isLoading}
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border-2 border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">Export</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Allow members to export board content
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowExport}
                      onChange={(e) => setAllowExport(e.target.checked)}
                      className="sr-only peer"
                      disabled={isLoading}
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <ICONS.AlertCircle className="w-5 h-5" />
              Danger Zone
            </h3>

            {showDeleteConfirm ? (
              <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-3">
                  Are you sure? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Deleting...' : 'Yes, Delete Board'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                className="w-full"
              >
                <ICONS.Trash className="w-4 h-4 mr-2" />
                Delete Board
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-6 bg-slate-50 dark:bg-slate-800 flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !title.trim()}
            className="flex-1"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BoardSettingsModal;
