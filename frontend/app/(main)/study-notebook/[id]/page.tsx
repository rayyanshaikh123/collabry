'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NotebookLayout from '../../../../components/study-notebook/NotebookLayout';
import CreateNotebookForm from '../../../../components/study-notebook/CreateNotebookForm';
import { Source } from '../../../../components/study-notebook/SourcesPanel';
import { ChatMessage } from '../../../../components/study-notebook/ChatPanel';
import { Artifact, ArtifactType } from '../../../../components/study-notebook/StudioPanel';
import { 
  useNotebook, 
  useAddSource, 
  useToggleSource, 
  useRemoveSource,
  useLinkArtifact,
  useUnlinkArtifact,
  useCreateNotebook
} from '../../../../src/hooks/useNotebook';
import { useSessionMessages, useSaveMessage } from '../../../../src/hooks/useSessions';
import { useGenerateQuiz, useGenerateMindMap, useCreateQuiz } from '../../../../src/hooks/useVisualAids';
import axios from 'axios';

const AI_ENGINE_URL = 'http://localhost:8000';

export default function StudyNotebookPage() {
  const params = useParams();
  const router = useRouter();
  const notebookId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const creationAttempted = useRef(false);

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
  const notebook = notebookData?.success ? notebookData.data : notebookData;

  // Mutations
  const addSource = useAddSource(notebookId);
  const toggleSource = useToggleSource(notebookId);
  const removeSource = useRemoveSource(notebookId);
  const linkArtifact = useLinkArtifact(notebookId);
  const unlinkArtifact = useUnlinkArtifact(notebookId);

  // AI operations
  const generateQuiz = useGenerateQuiz();
  const generateMindMap = useGenerateMindMap();
  const createQuiz = useCreateQuiz();
  
  // Chat state - Hook already handles enabled check internally
  const { data: sessionMessagesData } = useSessionMessages(notebook?.aiSessionId || '');
  const saveMessage = useSaveMessage();
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Studio state
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Local edits for artifact prompts (frontend-only)
  const [artifactEdits, setArtifactEdits] = useState<Record<string, { prompt?: string; numberOfQuestions?: number; difficulty?: string }>>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editNumber, setEditNumber] = useState<number>(5);
  const [editDifficulty, setEditDifficulty] = useState<string>('medium');
  const DEFAULT_QUIZ_PROMPT = 'Create a practice quiz with multiple choice questions about:';

  // Auto-create notebook on mount if needed (only for 'default' route)
  useEffect(() => {
    if (notebookId === 'default' && !isLoadingNotebook && !creationAttempted.current && !createNotebook.isPending) {
      creationAttempted.current = true;
      createNotebook.mutate({ title: 'My Study Notebook' }, {
        onSuccess: (response) => {
          // Handle both wrapped and unwrapped responses
          const newNotebookId = response?.data?._id || response?._id;
          if (newNotebookId) {
            // Small delay to ensure cache is updated
            setTimeout(() => {
              router.replace(`/study-notebook/${newNotebookId}`);
            }, 100);
          }
        },
        onError: (error) => {
          console.error('Failed to create notebook:', error);
          creationAttempted.current = false;
        }
      });
    }
  }, [notebookId, isLoadingNotebook, createNotebook.isPending]);

  // Load messages from AI session (only on initial mount)
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  useEffect(() => {
    if (sessionMessagesData && !isStreaming && !messagesLoaded) {
      console.log('Loading messages from server:', sessionMessagesData);
      const formattedMessages: ChatMessage[] = sessionMessagesData.map((msg: any) => ({
        id: msg.timestamp,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      setLocalMessages(formattedMessages);
      setMessagesLoaded(true);
    }
  }, [sessionMessagesData, isStreaming, messagesLoaded]);

  // Source Handlers
  const handleToggleSource = (id: string) => {
    toggleSource.mutate(id);
  };

  const handleAddSource = async (type: Source['type']) => {
    const formData = new FormData();
    formData.append('type', type);

    if (type === 'pdf') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,application/pdf';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          formData.append('file', file);
          formData.append('name', file.name);
          try {
            await addSource.mutateAsync(formData);
          } catch (error) {
            console.error('Failed to add PDF:', error);
            alert('Failed to upload PDF. Please try again.');
          }
        }
      };
      input.click();
    } else if (type === 'text' || type === 'notes') {
      const content = prompt('Enter your note:');
      if (content) {
        const name = prompt('Note title:', 'New Note') || 'New Note';
        formData.append('content', content);
        formData.append('name', name);
        try {
          await addSource.mutateAsync(formData);
        } catch (error) {
          console.error('Failed to add note:', error);
          alert('Failed to add note. Please try again.');
        }
      }
    } else if (type === 'website') {
      const url = prompt('Enter website URL:');
      if (url) {
        formData.append('url', url);
        formData.append('name', new URL(url).hostname);
        try {
          await addSource.mutateAsync(formData);
        } catch (error) {
          console.error('Failed to add website:', error);
          alert('Failed to add website. Please try again.');
        }
      }
    }
  };

  const handleRemoveSource = (id: string) => {
    if (confirm('Are you sure you want to remove this source?')) {
      removeSource.mutate(id);
    }
  };

  // Chat Handlers
  const handleSendMessage = async (message: string) => {
    if (!notebook?.aiSessionId) {
      alert('Chat session not initialized. Please refresh the page.');
      return;
    }

    // Add user message locally
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Adding user message:', userMessage);
    setLocalMessages((prev) => {
      const updated = [...prev, userMessage];
      console.log('LocalMessages after user:', updated);
      return updated;
    });
    setIsChatLoading(true);
    setIsStreaming(true);

    // Add loading message
    const loadingId = (Date.now() + 1).toString();
    const loadingMessage: ChatMessage = {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    setLocalMessages((prev) => {
      const updated = [...prev, loadingMessage];
      console.log('LocalMessages after loading:', updated);
      return updated;
    });

    try {
      // Get auth token
      const authStorage = localStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        token = state?.accessToken || '';
      }

      // Get selected sources context
      const selectedSources = notebook.sources.filter(s => s.selected);
      const useRag = selectedSources.length > 0;
      const selectedSourceIds = selectedSources.map(s => s._id);
      
      console.log('💬 Chat request:', {
        selectedSources: selectedSources.length,
        sourceIds: selectedSourceIds,
        useRag
      });

      // Stream response using POST
      const response = await fetch(
        `${AI_ENGINE_URL}/ai/sessions/${notebook.aiSessionId}/chat/stream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            use_rag: useRag,
            session_id: notebook.aiSessionId,
            source_ids: selectedSourceIds
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6); // Don't trim - preserve spaces
              
              // Skip empty data or done events
              if (!data || data.trim() === '[DONE]') continue;
              
              // Convert escaped newlines back to actual newlines for markdown
              const processedData = data.replace(/\\n/g, '\n');
              
              console.log('Received chunk:', JSON.stringify(data));
              fullResponse += processedData;
              
              // Update message in real-time
              setLocalMessages((prev) =>
                prev.map((msg) =>
                  msg.id === loadingId
                    ? { ...msg, content: fullResponse, isLoading: false }
                    : msg
                )
              );
            } else if (line.startsWith('event: done')) {
              // Stream completed
              console.log('Stream done. Full response:', fullResponse);
              break;
            }
          }
        }
      }

      setIsStreaming(false);
      setIsChatLoading(false);

    } catch (error) {
      console.error('Chat error:', error);
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? { ...msg, content: '❌ Failed to get response. Please try again.', isLoading: false }
            : msg
        )
      );
      setIsStreaming(false);
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setLocalMessages([]);
    }
  };

  const handleRegenerateResponse = () => {
    if (localMessages.length < 2) return;
    
    // Get the last user message
    for (let i = localMessages.length - 1; i >= 0; i--) {
      if (localMessages[i].role === 'user') {
        // Remove messages after this one
        setLocalMessages(prev => prev.slice(0, i + 1));
        // Resend the message
        handleSendMessage(localMessages[i].content);
        break;
      }
    }
  };

  // Studio Handlers
  const handleGenerateArtifact = async (type: ArtifactType) => {
    if (!notebook) return;

    const selectedSources = notebook.sources.filter(s => s.selected);
    if (selectedSources.length === 0) {
      alert('Please select at least one source to generate artifacts.');
      return;
    }

    setIsGenerating(true);

    try {
      if (type === 'course-finder') {
        // Extract topics from selected sources
        const topics = selectedSources
          .map(s => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        // Send to AI to search for courses
        const message = `Search the web for the best online courses, tutorials, and learning resources about: ${topics}. Find courses from platforms like Coursera, Udemy, edX, YouTube, etc. Include ratings and prices if available. return the results in a markdown list format with the web links of the courses.`;
        
        handleSendMessage(message);
        setIsGenerating(false);
        return;
      } else if (type === 'quiz') {
        // Extract topics from selected sources
        const topics = selectedSources
          .map(s => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        // If user edited the generator prompt (frontend-only), use it.
        // Prefer persisted edits, but if the edit modal is currently open for the
        // generator (`action-quiz`), also merge the live edit state so changes
        // take effect immediately without requiring an explicit Save.
        const persistedEdits = artifactEdits['action-quiz'] || {};
        const liveEdits = (editModalOpen && editingArtifactId === 'action-quiz')
          ? { prompt: editPrompt, numberOfQuestions: editNumber, difficulty: editDifficulty }
          : {};
        const actionEdits = { ...persistedEdits, ...liveEdits };
        const numQuestions = actionEdits.numberOfQuestions ?? 5;
        const difficulty = actionEdits.difficulty || 'medium';
        const original = (actionEdits.prompt && actionEdits.prompt.trim().length > 0)
          ? actionEdits.prompt
          : DEFAULT_QUIZ_PROMPT;

        // Build message using the original prompt text plus injected metadata
        const message = `${original} ${topics}

Format each question as follows:
1. [Question text]?
A) [Option 1]
B) [Option 2]
C) [Option 3]
D) [Option 4]
Answer: [A/B/C/D]
Explanation: [Brief explanation of why this is correct]

