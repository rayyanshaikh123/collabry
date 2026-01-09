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
import { extractMindMapFromMarkdown } from '../../../../lib/mindmapParser';
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

        // Build strict prompt for course finder - MUST use web_search tool and format correctly
        const message = `[COURSE_FINDER_REQUEST]

Find the best online courses about "${topics}" from the internet.

**CRITICAL: YOU MUST USE WEB_SEARCH TOOL**
1. Call the web_search tool with query: "best courses ${topics}" or "${topics} online course"
2. Do NOT skip this step - you MUST use the tool to find courses
3. After getting search results, extract course information and format it

**EXTRACTION REQUIREMENTS:**
From the web_search tool results, extract for EACH course:
- Course title (exact name from the course page)
- Course URL (direct link to the course page, not search result page)
- Platform name (Coursera, Udemy, edX, Khan Academy, Codecademy, etc.)
- Rating (if available in search results, format as X.X/5)
- Price (if available, format as $XX or "Free")

**OUTPUT FORMAT - CRITICAL:**
You MUST output courses in this EXACT format. Each course on its own line:

[Course Title](https://course-url.com) - Platform: PlatformName | Rating: X.X/5 | Price: $XX or Free

**REQUIRED OUTPUT EXAMPLE:**
Output ONLY the course list (no explanations, no intro text, no other content):

[Data Structures and Algorithms](https://www.coursera.org/learn/data-structures) - Platform: Coursera | Rating: 4.7/5 | Price: Free
[Arrays and Linked Lists Masterclass](https://www.udemy.com/course/arrays-course) - Platform: Udemy | Rating: 4.8/5 | Price: $49
[Introduction to Computer Science](https://www.edx.org/course/cs50) - Platform: edX | Rating: 4.9/5 | Price: Free
[Learn C Programming](https://www.codecademy.com/learn/c) - Platform: Codecademy | Rating: 4.6/5 | Price: Free
[Complete Python Bootcamp](https://www.udemy.com/python-bootcamp) - Platform: Udemy | Rating: 4.8/5 | Price: $89

**ABSOLUTE REQUIREMENTS:**
1. Call web_search tool FIRST - this is MANDATORY
2. Extract at least 5-10 courses from the search results
3. Each course must be formatted as: [Title](URL) - Platform: X | Rating: X.X/5 | Price: $X or Free
4. Use markdown link format: [Title](URL)
5. One course per line - no blank lines between courses
6. Include Platform, Rating (if available), and Price (if available) on the same line
7. Use real course URLs from the search results (not search result pages)
8. Output ONLY the course list - no explanations, no "Here are courses:", no introductory text, no closing remarks
9. Do NOT output search result snippets - only formatted course links
10. If rating or price is not available, omit that part but keep the format: [Title](URL) - Platform: X

**OUTPUT FORMAT:**
Return a JSON response: {"tool": null, "answer": "PUT_COURSE_LIST_HERE"}

Where PUT_COURSE_LIST_HERE is the formatted course list (one course per line) with no additional text.

Now call web_search tool and format the results exactly as specified.`;
        
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
        // CRITICAL: Use strict format that parser can reliably extract
        const message = `${original} ${topics}

**CRITICAL FORMATTING REQUIREMENTS - YOU MUST FOLLOW THIS EXACT FORMAT:**

Generate exactly ${numQuestions} multiple-choice questions. Each question MUST follow this EXACT format:

Question 1: [Your question text here ending with a question mark?]
A) [First option]
B) [Second option]
C) [Third option]
D) [Fourth option]
Answer: [A or B or C or D - single letter only]
Explanation: [Brief explanation of why this answer is correct]

Question 2: [Your question text here ending with a question mark?]
A) [First option]
B) [Second option]
C) [Third option]
D) [Fourth option]
Answer: [A or B or C or D - single letter only]
Explanation: [Brief explanation of why this answer is correct]

[Continue for all ${numQuestions} questions...]

**RULES:**
1. Start each question with "Question N:" where N is the question number (1, 2, 3, etc.)
2. Each question must end with a question mark (?)
3. Options must be labeled A), B), C), D) with closing parenthesis
4. Answer line must be exactly "Answer: [A/B/C/D]" - single letter only, no extra text
5. Explanation line must start with "Explanation:"
6. Difficulty level: ${difficulty}
7. DO NOT add any introductory text, greetings, or closing remarks
8. DO NOT use conversational language - output ONLY the questions in the format above
9. Test understanding of key concepts from the material

Output ONLY the questions in the format specified above. Do not include any other text.`;

        handleSendMessage(message);
        setIsGenerating(false);
        return;
      } else if (type === 'mindmap') {
        // Extract topics from selected sources
        const topics = selectedSources
          .map(s => s.name.replace(/\.(pdf|txt|md)$/i, ''))
          .join(', ');

        // Calculate adaptive size - medium size with minimum 10 nodes
        const sourceCount = selectedSources.length;
        const minNodes = 10;
        const maxNodes = Math.max(minNodes, 10 + sourceCount * 3); // Minimum 10, scales with sources
        const maxDepth = sourceCount > 1 ? 3 : 2; // 2-3 levels deep

        // Build strict prompt for mindmap generation - extract REAL content from sources
        // Add marker to identify this as mindmap generation request
        const message = `[MINDMAP_GENERATION_REQUEST]

Create a mind map from the source documents about "${topics}".

**STEP 1: READ THE RETRIEVED CONTEXT**
In your prompt above, find the section "📚 RETRIEVED CONTEXT FROM USER'S DOCUMENTS". This contains the actual text from the source documents. Read this section carefully.

**STEP 2: EXTRACT INFORMATION**
From the retrieved context, extract:
- Main topic: The primary subject (use exact name/title from context, 2-5 words)
- 4-6 main subtopics: Major sections or categories (2-4 words each, from context)
- 2-3 concepts per subtopic: Specific terms or details (2-4 words each, from context)

**STEP 3: CREATE MIND MAP JSON**
Create a JSON object with ${minNodes}-${maxNodes} nodes across ${maxDepth} levels.

**OUTPUT FORMAT:**
Return a JSON response with this structure:
{"tool": null, "answer": "PUT_THE_MINDMAP_JSON_HERE"}

Where PUT_THE_MINDMAP_JSON_HERE is replaced with the actual mind map JSON object:

{
  "nodes": [
    {"id": "root", "label": "Main Topic From Context", "level": 0},
    {"id": "node1", "label": "Subtopic From Context", "level": 1},
    {"id": "node2", "label": "Another Subtopic", "level": 1},
    {"id": "node3", "label": "Concept From Context", "level": 2},
    {"id": "node4", "label": "Another Concept", "level": 2}
  ],
  "edges": [
    {"from": "root", "to": "node1"},
    {"from": "root", "to": "node2"},
    {"from": "node1", "to": "node3"},
    {"from": "node1", "to": "node4"}
  ]
}

**CRITICAL REQUIREMENTS:**
- "Main Topic From Context" must be the REAL main topic from retrieved context (2-5 words)
- "Subtopic From Context", "Another Subtopic" must be REAL subtopics from the documents (2-4 words each)
- "Concept From Context", "Another Concept" must be ACTUAL concepts from the documents (2-4 words each)
- Every label MUST use exact terminology from the retrieved context
- Create ${minNodes}-${maxNodes} nodes total, ${maxDepth} levels deep
- Labels: 2-4 words each, using real terms from documents
- FORBIDDEN placeholders: "MainTopic", "Subtopic1", "Concept1", "MainTopicName", "Root"
- The mindmap JSON must be placed in the "answer" field as a JSON string (escape quotes properly)
- Output ONLY the JSON response object - no markdown code blocks, no explanations

Read the retrieved context and create the mind map JSON with real content.`;

        // Send message to AI with RAG context
        handleSendMessage(message);
        setIsGenerating(false);
        return;
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
        alert('Mind map saved to Studio successfully!');
      } else {
        // Fallback: Try to save directly via API
        alert('Mind map generated but could not be saved. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save mindmap:', error);
      alert('Failed to save mindmap to Studio');
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
      onSaveMindMapToStudio={handleSaveMindMapToStudio}
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
