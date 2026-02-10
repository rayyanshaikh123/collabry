'use client';

import React from 'react';

const DEFAULT_QUIZ_PROMPT = 'Create a practice quiz with exactly 5 multiple choice questions about:';

interface QuizEditModalProps {
  isOpen: boolean;
  editingArtifactId: string | null;
  editPrompt: string;
  editNumber: number;
  editDifficulty: string;
  setEditPrompt: (value: string) => void;
  setEditNumber: (value: number) => void;
  setEditDifficulty: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function QuizEditModal({
  isOpen,
  editingArtifactId,
  editPrompt,
  editNumber,
  editDifficulty,
  setEditPrompt,
  setEditNumber,
  setEditDifficulty,
  onSave,
  onClose,
}: QuizEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="w-11/12 max-w-xl bg-white dark:bg-slate-900 rounded-lg p-4 shadow-xl border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-200">Edit Quiz Prompt & Settings</h3>
        <label className="text-xs text-slate-600 dark:text-slate-400">Prompt</label>
        <textarea
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded p-2 mt-1 mb-3 h-28 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
          readOnly={editingArtifactId === 'action-quiz'}
        />

        {editingArtifactId === 'action-quiz' && (
          <div className="mb-3">
            <label className="text-xs text-slate-600 dark:text-slate-400">Preview</label>
            <pre className="whitespace-pre-wrap text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 mt-1 h-32 overflow-auto text-slate-900 dark:text-slate-200">
              {`${(editPrompt && editPrompt.trim().length > 0 ? editPrompt : DEFAULT_QUIZ_PROMPT)}\n\nRequested number of questions: ${editNumber}\nDifficulty: ${editDifficulty}`}
            </pre>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="text-xs text-slate-600 dark:text-slate-400">Number of Questions</label>
            <input 
              type="number" 
              min={1} 
              max={50} 
              value={editNumber} 
              onChange={(e) => setEditNumber(Number(e.target.value))} 
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600" 
            />
          </div>
          <div className="w-40">
            <label className="text-xs text-slate-600 dark:text-slate-400">Difficulty</label>
            <select 
              value={editDifficulty} 
              onChange={(e) => setEditDifficulty(e.target.value)} 
              className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onSave} 
            className="px-3 py-1 bg-indigo-600 dark:bg-indigo-700 text-white rounded hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