Requested number of questions: ${numQuestions}
Difficulty: ${difficulty}

Make sure the questions test understanding of key concepts from the material.`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      } else if (type === 'mindmap') {
        const content = selectedSources
          .map(s => s.content || `[${s.name}]`)
          .join('\n\n');

        // Request mind map generation. Backend expects { topic, maxNodes, save }
        const result = await generateMindMap.mutateAsync({
          topic: `${notebook.title} - Study Notes`,
          maxNodes: 20,
          // Do not request DB save here unless a subjectId is provided; backend
          // only saves when `save` is true AND `subjectId` is present.
          save: false,
        });

        // The service may return either a generated map ({ nodes, edges }) or
        // a saved mind map object (with _id). Accept multiple shapes.
        const savedId = (result && (result.savedMapId || (result as any)._id || (result as any).data?._id)) || null;

        if (savedId) {
          await linkArtifact.mutateAsync({
            type: 'mindmap',
            referenceId: savedId,
            title: `Mind Map - ${notebook.title}`,
          });
          alert('Mind map generated and saved to Studio!');
        } else {
          // Not saved to DB — present a non-fatal message and continue.
          alert('Mind map generated (not saved to Studio). You can save it from the Visual Aids page.');
        }

        // Add mindmap to chat history as an assistant message so it appears in the chat
        try {
          const assistantMsg = {
            id: Date.now().toString(),
            role: 'assistant' as const,
            content: JSON.stringify({ mindmap: result }),
            timestamp: new Date().toISOString(),
          };
          setLocalMessages((prev) => [...prev, assistantMsg]);
        } catch (e) {
          console.warn('Failed to append mindmap to chat history:', e);
        }
      } else {
        alert(`${type} generation coming soon!`);
      }
    } catch (error) {
      console.error('Failed to generate artifact:', error);
      alert('Failed to generate artifact. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuizToStudio = async (questions: any[]) => {
    if (!notebook) return;

    try {
      // First, create the quiz
      // Try to preserve user-edited metadata (number/difficulty/prompt) when saving
      const savedEdits = artifactEdits['action-quiz'] || selectedArtifact?.data || {};
      const displayCount = savedEdits.numberOfQuestions || questions.length;
      const quizDifficulty = savedEdits.difficulty || 'medium';
      const quizPrompt = savedEdits.prompt || '';

      const quizData = {
        title: `Practice Quiz - ${displayCount} Questions`,
        description: quizPrompt || 'Generated from study session',
        sourceType: 'ai' as const,
        questions: questions.map((q, index) => {
          const options = Array.isArray(q.options) ? q.options : (Array.isArray(q.choices) ? q.choices : []);

          // Determine correct answer text safely
          let correctAnswerText = '';
          if (typeof q.correctAnswer === 'number') {
            correctAnswerText = options[q.correctAnswer] ?? '';
          } else if (typeof q.correctAnswer === 'string') {
            // If it's an option value
            if (options.includes(q.correctAnswer)) {
              correctAnswerText = q.correctAnswer;
            } else {
              // Might be letter A/B/C/D — convert to index
              const letter = q.correctAnswer.trim().toUpperCase();
              if (/^[A-Z]$/.test(letter)) {
                const idx = letter.charCodeAt(0) - 65; // A -> 0
                correctAnswerText = options[idx] ?? q.correctAnswer ?? '';
              } else {
                correctAnswerText = q.answer ?? q.correctAnswer ?? '';
              }
            }
          } else if (q.answer && typeof q.answer === 'string') {
            correctAnswerText = q.answer;
          }

          return {
            question: q.question,
            options,
            correctAnswer: correctAnswerText,
            explanation: q.explanation || '',
            difficulty: (q.difficulty as any) || quizDifficulty,
            points: 1,
            order: index
          };
        }),
        settings: {
          shuffleQuestions: false,
          shuffleOptions: false,
          showExplanations: true,
          allowReview: true
        }
      };

      // Create the quiz in the database
      const createdQuiz = await createQuiz.mutateAsync(quizData);

      // Now link it to the notebook
      await linkArtifact.mutateAsync({
        type: 'quiz',
        referenceId: createdQuiz._id,
        title: quizData.title,
      });

      alert('Quiz saved to Studio successfully!');
    } catch (error) {
      console.error('Failed to save quiz:', error);
      alert('Failed to save quiz to Studio');
    }
  };

  const openEditModal = (artifactId: string) => {
    const existing = artifactEdits[artifactId] || {};
    // Prefer data embedded in the notebook artifact if available
    const notebookArtifact = notebook?.artifacts?.find((a: any) => a._id === artifactId);
    const artifactData = notebookArtifact?.data || {};
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
    // If the edited artifact is currently selected in the viewer, update that state as well
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
    alert('Saved prompt changes locally (frontend only).');
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    if (!notebook) return;
    try {
      // Clear viewer first to avoid React unmount ordering issues
      if (selectedArtifact?.id === artifactId) {
        setSelectedArtifact(null);
      }
      // Fire mutation (don't rely on UI state during awaiting)
      await unlinkArtifact.mutateAsync(artifactId);
      alert('Artifact deleted');
    } catch (error) {
      console.error('Failed to delete artifact:', error);
      alert('Failed to delete artifact');
    }
  };

  const handleSelectArtifact = (id: string) => {
    if (!id || !notebook) {
      setSelectedArtifact(null);
      return;
    }
    
    const artifact = notebook.artifacts.find((a) => a._id === id);
    if (artifact) {
      setSelectedArtifact({
        id: artifact._id,
        type: artifact.type as ArtifactType,
        title: artifact.title,
        createdAt: artifact.createdAt,
        data: { referenceId: artifact.referenceId }
      });
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  if (isLoadingNotebook || createNotebook.isPending) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notebook...</p>
        </div>
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">Notebook not found</p>
          <button
            onClick={() => router.push('/study-notebook/new')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
      sources={notebook.sources.map(s => ({
        id: s._id,
        type: s.type as Source['type'],
        name: s.name,
        size: s.size ? `${(s.size / 1024 / 1024).toFixed(2)} MB` : undefined,
        dateAdded: 'Just now', // Backend doesn't include timestamp in embedded source
        selected: s.selected,
        url: s.url
      }))}
      onToggleSource={handleToggleSource}
      onAddSource={handleAddSource}
      onRemoveSource={handleRemoveSource}
      messages={localMessages}
      onSendMessage={handleSendMessage}
      onClearChat={handleClearChat}
      onRegenerateResponse={handleRegenerateResponse}
      isChatLoading={isChatLoading}
      onSaveQuizToStudio={handleSaveQuizToStudio}
      artifacts={notebook.artifacts.map(a => {
        const edits = artifactEdits[a._id] || {};
        return ({
          id: a._id,
          type: a.type as ArtifactType,
          title: edits.numberOfQuestions ? `${a.title} (${edits.numberOfQuestions} q)` : a.title,
          createdAt: a.createdAt,
          data: { referenceId: a.referenceId, prompt: edits.prompt, numberOfQuestions: edits.numberOfQuestions, difficulty: edits.difficulty }
        });
      })}
      onGenerateArtifact={handleGenerateArtifact}
      onSelectArtifact={handleSelectArtifact}
      isGenerating={isGenerating}
      onDeleteArtifact={handleDeleteArtifact}
      onEditArtifact={openEditModal}
      selectedArtifact={selectedArtifact}
    />

    {/* Edit Modal (frontend-only) */}
    {editModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-sm">
        <div className="w-11/12 max-w-xl bg-white rounded-lg p-4 shadow-xl border border-slate-200">
          <h3 className="text-lg font-bold mb-2">Edit Quiz Prompt & Settings</h3>
          <label className="text-xs text-slate-600">Prompt</label>
          {/* When editing the generator action (action-quiz) show original prompt as readonly
              and display a live preview that reflects number and difficulty. For saved quiz
              artifacts the prompt remains editable. */}
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            className="w-full border rounded p-2 mt-1 mb-3 h-28"
            readOnly={editingArtifactId === 'action-quiz'}
          />

          {editingArtifactId === 'action-quiz' && (
            <div className="mb-3">
              <label className="text-xs text-slate-600">Preview</label>
              <pre className="whitespace-pre-wrap text-xs bg-slate-50 border rounded p-2 mt-1 h-32 overflow-auto">{`${(editPrompt && editPrompt.trim().length > 0 ? editPrompt : DEFAULT_QUIZ_PROMPT)}\n\nRequested number of questions: ${editNumber}\nDifficulty: ${editDifficulty}`}</pre>
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="text-xs text-slate-600">Number of Questions</label>
              <input type="number" min={1} max={50} value={editNumber} onChange={(e) => setEditNumber(Number(e.target.value))} className="w-full border rounded p-2 mt-1" />
            </div>
            <div className="w-40">
              <label className="text-xs text-slate-600">Difficulty</label>
              <select value={editDifficulty} onChange={(e) => setEditDifficulty(e.target.value)} className="w-full border rounded p-2 mt-1">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setEditModalOpen(false)} className="px-3 py-1 bg-slate-100 rounded">Cancel</button>
            <button onClick={saveEditModal} className="px-3 py-1 bg-indigo-600 text-white rounded">Save</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
