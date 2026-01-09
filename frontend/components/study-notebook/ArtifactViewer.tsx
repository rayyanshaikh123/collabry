'use client';

import React from 'react';
import { Button, Card, Badge } from '../UIElements';
import { ICONS } from '../../constants';
import { Artifact } from './StudioPanel';

interface ArtifactViewerProps {
  artifact: Artifact;
  onClose: () => void;
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact, onClose }) => {
  const renderContent = () => {
    // TODO: Implement specific renderers for each artifact type
    switch (artifact.type) {
      case 'flashcards':
        return (
          <div className="space-y-4">
            <div className="text-center text-6xl mb-4">🎴</div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 text-center">Flashcards</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Flashcard viewer coming soon...
            </p>
            {/* TODO: Implement flashcard flip interface */}
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-4">
            <div className="text-center text-6xl mb-4">📝</div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 text-center">Quiz</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Quiz interface coming soon...
            </p>
            {/* TODO: Implement quiz interface with questions and answers */}
          </div>
        );

      case 'mindmap':
        return (
          <div className="space-y-4">
            <div className="text-center text-6xl mb-4">🧠</div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 text-center">Mind Map</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Mind map visualization coming soon...
            </p>
            {/* TODO: Implement mind map visualization (use React Flow or similar) */}
          </div>
        );

      case 'audio-overview':
        return (
          <div className="space-y-4">
            <div className="text-center text-6xl mb-4">🎧</div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 text-center">Audio Overview</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Audio player coming soon...
            </p>
            {/* TODO: Implement audio player */}
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="text-center text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 text-center">
              {artifact.type}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Viewer coming soon...
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <Badge variant="indigo" className="text-sm">
              {artifact.type.replace('-', ' ').toUpperCase()}
            </Badge>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">{artifact.title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ICONS.close className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Created {new Date(artifact.createdAt).toLocaleString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <ICONS.download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <ICONS.share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ArtifactViewer;
