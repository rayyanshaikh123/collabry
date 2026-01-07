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
  useCreateNotebook
} from '../../../../src/hooks/useNotebook';
import { useSessionMessages, useSaveMessage } from '../../../../src/hooks/useSessions';
import { useGenerateQuiz, useGenerateMindMap } from '../../../../src/hooks/useVisualAids';
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

  // AI operations
  const generateQuiz = useGenerateQuiz();
  const generateMindMap = useGenerateMindMap();
  
  // Chat state - Hook already handles enabled check internally
  const { data: sessionMessagesData } = useSessionMessages(notebook?.aiSessionId || '');
  const saveMessage = useSaveMessage();
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Studio state
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Load messages from AI session
  useEffect(() => {
    if (sessionMessagesData && !isStreaming) {
      const formattedMessages: ChatMessage[] = sessionMessagesData.map((msg: any) => ({
        id: msg.timestamp,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: msg.timestamp,
      }));
      setLocalMessages(formattedMessages);
    }
  }, [sessionMessagesData, isStreaming]);

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
    
    setLocalMessages((prev) => [...prev, userMessage]);
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
    setLocalMessages((prev) => [...prev, loadingMessage]);

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
      const context = selectedSources.map(s => 
        `Source: ${s.name}\nType: ${s.type}\nContent: ${s.content || '[File content]'}`
      ).join('\n\n');

      const requestBody = {
        message: message,
        context: context || undefined,
        use_rag: selectedSources.length > 0
      };

      // Stream response
      const response = await fetch(
        `${AI_ENGINE_URL}/ai/sessions/${notebook.aiSessionId}/chat/stream?${new URLSearchParams({
          message: message,
          use_rag: selectedSources.length > 0 ? 'true' : 'false'
        })}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
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
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  // Update message in real-time
                  setLocalMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === loadingId
                        ? { ...msg, content: fullResponse, isLoading: false }
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
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
      if (type === 'quiz') {
        // Combine source content
        const content = selectedSources
          .map(s => s.content || `[${s.name}]`)
          .join('\n\n');

        const result = await generateQuiz.mutateAsync({
          content,
          count: 10,
          difficulty: 'medium' as 'easy' | 'medium' | 'hard',
          save: true,
          title: `Quiz - ${notebook.title}`,
          useRag: false,
        });

        if (!result.savedQuizId) {
          throw new Error('Quiz was not saved');
        }

        // Link to notebook
        await linkArtifact.mutateAsync({
          type: 'quiz',
          referenceId: result.savedQuizId,
          title: `Quiz - ${notebook.title}`,
        });

        alert('Quiz generated successfully!');
      } else if (type === 'mindmap') {
        const content = selectedSources
          .map(s => s.content || `[${s.name}]`)
          .join('\n\n');

        const result = await generateMindMap.mutateAsync({
          topic: `${notebook.title} - Study Notes`,
          depth: 3,
          maxNodes: 20,
          saveToLibrary: true,
          title: `Mind Map - ${notebook.title}`,
        });

        if (!result.savedMapId) {
          throw new Error('Mind map was not saved');
        }

        await linkArtifact.mutateAsync({
          type: 'mindmap',
          referenceId: result.savedMapId,
          title: `Mind Map - ${notebook.title}`,
        });

        alert('Mind map generated successfully!');
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
      artifacts={notebook.artifacts.map(a => ({
        id: a._id,
        type: a.type as ArtifactType,
        title: a.title,
        createdAt: a.createdAt,
        data: { referenceId: a.referenceId }
      }))}
      onGenerateArtifact={handleGenerateArtifact}
      onSelectArtifact={handleSelectArtifact}
      isGenerating={isGenerating}
      selectedArtifact={selectedArtifact}
    />
  );
}
