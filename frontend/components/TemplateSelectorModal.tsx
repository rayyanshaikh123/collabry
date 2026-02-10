'use client';

import React, { useState } from 'react';
import { boardTemplates, BoardTemplate } from '@/lib/boardTemplates';
import { Button } from './UIElements';
import { ICONS } from '../constants';

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: BoardTemplate) => void;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', name: 'All Templates', icon: '🎨' },
    { id: 'study', name: 'Study', icon: '📚' },
    { id: 'planning', name: 'Planning', icon: '📋' },
    { id: 'brainstorm', name: 'Brainstorm', icon: '💡' },
    { id: 'general', name: 'General', icon: '✨' },
  ];

  const filteredTemplates = selectedCategory === 'all'
    ? boardTemplates
    : boardTemplates.filter(t => t.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col border-2 border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-3xl">🎨</span>
                Choose a Template
              </h2>
              <p className="text-white/80 text-sm mt-1">
                Start with a pre-designed layout or create from scratch
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
            >
              <ICONS.X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-6 py-4">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-lg'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="group relative bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 hover:border-indigo-500 dark:hover:border-indigo-600 hover:shadow-xl transition-all duration-200 text-left"
              >
                {/* Template Icon/Preview */}
                <div className="w-full h-40 bg-gradient-to-br from-slate-50 dark:from-slate-700 to-slate-100 dark:to-slate-800 rounded-xl flex items-center justify-center mb-4 group-hover:from-indigo-50 dark:group-hover:from-indigo-900/30 group-hover:to-purple-50 dark:group-hover:to-purple-900/30 transition-all">
                  <span className="text-6xl">{template.icon}</span>
                </div>

                {/* Template Info */}
                <div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
                    {template.name}
                    {template.shapes.length === 0 && (
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        Empty
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {template.description}
                  </p>
                  
                  {/* Shape Count */}
                  {template.shapes.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                        </svg>
                        {template.shapes.length} elements
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 border-2 border-indigo-500 dark:border-indigo-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              💡 Tip: You can customize any template after creation
            </p>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectorModal;
