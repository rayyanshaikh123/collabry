'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NotebookLayout from '../../../../components/study-notebook/NotebookLayout';
import CreateNotebookForm from '../../../../components/study-notebook/CreateNotebookForm';
import { SourceModals } from '@/components/study-notebook/SourceModals';
import { QuizEditModal } from '@/components/study-notebook/QuizEditModal';
import { Source as SourcePanelType } from '../../../../components/study-notebook/SourcesPanel';
import { ChatMessage } from '../../../../components/study-notebook/ChatPanel';
import { Artifact as ArtifactPanelType, ArtifactType } from '../../../../components/study-notebook/StudioPanel';
import { Notebook, Source, Artifact } from '@/lib/services/notebook.service';
import {
  useNotebook,
  useAddSource,
  useToggleSource,
  useRemoveSource,
  useLinkArtifact,
  useUnlinkArtifact,
  useCreateNotebook
} from '@/hooks/useNotebook';
import { useSessionMessages, useSaveMessage, useClearSessionMessages } from '@/hooks/useSessions';
import { useGenerateQuiz, useGenerateMindMap, useCreateQuiz } from '@/hooks/useVisualAids';
import { useNotebookChat } from '@/hooks/useNotebookChat';
import { useArtifactGenerator } from '@/hooks/useArtifactGenerator';
import { useStudioSave } from '@/hooks/useStudioSave';
import { extractMindMapFromMarkdown } from '@/lib/mindmapParser';
import axios from 'axios';
import { showError, showSuccess, showWarning, showInfo, showConfirm } from '@/lib/alert';

