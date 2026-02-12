'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NotebookLayout from '../../../../components/study-notebook/NotebookLayout';
import CreateNotebookForm from '../../../../components/study-notebook/CreateNotebookForm';
import { SourceModals } from '@/components/study-notebook/SourceModals';
import { QuizEditModal } from '@/components/study-notebook/QuizEditModal';
import { LoadingPage, LoadingOverlay } from '@/components/UIElements';
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
import { showError, showSuccess, showWarning, showInfo, showConfirm } from '@/lib/alert';

export default function StudyNotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const addSourceInFlightRef = useRef(false);

  // Show create form for 'new' route
  if (notebookId === 'new') {
    return <CreateNotebookForm />;
  }

  // Hook already handles create notebook if 'default' (though usually redirected)
  const createNotebook = useCreateNotebook();

  // Fetch notebook data
  const { data: notebookData, isLoading: isLoadingNotebook } = useNotebook(
    notebookId !== 'default' ? notebookId : undefined
  );

  const notebook = (notebookData?.success ? notebookData.data : notebookData) as Notebook | undefined;

  // Mutations
  const addSource = useAddSource(notebookId);
  const toggleSource = useToggleSource(notebookId);
  const removeSource = useRemoveSource(notebookId);
  const linkArtifact = useLinkArtifact(notebookId);
  const unlinkArtifact = useUnlinkArtifact(notebookId);

  // Dedupe sources defensively
  const dedupedSources = React.useMemo(() => {
    const sources = notebook?.sources ?? [];
    const seen = new Set<string>();
    const unique: Source[] = [];
    for (const s of sources) {
      const id = (s as any)?._id as string | undefined;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      unique.push(s);
    }
    return unique;
  }, [notebook?.sources]);

  const selectedSourceIds = React.useMemo(() => {
    return dedupedSources.filter(s => s.selected).map(s => s._id);
  }, [dedupedSources]);

  // AI operations
  const generateQuiz = useGenerateQuiz();
  const generateMindMap = useGenerateMindMap();
  const createQuiz = useCreateQuiz();

  // Chat state
  const { data: sessionMessagesData } = useSessionMessages(notebook?.aiSessionId || '');
  const clearSessionMessages = useClearSessionMessages();
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

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
  const [artifactEdits, setArtifactEdits] = useState<Record<string, { prompt?: string; numberOfQuestions?: number; difficulty?: string }>>({});

  // Edit Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editNumber, setEditNumber] = useState<number>(5);
  const [editDifficulty, setEditDifficulty] = useState<string>('medium');

  // Add Source Modal states
  const [addTextModalOpen, setAddTextModalOpen] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [addNotesModalOpen, setAddNotesModalOpen] = useState(false);
  const [notesContent, setNotesContent] = useState('');
  const [notesTitle, setNotesTitle] = useState('New Note');
  const [addWebsiteModalOpen, setAddWebsiteModalOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Custom logic hooks
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

  // Handlers
  const handleToggleSource = async (sourceId: string) => {
    try { await toggleSource.mutateAsync(sourceId); }
    catch (e) { showError('Failed to toggle source'); }
  };

  const handleAddSource = (type: 'pdf' | 'text' | 'website' | 'notes') => {
    if (type === 'text') setAddTextModalOpen(true);
    else if (type === 'notes') setAddNotesModalOpen(true);
    else if (type === 'website') setAddWebsiteModalOpen(true);
    else if (type === 'pdf') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && !addSourceInFlightRef.current) {
          addSourceInFlightRef.current = true;
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'pdf');
            formData.append('name', file.name);
            await addSource.mutateAsync(formData as any);
            showSuccess('PDF uploaded successfully');
          } catch (e) { showError('Failed to upload PDF'); }
          finally { addSourceInFlightRef.current = false; }
        }
      };
      input.click();
    }
  };

  const handleSubmitText = async () => {
    if (!textContent.trim() || !textTitle.trim()) { showWarning('Please enter content and title'); return; }
    try {
      await addSource.mutateAsync({ type: 'text', name: textTitle, content: textContent } as any);
      setAddTextModalOpen(false); setTextContent(''); setTextTitle('');
    } catch (e) { showError('Failed to add text source'); }
  };

  const handleSubmitNotes = async () => {
    if (!notesContent.trim()) { showWarning('Please enter some notes'); return; }
    try {
      await addSource.mutateAsync({ type: 'notes', name: notesTitle || 'New Note', content: notesContent } as any);
      setAddNotesModalOpen(false); setNotesContent(''); setNotesTitle('New Note');
    } catch (e) { showError('Failed to add note'); }
  };

  const handleSubmitWebsite = async () => {
    if (!websiteUrl.trim()) { showWarning('Please enter a URL'); return; }
    try {
      await addSource.mutateAsync({ type: 'website', url: websiteUrl, name: websiteUrl } as any);
      setAddWebsiteModalOpen(false); setWebsiteUrl('');
    } catch (e) { showError('Failed to add website'); }
  };

  const handleRemoveSource = async (sourceId: string) => {
    showConfirm('Are you sure you want to remove this source?', async () => {
      try { await removeSource.mutateAsync(sourceId); } catch (e) { showError('Failed to remove source'); }
    }, 'Remove Source');
  };

  const openEditModal = (artifactId: string) => {
    const existing = artifactEdits[artifactId] || {};
    const notebookArtifact = notebook?.artifacts?.find((a) => a._id === artifactId);
    const artifactData = (notebookArtifact as any)?.data || {};
    setEditingArtifactId(artifactId);
    setEditPrompt(existing.prompt || artifactData?.prompt || `Create a practice quiz with exactly ${existing.numberOfQuestions || artifactData?.numberOfQuestions || 5} multiple choice questions about:`);
    setEditNumber(existing.numberOfQuestions || artifactData?.numberOfQuestions || 5);
    setEditDifficulty(existing.difficulty || artifactData?.difficulty || 'medium');
    setEditModalOpen(true);
  };

  const saveEditModal = () => {
    if (!editingArtifactId) return;
    setArtifactEdits(prev => ({ ...prev, [editingArtifactId]: { prompt: editPrompt, numberOfQuestions: editNumber, difficulty: editDifficulty } }));
    if (selectedArtifact?.id === editingArtifactId) {
      setSelectedArtifact(prev => prev ? ({ ...prev, data: { ...prev.data, prompt: editPrompt, numberOfQuestions: editNumber, difficulty: editDifficulty } }) : prev);
    }
    setEditModalOpen(false);
  };

  const handleSelectArtifact = (artifactId: string) => {
    if (!artifactId) { setSelectedArtifact(null); return; }
    const artifact = notebook?.artifacts.find(a => a._id === artifactId);
    if (artifact) {
      const edits = artifactEdits[artifact._id] || {};
      setSelectedArtifact({
        id: artifact._id,
        type: artifact.type as ArtifactType,
        title: edits.numberOfQuestions ? `${artifact.title} (${edits.numberOfQuestions} q)` : artifact.title,
        createdAt: artifact.createdAt,
        data: artifact.data || { referenceId: artifact.referenceId, prompt: edits.prompt, numberOfQuestions: edits.numberOfQuestions, difficulty: edits.difficulty }
      });
    }
  };

  const handleDeleteArtifact = (artifactId: string) => {
    showConfirm('Delete this artifact?', async () => {
      try {
        if (selectedArtifact?.id === artifactId) setSelectedArtifact(null);
        await unlinkArtifact.mutateAsync(artifactId);
      } catch (e) { showError('Failed to delete artifact'); }
    }, 'Delete Artifact');
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [localMessages]);

  if (isLoadingNotebook || createNotebook.isPending) return <LoadingPage />;
  if (!notebook) return <div className="flex h-screen items-center justify-center p-8"><p className="text-xl font-bold">Notebook not found</p></div>;

  return (
    <>
      {isGenerating && <LoadingOverlay message="Generating your AI artifact..." />}
      {isChatLoading && localMessages.length === 0 && <LoadingOverlay message="Initializing AI tutor..." />}
      {addSource.isPending && <LoadingOverlay message="Uploading source content..." />}

      <NotebookLayout
        sources={dedupedSources.map(s => ({
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
        artifacts={notebook.artifacts.map(a => {
          const edits = artifactEdits[a._id] || {};
          return ({
            id: a._id,
            type: a.type as ArtifactType,
            title: edits.numberOfQuestions ? `${a.title} (${edits.numberOfQuestions} q)` : a.title,
            createdAt: a.createdAt,
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
        addTextModalOpen={addTextModalOpen} textTitle={textTitle} textContent={textContent}
        setTextTitle={setTextTitle} setTextContent={setTextContent} onSubmitText={handleSubmitText}
        onCloseTextModal={() => { setAddTextModalOpen(false); setTextContent(''); setTextTitle(''); }}
        addNotesModalOpen={addNotesModalOpen} notesTitle={notesTitle} notesContent={notesContent}
        setNotesTitle={setNotesTitle} setNotesContent={setNotesContent} onSubmitNotes={handleSubmitNotes}
        onCloseNotesModal={() => { setAddNotesModalOpen(false); setNotesContent(''); setNotesTitle('New Note'); }}
        addWebsiteModalOpen={addWebsiteModalOpen} websiteUrl={websiteUrl} setWebsiteUrl={setWebsiteUrl}
        onSubmitWebsite={handleSubmitWebsite} onCloseWebsiteModal={() => { setAddWebsiteModalOpen(false); setWebsiteUrl(''); }}
      />

      <QuizEditModal
        isOpen={editModalOpen} editingArtifactId={editingArtifactId} editPrompt={editPrompt}
        editNumber={editNumber} editDifficulty={editDifficulty} setEditPrompt={setEditPrompt}
        setEditNumber={setEditNumber} setEditDifficulty={setEditDifficulty} onSave={saveEditModal}
        onClose={() => setEditModalOpen(false)}
      />
    </>
  );
}
