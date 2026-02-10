'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import NotebookLayout from '../../../../components/study-notebook/NotebookLayout';
import CreateNotebookForm from '../../../../components/study-notebook/CreateNotebookForm';
import { Source as SourcePanelType } from '../../../../components/study-notebook/SourcesPanel';
import { ChatMessage } from '../../../../components/study-notebook/ChatPanel';
import { Artifact as ArtifactPanelType, ArtifactType } from '../../../../components/study-notebook/StudioPanel';
import { Notebook, Source, Artifact } from '../../../../src/services/notebook.service';
import { 
  useNotebook, 
  useAddSource, 
  useToggleSource, 
  useRemoveSource,
  useLinkArtifact,
  useUnlinkArtifact,
  useCreateNotebook
} from '../../../../src/hooks/useNotebook';
import { useSessionMessages, useSaveMessage, useClearSessionMessages } from '../../../../src/hooks/useSessions';
import { useGenerateQuiz, useGenerateMindMap, useCreateQuiz } from '../../../../src/hooks/useVisualAids';
import { extractMindMapFromMarkdown } from '../../../../lib/mindmapParser';
import axios from 'axios';
import { showError, showSuccess, showWarning, showInfo, showConfirm } from '../../../../src/lib/alert';

const AI_ENGINE_URL = (process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000').replace(/\/+$/, '');

// Default quiz prompt constant
const DEFAULT_QUIZ_PROMPT = 'Create a practice quiz with multiple choice questions about:';

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

  const extractAnswerFromJson = (text: string): string | null => {
    try {
      const trimmed = text.trim();

      if (trimmed.includes('"answer"')) {
        const answerIndex = trimmed.indexOf('"answer"');
        if (answerIndex > 0) {
          let startIndex = trimmed.lastIndexOf('{', answerIndex);
          if (startIndex >= 0) {
            let braceCount = 0;
            let endIndex = -1;
            for (let i = startIndex; i < trimmed.length; i++) {
              if (trimmed[i] === '{') braceCount++;
              if (trimmed[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  endIndex = i + 1;
                  break;
                }
              }
            }

            if (endIndex > startIndex) {
              const jsonStr = trimmed.substring(startIndex, endIndex);
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.tool === null && parsed.answer) {
                  let result = parsed.answer;
                  result = result.replace(/\n\nFollow-up questions?:[\s\S]*$/i, '');

                  if (parsed.follow_up_questions && Array.isArray(parsed.follow_up_questions) && parsed.follow_up_questions.length > 0) {
                    result += '\n\n📝 **Follow-up questions to deepen your understanding:**';
                    parsed.follow_up_questions.forEach((q: string, i: number) => {
                      result += `\n${i + 1}. ${q}`;
                    });
                  }
                  return result;
                }
              } catch {
                // ignore
              }
            }
          }
        }
      }

      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.tool === null && parsed.answer) {
            let result = parsed.answer;
            result = result.replace(/\n\nFollow-up questions?:[\s\S]*$/i, '');

            if (parsed.follow_up_questions && Array.isArray(parsed.follow_up_questions) && parsed.follow_up_questions.length > 0) {
              result += '\n\n📝 **Follow-up questions to deepen your understanding:**';
              parsed.follow_up_questions.forEach((q: string, i: number) => {
                result += `\n${i + 1}. ${q}`;
              });
            }
            return result;
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const runAssistantStream = async ({ userText, includeUserMessage }: { userText: string; includeUserMessage: boolean }) => {
    if (!notebook || !userText.trim()) return;

    let rafId: number | null = null;

    // Ensure only one stream is active at a time
    if (chatAbortRef.current) {
      try {
        chatAbortRef.current.abort();
      } catch {
        // ignore
      }
      chatAbortRef.current = null;
    }

    if (includeUserMessage) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userText,
        timestamp: new Date().toISOString()
      };
      setLocalMessages((prev) => [...prev, userMessage]);
    }

    setIsChatLoading(true);
    setIsStreaming(true);

    const loadingId = `assistant-${Date.now()}`;
    const loadingMessage: ChatMessage = {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isLoading: true
    };
    setLocalMessages((prev) => [...prev, loadingMessage]);

    try {
      const selectedSourceIds = dedupedSources.filter(s => s.selected).map(s => s._id);

      let authToken = '';
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const { state } = JSON.parse(authStorage);
          authToken = state?.accessToken || '';
        }
      } catch (e) {
        console.debug('Could not read auth token from storage', e);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const abortController = new AbortController();
      chatAbortRef.current = abortController;

      const response = await fetch(`${AI_ENGINE_URL}/ai/sessions/${notebook.aiSessionId}/chat/stream`, {
        method: 'POST',
        headers,
        signal: abortController.signal,
        body: JSON.stringify({
          message: userText,
          session_id: notebook.aiSessionId,
          source_ids: selectedSourceIds
        })
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let sseBuffer = '';

      let rafPending = false;
      let lastRendered = '';
      const scheduleRender = () => {
        if (rafPending) return;
        rafPending = true;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          rafPending = false;
          if (abortController.signal.aborted) return;
          const extracted = extractAnswerFromJson(fullResponse);
          const displayContent = extracted ?? fullResponse;
          if (displayContent === lastRendered) return;
          lastRendered = displayContent;
          setLocalMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === loadingId);
            if (idx === -1) return prev;
            const current = prev[idx];
            if (current.content === displayContent && current.isLoading === false) return prev;
            const next = prev.slice();
            next[idx] = { ...current, content: displayContent, isLoading: false };
            return next;
          });
        });
      };

      if (reader) {
        let sawDoneEvent = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkText = decoder.decode(value, { stream: true });
          sseBuffer += chunkText;

          while (true) {
            const eventSepIndex = sseBuffer.indexOf('\n\n');
            if (eventSepIndex === -1) break;

            const rawEvent = sseBuffer.slice(0, eventSepIndex);
            sseBuffer = sseBuffer.slice(eventSepIndex + 2);
            if (!rawEvent) continue;

            const eventLines = rawEvent.split(/\r?\n/);
            let eventName = '';
            const dataLines: string[] = [];
            for (const line of eventLines) {
              if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                let payload = line.slice(5);
                if (payload.startsWith(' ')) payload = payload.slice(1);
                dataLines.push(payload);
              }
            }

            if (eventName === 'done') {
              const extracted = extractAnswerFromJson(fullResponse);
              if (extracted) {
                fullResponse = extracted;
                scheduleRender();
              }
              sseBuffer = '';
              sawDoneEvent = true;
              break;
            }

            const eventData = dataLines.join('\n');
            if (!eventData || eventData === '[DONE]') continue;

            let appended = eventData;
            try {
              const maybeJson = JSON.parse(eventData);
              if (maybeJson && typeof maybeJson.chunk === 'string') appended = maybeJson.chunk;
            } catch {
              // ignore
            }

            fullResponse += appended;
            scheduleRender();
          }

          if (sawDoneEvent) break;
        }
      }

      scheduleRender();
      setIsStreaming(false);
      setIsChatLoading(false);

      if (chatAbortRef.current === abortController) chatAbortRef.current = null;
    } catch (error) {
      if ((error as any)?.name !== 'AbortError') console.error('Chat error:', error);
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingId
            ? { ...msg, content: '❌ Failed to get response. Please try again.', isLoading: false }
            : msg
        )
      );
      setIsStreaming(false);
      setIsChatLoading(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      chatAbortRef.current = null;
    }
  };

  const handleSendMessage = async (message: string) => {
    await runAssistantStream({ userText: message, includeUserMessage: true });
  };

  const handleRegeneratePrompt = async (messageId: string) => {
    const idx = localMessages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    const msg = localMessages[idx];
    if (msg.role !== 'user') return;

    setLocalMessages((prev) => prev.slice(0, idx + 1));
    await runAssistantStream({ userText: msg.content, includeUserMessage: false });
  };

  const handleEditPrompt = async (messageId: string, newText: string) => {
    const idx = localMessages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    const msg = localMessages[idx];
    if (msg.role !== 'user') return;

    setLocalMessages((prev) => {
      const next = prev.slice(0, idx + 1);
      next[idx] = { ...next[idx], content: newText };
      return next;
    });
    await runAssistantStream({ userText: newText, includeUserMessage: false });
  };

  // Studio Handlers
  const handleGenerateArtifact = async (type: ArtifactType) => {
    if (!notebook) return;

    const selectedSources = notebook.sources.filter(s => s.selected);
    if (selectedSources.length === 0) {
      showWarning('Please select at least one source to generate artifacts.');
      return;
    }

    setIsGenerating(true);

    try {
      const topics = selectedSources
        .map((s) => s.name.replace(/\.(pdf|txt|md)$/i, ''))
        .join(', ');

      if (type === 'course-finder') {
        const lines: string[] = [];
        lines.push('[COURSE_FINDER_REQUEST]');
        lines.push('');
        lines.push(`Find the best online courses about "${topics}" from the internet.`);
        lines.push('');
        lines.push('**CRITICAL: YOU MUST USE WEB_SEARCH TOOL**');
        lines.push(`1. Call the web_search tool with queries such as: "best courses ${topics}", "${topics} online course", or "${topics} tutorial course"`);
        lines.push('2. Do NOT answer from model memory — web_search must be used first.');
        lines.push('');
        lines.push('**EXTRACTION REQUIREMENTS:**');
        lines.push('From the web_search tool results, extract for EACH course (where available):');
        lines.push('- Course title (exact name from the course page)');
        lines.push('- Course URL (direct course page URL)');
        lines.push('- Platform name (Coursera, Udemy, edX, Codecademy, etc.)');
        lines.push('- Rating (format as X.X/5 if available)');
        lines.push('- Price (format as $XX or "Free" if available)');
        lines.push('');
        lines.push('**OUTPUT FORMAT - MANDATORY:**');
        lines.push('Return a JSON object exactly like: {"tool": null, "answer": "<COURSE_LIST>"}');
        lines.push('Where <COURSE_LIST> is the courses each on its own line, formatted as:');
        lines.push('[Course Title](https://course.url) - Platform: X | Rating: X.X/5 | Price: $X');
        lines.push('');
        lines.push('Requirements:');
        lines.push('- Provide 5-8 courses when possible');
        lines.push('- Use real course URLs (not search result pages)');
        lines.push('- One course per line, no extra commentary');
        lines.push('');
        lines.push('Now call web_search tool and format the results exactly as specified.');

        const message = lines.join('\n');

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      }

      if (type === 'flashcards') {
        const message = `Create flashcards for studying: ${topics}

Use the content from the selected sources to create study flashcards.

Output ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "title": "Flashcards: ${topics}",
  "cards": [
    {
      "id": "card-1",
      "front": "What is...",
      "back": "The answer is...",
      "category": "Basics"
    }
  ]
}

Requirements:
- Generate 15-20 flashcards based on source content
- Front: Clear question or concept to test
- Back: Concise answer or explanation (2-3 sentences max)
- Category: Group related cards (Basics, Definitions, Applications, etc.)
- Cover key concepts, definitions, processes, and applications
- Make questions specific and answers clear
Output ONLY the JSON object, nothing else.`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      }

      if (type === 'quiz') {
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

        const message = `###QUIZ_GENERATOR###

${original} ${topics}

Settings:
- Number of questions: ${numQuestions}
- Difficulty: ${difficulty}

Format each question exactly like this:

Question 1: [question text]?
A) [option]
B) [option]
C) [option]
D) [option]
Answer: A
Explanation: [why A is correct]

Rules:
- Strictly follow the format above
- Questions must be relevant to the source material
- Options should be plausible to ensure challenge
- Generate exactly ${numQuestions} questions
- Answer must be single letter (A, B, C, or D)
- Base questions on the selected source material
Output ONLY the questions, no extra text
###END_INSTRUCTION###`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      }

      if (type === 'mindmap') {
        const message = `Create a mind map about: ${topics}

Use the content from the selected sources to build the mind map structure.

Output ONLY a JSON object with this exact structure (no markdown, no code blocks, no extra text):
{
  "nodes": [
    {"id": "root", "label": "${topics}", "level": 0}
  ],
  "edges": []
}

Requirements:
- 10-20 nodes total based on the source content
- 2-3 levels deep showing concept hierarchy
- Labels should be 2-5 words extracted from source material
- Connect related concepts with edges (parent-child relationships)
- Each node id must be unique (use "node-" prefix with numbers)
Output ONLY the JSON object, nothing else.`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      }

      if (type === 'reports') {
        const message = `Generate a comprehensive study report for: ${topics}

Analyze the selected source materials and create a structured report with the following sections:

1. Executive Summary (2-3 paragraphs)
2. Key Concepts (5-10 main concepts with explanations)
3. Learning Objectives (What should be mastered)
4. Detailed Analysis (Deep dive into important topics)
5. Practical Applications (Real-world use cases)
6. Study Recommendations (How to learn this effectively)
7. Assessment Criteria (What to focus on for testing)
8. Additional Resources (Recommended readings/videos)

Format the report in clear markdown with headers, bullet points, and emphasis.
Base all content on the actual source material provided.
Make it comprehensive but readable (aim for 800-1200 words).
Output ONLY the markdown report, nothing else.`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      }

      if (type === 'infographic') {
        const message = `Create an infographic data structure for: ${topics}

Analyze the selected sources and extract key visual elements.

Output ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "title": "Main topic title",
  "subtitle": "Brief description",
  "sections": []
}

Requirements:
- Extract 3-5 sections from source content
- Include real data/statistics when available
- Use relevant emojis for icons
- Timeline events should be chronological if source has historical context
- Comparisons should highlight key differences
Output ONLY the JSON object.`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      }

      showInfo(`${type} generation coming soon!`);
    } catch (error) {
      console.error('Failed to generate artifact:', error);
      showError('Failed to generate artifact. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearChat = async () => {
    if (!notebook?.aiSessionId) return;
    
    showConfirm(
      'Are you sure you want to clear the chat history?',
      async () => {
        try {
          // Clear messages from backend using React Query hook
          await clearSessionMessages.mutateAsync(notebook.aiSessionId);
          
          // Clear local state
          setLocalMessages([]);
          showSuccess('Chat history cleared');
        } catch (error) {
          console.error('Failed to clear chat:', error);
          showError('Failed to clear chat history');
        }
      },
      'Clear Chat History',
      'Clear',
      'Cancel'
    );
  };

  const handleRegenerateResponse = () => {
    if (localMessages.length < 2) return;
    
    for (let i = localMessages.length - 1; i >= 0; i--) {
      if (localMessages[i].role === 'user') {
        setLocalMessages(prev => prev.slice(0, i + 1));
        handleSendMessage(localMessages[i].content);
        break;
      }
    }
  };

  const handleSaveQuizToStudio = async (questions: any[]) => {
    if (!notebook) return;

    try {
      const savedEdits = artifactEdits['action-quiz'] || (selectedArtifact?.data as any) || {};
      const displayCount = savedEdits.numberOfQuestions || questions.length;
      const quizDifficulty = savedEdits.difficulty || 'medium';
      const quizPrompt = savedEdits.prompt || '';

      const quizData = {
        title: `Practice Quiz - ${displayCount} Questions`,
        description: quizPrompt || 'Generated from study session',
        sourceType: 'ai',
        questions: questions.map((q, index) => {
          const options = Array.isArray(q.options) ? q.options : (Array.isArray(q.choices) ? q.choices : []);

          let correctAnswerText = '';
          if (typeof q.correctAnswer === 'number') {
            correctAnswerText = options[q.correctAnswer] ?? '';
          } else if (typeof q.correctAnswer === 'string') {
            if (options.includes(q.correctAnswer)) {
              correctAnswerText = q.correctAnswer;
            } else {
              const letter = q.correctAnswer.trim().toUpperCase();
              if (/^[A-Z]$/.test(letter)) {
                const idx = letter.charCodeAt(0) - 65;
                correctAnswerText = options[idx] ?? q.correctAnswer ?? '';
              } else {
                correctAnswerText = q.answer ?? q.correctAnswer ?? '';
              }
            }
          } else if (q.answer && typeof q.answer === 'string') {
            correctAnswerText = q.answer;
          }

          // Ensure correctAnswerText is not empty
          if (!correctAnswerText && options.length > 0) {
            correctAnswerText = options[0];
          }
          
          return {
            question: q.question || 'Question',
            options: options.length >= 2 ? options : ['Option 1', 'Option 2'],
            correctAnswer: correctAnswerText || (options[0] || 'Option 1'),
            explanation: q.explanation || '',
            difficulty: (q.difficulty as any) || quizDifficulty,
            points: 1,
            order: index
          };
        }),
        settings: {
          shuffleQuestions: false,
          shuffleOptions: false,
          showCorrectAnswers: true,
          allowRetake: true
        }
      };

      const createdQuiz = await createQuiz.mutateAsync(quizData);

      await linkArtifact.mutateAsync({
        type: 'quiz',
        referenceId: createdQuiz._id,
        title: quizData.title,
        data: {
          questions: quizData.questions,
          settings: quizData.settings
        }
      });

      showSuccess('Quiz saved to Studio successfully!');
    } catch (error) {
      console.error('Failed to save quiz:', error);
      showError('Failed to save quiz to Studio');
    }
  };

  const handleSaveMindMapToStudio = async (mindmap: any) => {
    if (!notebook || !('title' in notebook)) return;

    try {
      // First, render the mindmap to get the SVG
      console.log('Rendering mindmap before save...', mindmap);
      const renderMindmapModule = await import('../../../../src/lib/mindmapClient');
      const renderMindmap = renderMindmapModule.default;
      
      let svgBase64 = null;
      let mermaidCode = null;
      
      try {
        const renderResult = await renderMindmap(mindmap, 'both');
        svgBase64 = renderResult.svg_base64;
        mermaidCode = renderResult.mermaid;
        console.log('Mindmap rendered successfully:', { 
          hasSvg: !!svgBase64, 
          hasMermaid: !!mermaidCode,
          svgLength: svgBase64?.length,
          result: renderResult
        });
      } catch (renderError) {
        console.error('Failed to render mindmap:', renderError);
        const errorMsg = renderError instanceof Error ? renderError.message : String(renderError);
        console.error('Render error details:', errorMsg);
        showWarning(`Could not render mindmap image: ${errorMsg}. Saving structure only.`);
      }

      const result = await generateMindMap.mutateAsync({
        topic: `${notebook.title} - Study Notes`,
        maxNodes: mindmap.nodes.length,
        useRag: false,
        save: true,
        subjectId: '',
      } as any);

      const savedId = (result && (result.savedMapId || (result as any)._id || (result as any).data?._id)) || null;

      if (savedId) {
        // Use the rendered SVG we just got, or fallback to result
        const finalSvgBase64 = svgBase64 || (result as any)?.svgBase64 || (result as any)?.data?.svgBase64;
        const finalMermaidCode = mermaidCode || (result as any)?.mermaidCode || (result as any)?.data?.mermaidCode;

        console.log('Saving mindmap with data:', {
          hasNodes: !!mindmap.nodes,
          hasSvg: !!finalSvgBase64,
          hasMermaid: !!finalMermaidCode
        });

        await linkArtifact.mutateAsync({
          type: 'mindmap',
          referenceId: savedId,
          title: `Mind Map - ${notebook.title}`,
          data: {
            nodes: mindmap.nodes,
            edges: mindmap.edges,
            svgBase64: finalSvgBase64,
            mermaidCode: finalMermaidCode
          }
        });
        showSuccess('Mind map saved to Studio successfully!');
      } else {
        showWarning('Mind map generated but could not be saved. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save mindmap:', error);
      showError('Failed to save mindmap to Studio');
    }
  };

  const handleSaveInfographicToStudio = async (infographic: any) => {
    if (!notebook || !('title' in notebook)) return;

    try {
      await linkArtifact.mutateAsync({
        type: 'infographic',
        referenceId: `infographic-${Date.now()}`,
        title: infographic.title || `Infographic - ${notebook.title}`,
        data: infographic,
      });

      showSuccess('Infographic saved to Studio successfully!');
    } catch (error) {
      console.error('Failed to save infographic:', error);
      showError('Failed to save infographic to Studio');
    }
  };

  const handleSaveFlashcardsToStudio = async (flashcardSet: any) => {
    if (!notebook || !('title' in notebook)) return;

    try {
      await linkArtifact.mutateAsync({
        type: 'flashcards',
        referenceId: `flashcards-${Date.now()}`,
        title: flashcardSet.title || `Flashcards - ${notebook.title}`,
        data: flashcardSet,
      });

      showSuccess('Flashcards saved to Studio successfully!');
    } catch (error) {
      console.error('Failed to save flashcards:', error);
      showError('Failed to save flashcards to Studio');
    }
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
      onClearChat={handleClearChat}
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

    {/* Add Text Modal */}
    {addTextModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
        <div className="w-11/12 max-w-2xl bg-white dark:bg-slate-900 rounded-lg p-6 shadow-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">Add Text Source</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Title *</label>
              <input
                type="text"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="Enter a title for this text source"
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Content *</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste or type your text content here..."
                rows={10}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setAddTextModalOpen(false);
                setTextContent('');
                setTextTitle('');
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitText}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
            >
              Add Text
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Add Notes Modal */}
    {addNotesModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
        <div className="w-11/12 max-w-2xl bg-white dark:bg-slate-900 rounded-lg p-6 shadow-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">Add Note</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Note Title</label>
              <input
                type="text"
                value={notesTitle}
                onChange={(e) => setNotesTitle(e.target.value)}
                placeholder="New Note"
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Note Content *</label>
              <textarea
                value={notesContent}
                onChange={(e) => setNotesContent(e.target.value)}
                placeholder="Write your notes here..."
                rows={10}
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setAddNotesModalOpen(false);
                setNotesContent('');
                setNotesTitle('New Note');
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitNotes}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
            >
              Add Note
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Add Website Modal */}
    {addWebsiteModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
        <div className="w-11/12 max-w-xl bg-white dark:bg-slate-900 rounded-lg p-6 shadow-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">Add Website Source</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Website URL *</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Enter a valid URL (e.g., https://example.com). The AI can scrape the content for you.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setAddWebsiteModalOpen(false);
                setWebsiteUrl('');
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitWebsite}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
            >
              Add Website
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Edit Modal (frontend-only) */}
    {editModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
        <div className="w-11/12 max-w-xl bg-white dark:bg-slate-900 rounded-lg p-4 shadow-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-200">Edit Quiz Prompt & Settings</h3>
          <label className="text-xs text-slate-600 dark:text-slate-400">Prompt</label>
          <textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded p-2 mt-1 mb-3 h-28 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
            readOnly={editingArtifactId === 'action-quiz'}
          />

          {editingArtifactId === 'action-quiz' && (
            <div className="mb-3">
              <label className="text-xs text-slate-600 dark:text-slate-400">Preview</label>
              <pre className="whitespace-pre-wrap text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 mt-1 h-32 overflow-auto text-slate-900 dark:text-slate-200">{`${(editPrompt && editPrompt.trim().length > 0 ? editPrompt : DEFAULT_QUIZ_PROMPT)}\n\nRequested number of questions: ${editNumber}\nDifficulty: ${editDifficulty}`}</pre>
            </div>
          )}

          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="text-xs text-slate-600 dark:text-slate-400">Number of Questions</label>
              <input 
                type="number" 
                min={1} 
                max={50} 
                value={editNumber} 
                onChange={(e) => setEditNumber(Number(e.target.value))} 
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600" 
              />
            </div>
            <div className="w-40">
              <label className="text-xs text-slate-600 dark:text-slate-400">Difficulty</label>
              <select 
                value={editDifficulty} 
                onChange={(e) => setEditDifficulty(e.target.value)} 
                className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button 
              onClick={() => setEditModalOpen(false)} 
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={saveEditModal} 
              className="px-3 py-1 bg-indigo-600 dark:bg-indigo-700 text-white rounded hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}