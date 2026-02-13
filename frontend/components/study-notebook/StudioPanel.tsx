'use client';

import React, { useState } from 'react';
import { Card, Button, Badge } from '../UIElements';
import { ICONS } from '../../constants';

export type ArtifactType = 
  | 'flashcards' 
  | 'quiz' 
  | 'mindmap'
  | 'reports'
  | 'infographic'
  | 'course-finder';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  createdAt: string;
  data?: any; // TODO: Define specific types for each artifact
}

interface StudioPanelProps {
  artifacts: Artifact[];
  onGenerateArtifact: (type: ArtifactType) => void;
  onSelectArtifact: (id: string) => void;
  onDeleteArtifact?: (id: string) => void;
  onEditArtifact?: (id: string) => void;
  selectedArtifact: Artifact | null;
  isGenerating?: boolean;
  generatingType?: ArtifactType | null;
  hasSelectedSources: boolean;
}

const StudioPanel: React.FC<StudioPanelProps> = ({
  artifacts,
  onGenerateArtifact,
  onSelectArtifact,
  onDeleteArtifact,
  onEditArtifact,
  selectedArtifact,
  isGenerating = false,
  generatingType = null,
  hasSelectedSources,
}) => {
  const [showArtifacts, setShowArtifacts] = useState(false);

  const studioActions = [
    {
      type: 'course-finder' as ArtifactType,
      icon: '🎓',
      label: 'Course Finder',
      color: 'indigo',
      available: true,
    },
    {
      type: 'flashcards' as ArtifactType,
      icon: '🎴',
      label: 'Flashcards',
      color: 'blue',
      available: true,
    },
    {
      type: 'quiz' as ArtifactType,
      icon: '📝',
      label: 'Quiz',
      color: 'indigo',
      available: true,
    },
    {
      type: 'mindmap' as ArtifactType,
      icon: '🧠',
      label: 'Mind Map',
      color: 'emerald',
      available: true,
    },
    {
      type: 'reports' as ArtifactType,
      icon: '📊',
      label: 'Reports',
      color: 'orange',
      available: true,
    },
    {
      type: 'infographic' as ArtifactType,
      icon: '📈',
      label: 'Infographic',
      color: 'cyan',
      available: true,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">Studio</h2>
            {artifacts.length > 0 && (
              <Badge variant="indigo" className="text-xs">
                {artifacts.length}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {hasSelectedSources
            ? 'Generate artifacts or ask AI in chat for summaries, key points, etc.'
            : 'Add sources to generate content'}
        </p>
        {/* Compact artifact strip when collapsed - shows edit icons and tooltip */}
        {artifacts.length > 0 && !showArtifacts && (
          <div className="mt-3 px-1">
            <div className="flex items-center gap-2 overflow-x-auto">
              {artifacts.slice(0, 8).map((a, idx) => {
                const action = studioActions.find((s) => s.type === a.type);
                return (
                  <div key={`${a.id}-${idx}`} className="relative">
                    <button
                      title={a.title}
                      onClick={() => onSelectArtifact(a.id)}
                      className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm shadow-sm"
                    >
                      <span className="text-lg">{action?.icon}</span>
                    </button>
                    {/* compact strip edit removed for cleaner UI */}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-2">
          {studioActions.map((action) => {
            const isThisGenerating = generatingType === action.type;
            return (
              <div key={action.type} className="relative">
                <div className="h-28">
                  <Button
                    variant={action.available ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={() => action.available && onGenerateArtifact(action.type)}
                    disabled={!hasSelectedSources || isGenerating || !action.available}
                    className={`w-full h-full px-0 py-0 flex flex-col items-center justify-center gap-2 text-center ${
                      action.available ? 'hover:border-indigo-500 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30' : 'opacity-50'
                    }`}
                  >
                    {isThisGenerating ? (
                      <>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs font-bold leading-tight text-slate-500 dark:text-slate-400">Generating...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl leading-none">{action.icon}</span>
                        <span className="text-sm font-bold leading-tight max-w-full break-words">{action.label}</span>
                        {!action.available && (
                          <Badge variant="slate" className="text-[10px] mt-1">
                            Coming Soon
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                </div>

                {/* Small edit button for generator presets (Quiz) - render as a sibling to avoid nested <button> */}
                {/* per-action small edit removed; use the top Edit control instead */}
              </div>
            );
          })}
        </div>
      </div>

      {/* Generated Artifacts */}
      <div className="flex-1 overflow-y-auto p-4">
        {artifacts.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
                Studio output will be saved here
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-700 dark:text-slate-300">Generated Content</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowArtifacts(!showArtifacts)}
                className="text-xs"
              >
                {showArtifacts ? 'Hide' : 'Show'} ({artifacts.length})
              </Button>
            </div>

            {showArtifacts && (
              <div className="space-y-2">
                {artifacts.map((artifact, idx) => {
                  const action = studioActions.find((a) => a.type === artifact.type);
                  return (
                    <div key={`${artifact.id}-${idx}`} className="relative">
                      <Card
                        onClick={() => onSelectArtifact(artifact.id)}
                        className={`p-3 cursor-pointer transition-all relative ${
                          selectedArtifact?.id === artifact.id
                            ? 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                              {artifact.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={action?.color as any} className="text-xs">
                                {action?.label}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              {new Date(artifact.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>

                          {/* Controls - absolutely positioned so they're always visible */}
                          <div className="absolute right-3 top-3 flex gap-2">
                            {typeof onDeleteArtifact === 'function' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteArtifact(artifact.id);
                                }}
                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 p-1 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                                aria-label="Delete artifact"
                                title="Delete artifact"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}

                            
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generation Status */}
      {isGenerating && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <ICONS.refresh className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Generating...</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">This may take a moment</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioPanel;
