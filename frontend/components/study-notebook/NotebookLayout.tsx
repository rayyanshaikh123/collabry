'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import SourcesPanel, { Source } from './SourcesPanel';
import ChatPanel, { ChatMessage } from './ChatPanel';
import StudioPanel, { Artifact, ArtifactType } from './StudioPanel';
import ArtifactViewer from './ArtifactViewer';
import { ICONS } from '../../constants';

interface NotebookLayoutProps {
  // Sources
  sources: Source[];
  onToggleSource: (id: string) => void;
  onAddSource: (type: Source['type']) => void;
  onRemoveSource: (id: string) => void;

  // Chat
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  onRegenerateResponse: () => void;
  isChatLoading?: boolean;
  onSaveQuizToStudio?: (questions: any[]) => void;
  onSaveMindMapToStudio?: (mindmap: any) => void;

  // Studio
  artifacts: Artifact[];
  onGenerateArtifact: (type: ArtifactType) => void;
  onDeleteArtifact?: (id: string) => void;
  onEditArtifact?: (id: string) => void;
  selectedArtifact: Artifact | null;
  onSelectArtifact: (id: string) => void;
  isGenerating?: boolean;
}

const NotebookLayout: React.FC<NotebookLayoutProps> = ({
  sources,
  onToggleSource,
  onAddSource,
  onRemoveSource,
  messages,
  onSendMessage,
  onClearChat,
  onRegenerateResponse,
  isChatLoading = false,
  onSaveQuizToStudio,
  onSaveMindMapToStudio,
  artifacts,
  onGenerateArtifact,
  onDeleteArtifact,
  onEditArtifact,
  selectedArtifact,
  onSelectArtifact,
  isGenerating = false,
}) => {
  const router = useRouter();
  const hasSelectedSources = sources.some((s) => s.selected);

  return (
    <div className="h-full flex flex-col relative bg-white overflow-hidden -m-4 md:-m-8 box-border">
      {/* Top Bar */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 shadow-sm flex-shrink-0 box-border">
        <button
          onClick={() => router.push('/study-notebook')}
          className="mr-4 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Back to Notebooks"
        >
          <ICONS.ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex items-center gap-4">
          <div className="text-2xl">📓</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Study Notebook</h1>
            <p className="text-xs text-slate-600">AI-powered collaborative learning</p>
          </div>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 box-border">{/* Left Panel - Sources */}
        <div className="w-80 flex-shrink-0 overflow-hidden border-r border-slate-200 box-border">
          <SourcesPanel
            sources={sources}
            onToggleSource={onToggleSource}
            onAddSource={onAddSource}
            onRemoveSource={onRemoveSource}
          />
        </div>

        {/* Center Panel - Chat */}
        <div className="flex-1 min-w-0 overflow-hidden border-r border-slate-200 box-border">
          <ChatPanel
            messages={messages}
            onSendMessage={onSendMessage}
            onClearChat={onClearChat}
            onRegenerateResponse={onRegenerateResponse}
            isLoading={isChatLoading}
            hasSelectedSources={hasSelectedSources}
            onSaveQuizToStudio={onSaveQuizToStudio}
            onSaveMindMapToStudio={onSaveMindMapToStudio}
          />
        </div>

        {/* Right Panel - Studio */}
        <div className="w-80 flex-shrink-0 overflow-hidden box-border">
          <StudioPanel
            artifacts={artifacts}
            onGenerateArtifact={onGenerateArtifact}
            onSelectArtifact={onSelectArtifact}
            onDeleteArtifact={onDeleteArtifact}
            onEditArtifact={onEditArtifact}
            selectedArtifact={selectedArtifact}
            isGenerating={isGenerating}
            hasSelectedSources={hasSelectedSources}
          />
        </div>
      </div>

      {/* Artifact Viewer Modal */}
      {selectedArtifact && (
        <ArtifactViewer
          artifact={selectedArtifact}
          onClose={() => onSelectArtifact('')}
          onEdit={onEditArtifact}
        />
      )}
    </div>
  );
};

export default NotebookLayout;