const AI_ENGINE_URL = (process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export default function StudyNotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const creationAttempted = useRef(false);
  const addSourceInFlightRef = useRef(false);
  const chatAbortRef = useRef<AbortController | null>(null);

  // Show create form for 'new' route
  if (notebookId === 'new') {
    return <CreateNotebookForm />;
  }

  // Create notebook if 'default'
  const createNotebook = useCreateNotebook();

  // Fetch notebook data
  const { data: notebookData, isLoading: isLoadingNotebook } = useNotebook(
    notebookId !== 'default' ? notebookId : undefined
  );
  // Type guard to ensure we always have a Notebook type
  const notebook = (notebookData?.success ? notebookData.data : notebookData) as Notebook | undefined;

  // Mutations
  const addSource = useAddSource(notebookId);
  const toggleSource = useToggleSource(notebookId);
  const removeSource = useRemoveSource(notebookId);
  const linkArtifact = useLinkArtifact(notebookId);
  const unlinkArtifact = useUnlinkArtifact(notebookId);

  // Dedupe sources defensively to avoid UI-only duplicates from transient cache states
  const dedupedSources = React.useMemo(() => {
    const sources = notebook?.sources ?? [];
    const seen = new Set<string>();
    const unique: Source[] = [];

    for (const s of sources) {
      const id = (s as any)?._id as string | undefined;
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(s);
    }

    return unique;
  }, [notebook?.sources]);

  // Selected source IDs for filtering
  const selectedSourceIds = React.useMemo(() => {
    return dedupedSources.filter(s => s.selected).map(s => s._id);
  }, [dedupedSources]);

  // AI operations
  const generateQuiz = useGenerateQuiz();
  const generateMindMap = useGenerateMindMap();
  const createQuiz = useCreateQuiz();

  // Chat state - Hook already handles enabled check internally
  const { data: sessionMessagesData } = useSessionMessages(notebook?.aiSessionId || '');
  const saveMessage = useSaveMessage();
  const clearSessionMessages = useClearSessionMessages();
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Sync backend messages to local state on mount/update
  useEffect(() => {
    if (sessionMessagesData && Array.isArray(sessionMessagesData)) {
      const formattedMessages: ChatMessage[] = sessionMessagesData.map((msg: any) => ({
        id: msg._id || `msg-${Date.now()}-${Math.random()}`,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || msg.created_at || new Date().toISOString()
      }));
      setLocalMessages(formattedMessages);
    }
  }, [sessionMessagesData]);

  // Studio state
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactPanelType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Local edits for artifact prompts (frontend-only)
  const [artifactEdits, setArtifactEdits] = useState<Record<string, { prompt?: string; numberOfQuestions?: number; difficulty?: string }>>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editNumber, setEditNumber] = useState<number>(5);
  const [editDifficulty, setEditDifficulty] = useState<string>('medium');

  // Modal states
  const [addTextModalOpen, setAddTextModalOpen] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');

  const [addNotesModalOpen, setAddNotesModalOpen] = useState(false);
  const [notesContent, setNotesContent] = useState('');
  const [notesTitle, setNotesTitle] = useState('New Note');

  const [addWebsiteModalOpen, setAddWebsiteModalOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Initialize custom hooks
  const {
    handleSendMessage,
    handleRegeneratePrompt,
    handleEditPrompt,
    handleClearChat,
    handleRegenerateResponse
  } = useNotebookChat({
    notebookId,
    sessionId: notebook?.aiSessionId || '',
    localMessages,
    setLocalMessages,
    setIsStreaming,
    setIsChatLoading,
    clearSessionMessages,
    sourceIds: selectedSourceIds,
  });

  const { handleGenerateArtifact } = useArtifactGenerator({
    notebook,
    artifactEdits,
    editModalOpen,
    editingArtifactId,
    editPrompt,
    editNumber,
    editDifficulty,
    setIsGenerating,
    handleSendMessage,
    showWarning,
    showError,
    showInfo,
  });

  const {
    handleSaveQuizToStudio,
    handleSaveMindMapToStudio,
    handleSaveInfographicToStudio,
    handleSaveFlashcardsToStudio
  } = useStudioSave({
    notebook,
    artifactEdits,
    selectedArtifact,
    linkArtifact,
    createQuiz,
    generateMindMap,
    showSuccess,
    showError,
    showWarning,
  });

  // Handler: Toggle Source
  const handleToggleSource = async (sourceId: string) => {
    try {
      await toggleSource.mutateAsync(sourceId);
    } catch (error) {
      console.error('Failed to toggle source:', error);
      showError('Failed to toggle source');
    }
  };

  // Handler: Add Source
  const handleAddSource = (type: 'pdf' | 'text' | 'website' | 'notes') => {
    if (type === 'text') {
      setAddTextModalOpen(true);
    } else if (type === 'notes') {
      setAddNotesModalOpen(true);
    } else if (type === 'website') {
      setAddWebsiteModalOpen(true);
    } else if (type === 'pdf') {
      if (addSource.isPending || addSourceInFlightRef.current) {
        showInfo('Upload already in progress');
        return;
      }
      // Trigger file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          if (addSourceInFlightRef.current) return;
          addSourceInFlightRef.current = true;
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'pdf');
            formData.append('name', file.name);

            await addSource.mutateAsync(formData as any);
            showSuccess('PDF uploaded successfully');
          } catch (error) {
            console.error('Failed to upload PDF:', error);
            showError('Failed to upload PDF');
          } finally {
            addSourceInFlightRef.current = false;
          }
        }
      };
      input.click();
    }
  };

  // Handler: Submit Text
  const handleSubmitText = async () => {
    if (!textContent.trim()) {
      showWarning('Please enter some content');
      return;
    }
    if (!textTitle.trim()) {
      showWarning('Please enter a title');
      return;
    }

    try {
      await addSource.mutateAsync({
        type: 'text',
        name: textTitle,
        content: textContent,
      } as any);

      setAddTextModalOpen(false);
      setTextContent('');
      setTextTitle('');
      showSuccess('Text source added successfully');
    } catch (error) {
      console.error('Failed to add text source:', error);
      showError('Failed to add text source');
    }
  };

  // Handler: Submit Notes
  const handleSubmitNotes = async () => {
    if (!notesContent.trim()) {
      showWarning('Please enter some notes');
      return;
    }

    try {
      await addSource.mutateAsync({
        type: 'notes',
        name: notesTitle || 'New Note',
        content: notesContent,
      } as any);

      setAddNotesModalOpen(false);
      setNotesContent('');
      setNotesTitle('New Note');
      showSuccess('Note added successfully');
    } catch (error) {
      console.error('Failed to add note:', error);
      showError('Failed to add note');
    }
  };

  // Handler: Submit Website
  const handleSubmitWebsite = async () => {
    if (!websiteUrl.trim()) {
      showWarning('Please enter a URL');
      return;
    }

    try {
      await addSource.mutateAsync({
        type: 'website',
        url: websiteUrl,
        name: websiteUrl,
      } as any);

      setAddWebsiteModalOpen(false);
      setWebsiteUrl('');
      showSuccess('Website added successfully');
    } catch (error) {
      console.error('Failed to add website:', error);
      showError('Failed to add website');
    }
  };

  // Handler: Remove Source
  const handleRemoveSource = async (sourceId: string) => {
    showConfirm(
      'Are you sure you want to remove this source?',
      async () => {
        try {
          await removeSource.mutateAsync(sourceId);
          showSuccess('Source removed');
        } catch (error) {
          console.error('Failed to remove source:', error);
          showError('Failed to remove source');
        }
      },
      'Remove Source',
      'Remove',
      'Cancel'
    );
  };

  const openEditModal = (artifactId: string) => {
    const existing = artifactEdits[artifactId] || {};
    const notebookArtifact = notebook?.artifacts?.find((a) => a._id === artifactId);
    const artifactData = (notebookArtifact as any)?.data || {};
    setEditingArtifactId(artifactId);
    setEditPrompt(
      existing.prompt || artifactData?.prompt || `Create a practice quiz with exactly ${existing.numberOfQuestions || artifactData?.numberOfQuestions || 5} multiple choice questions about:`
    );
    setEditNumber(existing.numberOfQuestions || artifactData?.numberOfQuestions || 5);
    setEditDifficulty(existing.difficulty || artifactData?.difficulty || 'medium');
    setEditModalOpen(true);
  };

  const saveEditModal = () => {
    if (!editingArtifactId) return;
    setArtifactEdits((prev) => ({
      ...prev,
      [editingArtifactId]: {
        prompt: editPrompt,
        numberOfQuestions: editNumber,
        difficulty: editDifficulty,
      }
    }));

    if (selectedArtifact?.id === editingArtifactId) {
      setSelectedArtifact((prev) => prev ? ({
        ...prev,
        data: {
          ...prev.data,
          prompt: editPrompt,
          numberOfQuestions: editNumber,
          difficulty: editDifficulty,
        }
      }) : prev);
    }

    setEditModalOpen(false);
    showSuccess('Saved prompt changes locally (frontend only).');
  };

  const handleSelectArtifact = (artifactId: string) => {
    if (!artifactId) {
      setSelectedArtifact(null);
      return;
    }

    const artifact = notebook?.artifacts.find(a => a._id === artifactId);
    if (artifact) {
      console.log('Selected artifact from notebook:', artifact);
      console.log('Artifact data:', artifact.data);
      console.log('Artifact type:', artifact.type);

      const edits = artifactEdits[artifact._id] || {};
      const selectedData = {
        id: artifact._id,
        type: artifact.type as ArtifactType,
        title: edits.numberOfQuestions ? `${artifact.title} (${edits.numberOfQuestions} q)` : artifact.title,
        createdAt: artifact.createdAt,
        data: artifact.data || { referenceId: artifact.referenceId, prompt: edits.prompt, numberOfQuestions: edits.numberOfQuestions, difficulty: edits.difficulty }
      };

      console.log('Setting selectedArtifact:', selectedData);
      setSelectedArtifact(selectedData);
    }
  };

  const handleDeleteArtifact = (artifactId: string) => {
    if (!notebook) return;

    showConfirm(
      'Are you sure you want to delete this artifact?',
      async () => {
        try {
          if (selectedArtifact?.id === artifactId) {
            setSelectedArtifact(null);
          }
          await unlinkArtifact.mutateAsync(artifactId);
          showSuccess('Artifact deleted');
        } catch (error) {
          console.error('Failed to delete artifact:', error);
          showError('Failed to delete artifact');
        }
      },
      'Delete Artifact',
      'Delete',
      'Cancel'
    );
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  if (isLoadingNotebook || createNotebook.isPending) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading notebook...</p>
        </div>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Notebook not found</p>
          <button
            onClick={() => router.push('/study-notebook/new')}
            className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
          >
            Create New Notebook
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <NotebookLayout
        sources={dedupedSources.map((s) => ({
          id: s._id,
          type: s.type as SourcePanelType['type'],
          name: s.name,
          size: s.size ? `${(s.size / 1024 / 1024).toFixed(2)} MB` : undefined,
          dateAdded: s.dateAdded ? new Date(s.dateAdded).toLocaleString() : '—',
          selected: s.selected,
          url: s.url
        }))}
        onToggleSource={handleToggleSource}
        onAddSource={handleAddSource}
        onRemoveSource={handleRemoveSource}
        messages={localMessages}
        onSendMessage={handleSendMessage}
        onRegeneratePrompt={handleRegeneratePrompt}
        onEditPrompt={handleEditPrompt}
        onClearChat={() => handleClearChat(showConfirm, showSuccess, showError)}
        onRegenerateResponse={handleRegenerateResponse}
        isChatLoading={isChatLoading}
        onSaveQuizToStudio={handleSaveQuizToStudio}
        onSaveMindMapToStudio={handleSaveMindMapToStudio}
        onSaveInfographicToStudio={handleSaveInfographicToStudio}
        onSaveFlashcardsToStudio={handleSaveFlashcardsToStudio}
        artifacts={notebook.artifacts.map((a) => {
          const edits = artifactEdits[a._id] || {};
          return ({
            id: a._id,
            type: a.type as ArtifactType,
            title: edits.numberOfQuestions ? `${a.title} (${edits.numberOfQuestions} q)` : a.title,
            createdAt: a.createdAt,
            // Preserve inline data (flashcards, infographics) and also include metadata
            data: a.data || { referenceId: a.referenceId, prompt: edits.prompt, numberOfQuestions: edits.numberOfQuestions, difficulty: edits.difficulty }
          });
        })}
        onGenerateArtifact={handleGenerateArtifact}
        onSelectArtifact={handleSelectArtifact}
        isGenerating={isGenerating}
        onDeleteArtifact={handleDeleteArtifact}
        onEditArtifact={openEditModal}
        selectedArtifact={selectedArtifact}
      />

      <SourceModals
        addTextModalOpen={addTextModalOpen}
        textTitle={textTitle}
        textContent={textContent}
        setTextTitle={setTextTitle}
        setTextContent={setTextContent}
        onSubmitText={handleSubmitText}
        onCloseTextModal={() => {
          setAddTextModalOpen(false);
          setTextContent('');
          setTextTitle('');
        }}
        addNotesModalOpen={addNotesModalOpen}
        notesTitle={notesTitle}
        notesContent={notesContent}
        setNotesTitle={setNotesTitle}
        setNotesContent={setNotesContent}
        onSubmitNotes={handleSubmitNotes}
        onCloseNotesModal={() => {
          setAddNotesModalOpen(false);
          setNotesContent('');
          setNotesTitle('New Note');
        }}
        addWebsiteModalOpen={addWebsiteModalOpen}
        websiteUrl={websiteUrl}
        setWebsiteUrl={setWebsiteUrl}
        onSubmitWebsite={handleSubmitWebsite}
        onCloseWebsiteModal={() => {
          setAddWebsiteModalOpen(false);
          setWebsiteUrl('');
        }}
      />

      <QuizEditModal
        isOpen={editModalOpen}
        editingArtifactId={editingArtifactId}
        editPrompt={editPrompt}
        editNumber={editNumber}
        editDifficulty={editDifficulty}
        setEditPrompt={setEditPrompt}
        setEditNumber={setEditNumber}
        setEditDifficulty={setEditDifficulty}
        onSave={saveEditModal}
        onClose={() => setEditModalOpen(false)}
      />
    </>
  );
}
