'use client';

import React from 'react';
import { Card, Button } from '../UIElements';
import { ICONS } from '../../constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SourcePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: {
    id: string;
    name: string;
    type: 'pdf' | 'text' | 'website' | 'notes';
    content: string;
  } | null;
  isLoading?: boolean;
}

const SourcePreviewModal: React.FC<SourcePreviewModalProps> = ({
  isOpen,
  onClose,
  source,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'text':
        return '📝';
      case 'website':
        return '🌐';
      case 'notes':
        return '📓';
      default:
        return '📁';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'PDF Document';
      case 'text':
        return 'Text File';
      case 'website':
        return 'Website';
      case 'notes':
        return 'Notes';
      default:
        return 'Source';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-2 border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{source ? getSourceIcon(source.type) : '📁'}</div>
            <div>
              <h2 className="text-xl font-black text-white">{source?.name || 'Source Preview'}</h2>
              <p className="text-sm text-indigo-100">
                {source ? getTypeLabel(source.type) : 'Loading...'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <ICONS.close className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-purple-600 dark:bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-pink-600 dark:bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Loading source content...</p>
            </div>
          ) : !source ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📂</div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No source selected</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none prose-slate dark:prose-invert prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800 prose-code:text-indigo-600 dark:prose-code:text-indigo-400">
              {source.type === 'website' || source.type === 'notes' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {source.content}
                </ReactMarkdown>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  {source.content}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SourcePreviewModal;
