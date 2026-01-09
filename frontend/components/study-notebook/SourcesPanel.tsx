'use client';

import React, { useState } from 'react';
import { Card, Button, Badge } from '../UIElements';
import { ICONS } from '../../constants';

export interface Source {
  id: string;
  type: 'pdf' | 'text' | 'website' | 'notes';
  name: string;
  size?: string;
  dateAdded: string;
  selected: boolean;
}

interface SourcesPanelProps {
  sources: Source[];
  onToggleSource: (id: string) => void;
  onAddSource: (type: Source['type']) => void;
  onRemoveSource: (id: string) => void;
}

const SourcesPanel: React.FC<SourcesPanelProps> = ({
  sources,
  onToggleSource,
  onAddSource,
  onRemoveSource,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sourceTypeIcon = (type: Source['type']) => {
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
        return '📄';
    }
  };

  const sourceTypeColor = (type: Source['type']) => {
    switch (type) {
      case 'pdf':
        return 'red';
      case 'text':
        return 'blue';
      case 'website':
        return 'indigo';
      case 'notes':
        return 'emerald';
      default:
        return 'gray';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">Sources</h2>
          <Badge variant="slate" className="text-xs">
            {sources.filter(s => s.selected).length}/{sources.length}
          </Badge>
        </div>
        
        {/* Add Source Button */}
        <div className="relative">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="w-full flex items-center justify-center gap-2"
          >
            <ICONS.plus className="w-4 h-4" />
            Add Source
          </Button>

          {/* Add Source Menu */}
          {showAddMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
              <button
                onClick={() => {
                  onAddSource('pdf');
                  setShowAddMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-700"
              >
                <span className="text-xl">📄</span>
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">PDF Document</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Upload a PDF file</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onAddSource('text');
                  setShowAddMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-700"
              >
                <span className="text-xl">📝</span>
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Text</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Paste or type text</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onAddSource('website');
                  setShowAddMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-700"
              >
                <span className="text-xl">🌐</span>
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Website</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Add a URL (or ask AI to scrape)</div>
                </div>
              </button>
              <button
                onClick={() => {
                  onAddSource('notes');
                  setShowAddMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors"
              >
                <span className="text-xl">📓</span>
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">Notes</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Create notes</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sources.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-1">No sources yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Click "Add Source" to get started</p>
          </div>
        ) : (
          sources.map((source) => (
            <div key={source.id} onClick={() => onToggleSource(source.id)}>
              <Card
                className={`p-3 cursor-pointer transition-all ${
                  source.selected
                    ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-md'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        source.selected
                          ? 'bg-indigo-600 dark:bg-indigo-700 border-indigo-600 dark:border-indigo-700'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {source.selected && (
                        <ICONS.check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">{sourceTypeIcon(source.type)}</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                          {source.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveSource(source.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all flex-shrink-0"
                        title="Delete source"
                      >
                        <ICONS.trash className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={sourceTypeColor(source.type) as any} className="text-xs">
                        {source.type.toUpperCase()}
                      </Badge>
                      {source.size && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">{source.size}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{source.dateAdded}</div>
                  </div>
                </div>
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      {sources.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {sources.filter(s => s.selected).length > 0
              ? `${sources.filter(s => s.selected).length} source(s) selected`
              : 'Select sources to use in chat'}
          </p>
        </div>
      )}
    </div>
  );
};

export default SourcesPanel;
