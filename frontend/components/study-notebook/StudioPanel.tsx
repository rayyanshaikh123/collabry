'use client';

import React, { useState } from 'react';
import { Card, Button, Badge } from '../UIElements';
import { ICONS } from '../../constants';

export type ArtifactType = 
  | 'flashcards' 
  | 'quiz' 
  | 'mindmap' 
  | 'audio-overview'
  | 'video-overview'
  | 'reports'
  | 'infographic'
  | 'slide-deck'
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
  hasSelectedSources,
}) => {
  const [showArtifacts, setShowArtifacts] = useState(false);

  const studioActions = [
    {
      type: 'audio-overview' as ArtifactType,
      icon: '🎧',
      label: 'Audio Overview',
      color: 'purple',
      available: true,
    },
    {
      type: 'video-overview' as ArtifactType,
      icon: '🎥',
      label: 'Video Overview',
      color: 'pink',
      available: false, // Future
    },
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
      available: false, // Future
    },
    {
      type: 'infographic' as ArtifactType,
      icon: '📈',
      label: 'Infographic',
      color: 'cyan',
      available: false, // Future
    },
    {
      type: 'slide-deck' as ArtifactType,
      icon: '🎞️',
      label: 'Slide Deck',
      color: 'teal',
      available: false, // Future
    },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 border-l border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-slate-800">Studio</h2>
          {artifacts.length > 0 && (
            <Badge variant="indigo" className="text-xs">
              {artifacts.length}
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500">
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
                      className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm shadow-sm"
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
      <div className="p-4 space-y-2 border-b border-slate-200 bg-white">
        <div className="grid grid-cols-2 gap-2">
          {studioActions.map((action) => (
            <div key={action.type} className="relative">
              <Button
                variant={action.available ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => action.available && onGenerateArtifact(action.type)}
                disabled={!hasSelectedSources || isGenerating || !action.available}
                className={`flex flex-col items-center justify-center h-20 gap-1 ${
                  action.available ? 'hover:border-indigo-500 hover:bg-indigo-50' : 'opacity-50'
                }`}
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-xs font-bold">{action.label}</span>
                {!action.available && (
                  <Badge variant="slate" className="text-[10px] mt-1">
                    Coming Soon
                  </Badge>
                )}
              </Button>

              {/* Small edit button for generator presets (Quiz) - render as a sibling to avoid nested <button> */}
              {action.type === 'quiz' && typeof onEditArtifact === 'function' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditArtifact('action-quiz');
                  }}
                  title="Edit Quiz settings"
                  className="absolute right-2 top-2 p-1 bg-white border border-slate-100 rounded text-slate-600 hover:text-slate-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.414 2.586a2 2 0 010 2.828l-9.9 9.9a1 1 0 01-.465.263l-4 1a1 1 0 01-1.213-1.213l1-4a1 1 0 01.263-.465l9.9-9.9a2 2 0 012.828 0zM15.121 4.05l-9.9 9.9L4 15l.05-1.221 9.9-9.9 1.171 1.171z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Generated Artifacts */}
      <div className="flex-1 overflow-y-auto p-4">
        {artifacts.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-xs">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-sm font-black text-slate-800 mb-2">
                Studio output will be saved here
              </h3>
              <p className="text-xs text-slate-500">
                After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-slate-700">Generated Content</h3>
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
                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-slate-800 truncate">
                              {artifact.title}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={action?.color as any} className="text-xs">
                                {action?.label}
                              </Badge>
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
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
                                  if (confirm('Delete this artifact?')) {
                                    onDeleteArtifact(artifact.id);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700 p-1 rounded bg-white border border-slate-100"
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
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <ICONS.refresh className="w-5 h-5 animate-spin text-indigo-600" />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Generating...</p>
              <p className="text-xs text-slate-500">This may take a moment</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudioPanel;
