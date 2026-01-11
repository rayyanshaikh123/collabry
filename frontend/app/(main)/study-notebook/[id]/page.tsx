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
import { useSessionMessages, useSaveMessage } from '../../../../src/hooks/useSessions';
import { useGenerateQuiz, useGenerateMindMap, useCreateQuiz } from '../../../../src/hooks/useVisualAids';
import { extractMindMapFromMarkdown } from '../../../../lib/mindmapParser';
import axios from 'axios';
import { showError, showSuccess, showWarning, showInfo, showConfirm } from '../../../../src/lib/alert';

const AI_ENGINE_URL = (process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000').replace(/\/+$/, '');

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
  // Type guard to ensure we always have a Notebook type
  const notebook = (notebookData?.success ? notebookData.data : notebookData) as Notebook | undefined;

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
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactPanelType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Local edits for artifact prompts (frontend-only)
  const [artifactEdits, setArtifactEdits] = useState<Record<string, { prompt?: string; numberOfQuestions?: number; difficulty?: string }>>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editNumber, setEditNumber] = useState<number>(5);
  const [editDifficulty, setEditDifficulty] = useState<string>('medium');
  const DEFAULT_QUIZ_PROMPT = 'Create a practice quiz with multiple choice questions about:';

  // Source modals state
  const [addTextModalOpen, setAddTextModalOpen] = useState(false);
  const [addNotesModalOpen, setAddNotesModalOpen] = useState(false);
  const [addWebsiteModalOpen, setAddWebsiteModalOpen] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [notesTitle, setNotesTitle] = useState('New Note');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Auto-create notebook on mount if needed (only for 'default' route)
  useEffect(() => {
    if (notebookId === 'default' && !isLoadingNotebook && !creationAttempted.current && !createNotebook.isPending) {
      creationAttempted.current = true;
      createNotebook.mutate({ title: 'My Study Notebook' }, {
        onSuccess: (response) => {
          // Handle both wrapped and unwrapped responses
          const newNotebookId = (response as any)?.data?._id || (response as any)?._id;
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
    if (type === 'pdf') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,application/pdf';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const formData = new FormData();
          formData.append('type', type);
          formData.append('file', file);
          formData.append('name', file.name);
          try {
            await addSource.mutateAsync(formData);
            showSuccess('PDF uploaded successfully!');
          } catch (error) {
            console.error('Failed to add PDF:', error);
            showError('Failed to upload PDF. Please try again.');
          }
        }
      };
      input.click();
    } else if (type === 'text') {
      setTextContent('');
      setTextTitle('');
      setAddTextModalOpen(true);
    } else if (type === 'notes') {
      setNotesContent('');
      setNotesTitle('New Note');
      setAddNotesModalOpen(true);
    } else if (type === 'website') {
      setWebsiteUrl('');
      setAddWebsiteModalOpen(true);
    }
  };

  const handleSubmitText = async () => {
    if (!textContent.trim()) {
      showWarning('Please enter some text content.');
      return;
    }
    if (!textTitle.trim()) {
      showWarning('Please enter a title.');
      return;
    }
    const formData = new FormData();
    formData.append('type', 'text');
    formData.append('content', textContent);
    formData.append('name', textTitle);
    try {
      await addSource.mutateAsync(formData);
      setAddTextModalOpen(false);
      setTextContent('');
      setTextTitle('');
      showSuccess('Text source added successfully!');
    } catch (error) {
      console.error('Failed to add text:', error);
      showError('Failed to add text source. Please try again.');
    }
  };

  const handleSubmitNotes = async () => {
    if (!notesContent.trim()) {
      showWarning('Please enter some note content.');
      return;
    }
    const formData = new FormData();
    formData.append('type', 'notes');
    formData.append('content', notesContent);
    formData.append('name', notesTitle || 'New Note');
    try {
      await addSource.mutateAsync(formData);
      setAddNotesModalOpen(false);
      setNotesContent('');
      setNotesTitle('New Note');
      showSuccess('Note added successfully!');
    } catch (error) {
      console.error('Failed to add note:', error);
      showError('Failed to add note. Please try again.');
    }
  };

  const handleSubmitWebsite = async () => {
    if (!websiteUrl.trim()) {
      showWarning('Please enter a website URL.');
      return;
    }
    try {
      // Validate URL
      const url = new URL(websiteUrl);
      const formData = new FormData();
      formData.append('type', 'website');
      formData.append('url', url.toString());
      formData.append('name', url.hostname);
      await addSource.mutateAsync(formData);
      setAddWebsiteModalOpen(false);
      setWebsiteUrl('');
      showSuccess('Website added successfully!');
    } catch (error) {
      if (error instanceof TypeError) {
        showError('Please enter a valid URL (e.g., https://example.com)');
      } else {
        console.error('Failed to add website:', error);
        showError('Failed to add website. Please try again.');
      }
    }
  };

  const handleRemoveSource = (id: string) => {
    showConfirm(
      'Are you sure you want to remove this source?',
      () => removeSource.mutate(id),
      'Remove Source',
      'Remove',
      'Cancel'
    );
  };

  // Chat Handlers
  const handleSendMessage = async (message: string) => {
    if (!notebook?.aiSessionId) {
      showError('Chat session not initialized. Please refresh the page.');
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
      const selectedSources = notebook.sources.filter((s) => s.selected);
      const useRag = selectedSources.length > 0;
      const selectedSourceIds = selectedSources.map((s) => s._id);
      
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
              
              // Try to extract answer from JSON if the full response looks like JSON
              let displayContent = fullResponse;
              
              // Function to extract answer from JSON - more robust
              const extractAnswerFromJson = (text: string): string | null => {
                try {
                  const trimmed = text.trim();
                  
                  // Strategy 1: Find JSON object with answer field using regex
                  if (trimmed.includes('"answer"')) {
                    // Try to find the JSON object - look for opening { before "answer" and closing } after
                    const answerIndex = trimmed.indexOf('"answer"');
                    if (answerIndex > 0) {
                      // Find the opening brace before "answer"
                      let startIndex = trimmed.lastIndexOf('{', answerIndex);
                      if (startIndex >= 0) {
                        // Find the matching closing brace
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
                              // Remove any duplicate follow-up questions from answer text
                              result = result.replace(/\n\nFollow-up questions?:[\s\S]*$/i, '');
                              
                              // Format follow-up questions if present
                              if (parsed.follow_up_questions && Array.isArray(parsed.follow_up_questions) && parsed.follow_up_questions.length > 0) {
                                result += '\n\n📝 **Follow-up questions to deepen your understanding:**';
                                parsed.follow_up_questions.forEach((q: string, i: number) => {
                                  result += `\n${i + 1}. ${q}`;
                                });
                              }
                              return result;
                            }
                          } catch (e) {
                            // JSON parse failed, try next strategy
                          }
                        }
                      }
                    }
                  }
                  
                  // Strategy 2: Try parsing the whole trimmed text if it's a complete JSON object
                  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                      const parsed = JSON.parse(trimmed);
                      if (parsed.tool === null && parsed.answer) {
                        let result = parsed.answer;
                        // Remove any duplicate follow-up questions from answer text
                        result = result.replace(/\n\nFollow-up questions?:[\s\S]*$/i, '');
                        
                        if (parsed.follow_up_questions && Array.isArray(parsed.follow_up_questions) && parsed.follow_up_questions.length > 0) {
                          result += '\n\n📝 **Follow-up questions to deepen your understanding:**';
                          parsed.follow_up_questions.forEach((q: string, i: number) => {
                            result += `\n${i + 1}. ${q}`;
                          });
                        }
                        return result;
                      }
                    } catch (e) {
                      // Parse failed
                    }
                  }
                } catch (e) {
                  // Extraction failed
                }
                return null;
              };
              
              // Try to extract answer from JSON
              const extracted = extractAnswerFromJson(fullResponse);
              if (extracted) {
                displayContent = extracted;
              }
              
              // Update message in real-time
              setLocalMessages((prev) =>
                prev.map((msg) =>
                  msg.id === loadingId
                    ? { ...msg, content: displayContent, isLoading: false }
                    : msg
                )
              );
            } else if (line.startsWith('event: done')) {
              // Stream completed - final JSON extraction
              console.log('Stream done. Full response:', fullResponse);
              
              // Final attempt to extract answer from JSON - robust extraction
              const extractAnswerFromJson = (text: string): string | null => {
                try {
                  const trimmed = text.trim();
                  
                  // Strategy 1: Find JSON object with answer field using brace matching
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
                              // Remove any duplicate follow-up questions from answer text
                              result = result.replace(/\n\nFollow-up questions?:[\s\S]*$/i, '');
                              
                              if (parsed.follow_up_questions && Array.isArray(parsed.follow_up_questions) && parsed.follow_up_questions.length > 0) {
                                result += '\n\n📝 **Follow-up questions to deepen your understanding:**';
                                parsed.follow_up_questions.forEach((q: string, i: number) => {
                                  result += `\n${i + 1}. ${q}`;
                                });
                              }
                              return result;
                            }
                          } catch (e) {
                            // JSON parse failed
                          }
                        }
                      }
                    }
                  }
                  
                  // Strategy 2: Try parsing the whole trimmed text
                  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    try {
                      const parsed = JSON.parse(trimmed);
                      if (parsed.tool === null && parsed.answer) {
                        let result = parsed.answer;
                        // Remove any duplicate follow-up questions from answer text
                        result = result.replace(/\n\nFollow-up questions?:[\s\S]*$/i, '');
                        
                        if (parsed.follow_up_questions && Array.isArray(parsed.follow_up_questions) && parsed.follow_up_questions.length > 0) {
                          result += '\n\n📝 **Follow-up questions to deepen your understanding:**';
                          parsed.follow_up_questions.forEach((q: string, i: number) => {
                            result += `\n${i + 1}. ${q}`;
                          });
                        }
                        return result;
                      }
                    } catch (e) {
                      // Parse failed
                    }
                  }
                } catch (e) {
                  // Extraction failed
                }
                return null;
              };
              
              const extracted = extractAnswerFromJson(fullResponse);
              if (extracted) {
                fullResponse = extracted;
                // Update final message with extracted content
                setLocalMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === loadingId
                      ? { ...msg, content: extracted, isLoading: false }
                      : msg
                  )
                );
              }
              
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
    showConfirm(
      'Are you sure you want to clear the chat history?',
      () => setLocalMessages([]),
      'Clear Chat History',
      'Clear',
      'Cancel'
    );
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
      showWarning('Please select at least one source to generate artifacts.');
      return;
    }

    setIsGenerating(true);

    try {
      if (type === 'course-finder') {
        // Extract topics from selected sources
        const topics = selectedSources
          .map((s) => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        // Simplified prompt with clear output marker
        const message = `###COURSE_FINDER###

Use web_search tool to find online courses about: ${topics}

Search for "best ${topics} courses online" or "${topics} tutorial course"

Output format - each course on one line:
[Course Name](URL) - Platform: X | Rating: X/5 | Price: $X

Example:
[Data Structures Course](https://coursera.org/ds) - Platform: Coursera | Rating: 4.7/5 | Price: Free

Find 5-8 courses. Output ONLY the course list, nothing else.

###END_INSTRUCTION###`;
        
        handleSendMessage(message);
        setIsGenerating(false);
        return;
      } else if (type === 'flashcards') {
        // Generate flashcards from selected sources
        const topics = selectedSources
          .map((s) => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        const message = `Create flashcards for studying: ${topics}

Use the content from the selected sources to create study flashcards.

Output ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "title": "Flashcards: ${topics}",
  "cards": [
    {
      "id": "card-1",
      "front": "What is...?",
      "back": "The answer is...",
      "category": "Basics"
    },
    {
      "id": "card-2",
      "front": "Explain...",
      "back": "Detailed explanation...",
      "category": "Advanced"
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
- Output ONLY the JSON object, nothing else`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      } else if (type === 'quiz') {
        // Extract topics from selected sources
        const topics = selectedSources
          .map((s) => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        // Get user settings
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

        // Simplified prompt with clear markers
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

Question 2: [question text]?
A) [option]
B) [option]
C) [option]
D) [option]
Answer: B
Explanation: [why B is correct]

Rules:
- Generate exactly ${numQuestions} questions
- Answer must be single letter (A, B, C, or D)
- Base questions on the selected source material
- Output ONLY the questions, no extra text

###END_INSTRUCTION###`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      } else if (type === 'mindmap') {
        // Extract topics from selected sources
        const topics = selectedSources
          .map((s) => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        // Simplified prompt with clear JSON output
        const message = `Create a mind map about: ${topics}

Use the content from the selected sources to build the mind map structure.

Output ONLY a JSON object with this exact structure (no markdown, no code blocks, no extra text):
{
  "nodes": [
    {"id": "root", "label": "${topics}", "level": 0},
    {"id": "node-1", "label": "Subtopic 1", "level": 1},
    {"id": "node-2", "label": "Subtopic 2", "level": 1},
    {"id": "node-1a", "label": "Detail 1.1", "level": 2}
  ],
  "edges": [
    {"from": "root", "to": "node-1"},
    {"from": "root", "to": "node-2"},
    {"from": "node-1", "to": "node-1a"}
  ]
}

Requirements:
- 10-20 nodes total based on the source content
- 2-3 levels deep showing concept hierarchy
- Labels should be 2-5 words extracted from source material
- Connect related concepts with edges (parent-child relationships)
- Each node id must be unique (use "node-" prefix with numbers)
- Output ONLY the JSON object, nothing else`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      } else if (type === 'reports') {
        // Generate comprehensive study report
        const topics = selectedSources
          .map((s) => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        const message = `Generate a comprehensive study report for: ${topics}

Analyze the selected source materials and create a structured report with the following sections:

1. **Executive Summary** (2-3 paragraphs)
2. **Key Concepts** (5-10 main concepts with explanations)
3. **Learning Objectives** (What should be mastered)
4. **Detailed Analysis** (Deep dive into important topics)
5. **Practical Applications** (Real-world use cases)
6. **Study Recommendations** (How to learn this effectively)
7. **Assessment Criteria** (What to focus on for testing)
8. **Additional Resources** (Recommended readings/videos)

Format the report in clear markdown with headers, bullet points, and emphasis.
Base all content on the actual source material provided.
Make it comprehensive but readable (aim for 800-1200 words).`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      } else if (type === 'infographic') {
        // Generate infographic data structure
        const topics = selectedSources
          .map((s) => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        const message = `Create an infographic data structure for: ${topics}

Analyze the selected sources and extract key visual elements.

Output ONLY a JSON object with this structure (no markdown, no code blocks):
{
  "title": "Main topic title",
  "subtitle": "Brief description",
  "sections": [
    {
      "id": "section-1",
      "title": "Section Title",
      "icon": "📚",
      "stats": [
        {"label": "Key Stat 1", "value": "70%", "color": "blue"},
        {"label": "Key Stat 2", "value": "30%", "color": "green"}
      ],
      "keyPoints": [
        "Important point 1",
        "Important point 2",
        "Important point 3"
      ]
    }
  ],
  "timeline": [
    {"year": "2020", "event": "Key milestone", "description": "Brief desc"},
    {"year": "2021", "event": "Another event", "description": "Brief desc"}
  ],
  "comparisons": [
    {"category": "Aspect 1", "optionA": "Value A", "optionB": "Value B"},
    {"category": "Aspect 2", "optionA": "Value A", "optionB": "Value B"}
  ],
  "conclusion": "Final takeaway message"
}

Requirements:
- Extract 3-5 sections from source content
- Include real data/statistics when available
- Use relevant emojis for icons
- Timeline events should be chronological if source has historical context
- Comparisons should highlight key differences
- Base everything on actual source material
- Output ONLY the JSON object`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      } else {
        showInfo(`${type} generation coming soon!`);
      }
    } catch (error) {
      console.error('Failed to generate artifact:', error);
      showError('Failed to generate artifact. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuizToStudio = async (questions: any[]) => {
    if (!notebook) return;

    try {
      // First, create the quiz
      // Try to preserve user-edited metadata (number/difficulty/prompt) when saving
      const savedEdits = artifactEdits['action-quiz'] || (selectedArtifact?.data as any) || {};
      const displayCount = savedEdits.numberOfQuestions || questions.length;
      const quizDifficulty = savedEdits.difficulty || 'medium';
      const quizPrompt = savedEdits.prompt || '';

      const quizData = {
        title: `Practice Quiz - ${displayCount} Questions`,
        description: quizPrompt || 'Generated from study session',
        subject: notebook.title || 'Study Notes', // Add required subject field
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

          // Find the index of the correct answer in options
          const correctAnswerIndex = options.findIndex((opt: string) => opt === correctAnswerText);
          
          return {
            question: q.question,
            options,
            correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0, // Use index, default to 0 if not found
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

      showSuccess('Quiz saved to Studio successfully!');
    } catch (error) {
      console.error('Failed to save quiz:', error);
      showError('Failed to save quiz to Studio');
    }
  };

  const handleSaveMindMapToStudio = async (mindmap: any) => {
    if (!notebook || !('title' in notebook)) return;

    try {
      // Generate mindmap using the backend service
      // Note: The backend will create the mindmap structure from the nodes/edges
      const result = await generateMindMap.mutateAsync({
        topic: `${notebook.title} - Study Notes`,
        maxNodes: mindmap.nodes.length,
        useRag: false, // Already generated from RAG context
        save: true, // Save to database
        subjectId: '', // Will be handled by backend if needed
      } as any); // Type assertion needed due to backend API differences

      // The backend should return the saved mindmap with _id
      const savedId = (result && (result.savedMapId || (result as any)._id || (result as any).data?._id)) || null;

      if (savedId) {
        // Link to notebook artifact
        await linkArtifact.mutateAsync({
          type: 'mindmap',
          referenceId: savedId,
          title: `Mind Map - ${notebook.title}`,
        });
        showSuccess('Mind map saved to Studio successfully!');
      } else {
        // Fallback: Try to save directly via API
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
      // Save infographic data directly to notebook artifacts
      await linkArtifact.mutateAsync({
        type: 'infographic',
        referenceId: `infographic-${Date.now()}`, // Generate unique ID
        title: infographic.title || `Infographic - ${notebook.title}`,
        data: infographic, // Store the full infographic data
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
      // Save flashcard set data directly to notebook artifacts
      await linkArtifact.mutateAsync({
        type: 'flashcards',
        referenceId: `flashcards-${Date.now()}`, // Generate unique ID
        title: flashcardSet.title || `Flashcards - ${notebook.title}`,
        data: flashcardSet, // Store the full flashcard set
      });

      showSuccess('Flashcards saved to Studio successfully!');
    } catch (error) {
      console.error('Failed to save flashcards:', error);
      showError('Failed to save flashcards to Studio');
    }
  };

  const openEditModal = (artifactId: string) => {
    const existing = artifactEdits[artifactId] || {};
    // Prefer data embedded in the notebook artifact if available
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
    showSuccess('Saved prompt changes locally (frontend only).');
  };

  const handleDeleteArtifact = (artifactId: string) => {
    if (!notebook) return;

    showConfirm(
      'Are you sure you want to delete this artifact?',
      async () => {
        try {
          // Clear viewer first to avoid React unmount ordering issues
          if (selectedArtifact?.id === artifactId) {
            setSelectedArtifact(null);
          }
          // Fire mutation (don't rely on UI state during awaiting)
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

  const handleSelectArtifact = (id: string) => {
    if (!id || !notebook) {
      setSelectedArtifact(null);
      return;
    }
    
    const artifact = notebook.artifacts.find((a) => a._id === id);
    if (artifact) {
      // Convert service Artifact to component Artifact type
      const artifactType = (artifact.type === 'quiz' || artifact.type === 'mindmap' || artifact.type === 'flashcards') 
        ? artifact.type 
        : 'quiz' as ArtifactType; // Default fallback
      setSelectedArtifact({
        id: artifact._id,
        type: artifactType,
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
      sources={notebook.sources.map((s) => ({
        id: s._id,
        type: s.type as SourcePanelType['type'],
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
          {/* When editing the generator action (action-quiz) show original prompt as readonly
              and display a live preview that reflects number and difficulty. For saved quiz
              artifacts the prompt remains editable. */}
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
