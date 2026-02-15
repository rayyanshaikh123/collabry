'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Input } from '../UIElements';
import { ICONS } from '../../constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import CourseCard from './CourseCard';
import QuizCard from './QuizCard';
import MindMapViewer from './MindMapViewer';
import InfographicViewer from './InfographicViewer';
import { extractCoursesFromMarkdown } from '../../lib/courseParser';
import { extractQuizFromMarkdown } from '../../lib/quizParser';
import { extractMindMapFromMarkdown } from '../../lib/mindmapParser';
import { extractInfographicFromMarkdown, containsInfographicData } from '../../lib/infographicParser';
import { extractFlashcardsFromMarkdown, containsFlashcardData } from '../../lib/flashcardParser';
import FlashcardViewer from './FlashcardViewer';
import BoardPickerModal from '../study-board/BoardPickerModal';
import VerifiedResponseView from './VerifiedResponseView';
import VerifiedModeToggle from './VerifiedModeToggle';
import CitationDisplay from './CitationDisplay';
import ArtifactLoadingSkeleton from './ArtifactLoadingSkeleton';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isLoading?: boolean;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  verifiedData?: any; // Verified mode response data
  citations?: Array<{
    id: number;
    source_id: string;
    source_name: string;
    excerpt: string;
    page?: number;
    type?: string;
  }>;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onRegeneratePrompt?: (messageId: string) => void;
  onEditPrompt?: (messageId: string, newText: string) => void;
  onClearChat: () => void;
  onRegenerateResponse: () => void;
  isLoading?: boolean;
  hasSelectedSources: boolean;
  onSaveQuizToStudio?: (questions: any[]) => void;
  onSaveMindMapToStudio?: (mindmap: any) => void;
  onSaveInfographicToStudio?: (infographic: any) => void;
  onSaveFlashcardsToStudio?: (flashcardSet: any) => void;
  onSaveCourseFinderToStudio?: (courses: any[]) => void;
  typingUsers?: string[];
  onTyping?: (isTyping: boolean) => void;
  verifiedMode?: boolean;
  onVerifiedModeChange?: (enabled: boolean) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onRegeneratePrompt,
  onEditPrompt,
  onClearChat,
  onRegenerateResponse,
  isLoading = false,
  hasSelectedSources,
  onSaveQuizToStudio,
  onSaveMindMapToStudio,
  onSaveInfographicToStudio,
  onSaveFlashcardsToStudio,
  onSaveCourseFinderToStudio,
  typingUsers = [],
  onTyping,
  verifiedMode = false,
  onVerifiedModeChange,
}) => {
  const router = useRouter();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [canScrollLeft, setCanScrollLeft] = useState<{ [key: string]: boolean }>({});
  const [canScrollRight, setCanScrollRight] = useState<{ [key: string]: boolean }>({});

  const [isBoardPickerOpen, setIsBoardPickerOpen] = useState(false);
  const [pendingBoardInsert, setPendingBoardInsert] = useState<
    | { kind: 'mindmap'; data: any; title?: string }
    | { kind: 'infographic'; data: any; title?: string }
    | null
  >(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTyping = useRef(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  const openBoardPicker = (payload: NonNullable<typeof pendingBoardInsert>) => {
    setPendingBoardInsert(payload);
    setIsBoardPickerOpen(true);
  };

  const handleSelectBoard = (boardId: string) => {
    if (!pendingBoardInsert) return;
    try {
      sessionStorage.setItem(`board-${boardId}-import`, JSON.stringify(pendingBoardInsert));
    } catch (e) {
      console.error('Failed to store board import payload:', e);
    }
    setIsBoardPickerOpen(false);
    setPendingBoardInsert(null);
    router.push(`/study-board/${boardId}`);
  };

  // PHASE 1: Helper functions for artifact detection
  const detectArtifactType = (content: string): 'mindmap' | 'flashcards' | 'infographic' | 'quiz' | 'general' => {
    if (content.includes('[MINDMAP_GENERATION_REQUEST]') ||
      (content.includes('"nodes"') && content.includes('"edges"'))) {
      return 'mindmap';
    }
    if (content.includes('[FLASHCARDS_GENERATION_REQUEST]') || content.includes('"cards"')) {
      return 'flashcards';
    }
    if (content.includes('[INFOGRAPHIC_GENERATION_REQUEST]') || content.includes('"sections"')) {
      return 'infographic';
    }
    if (content.includes('"questions"') && content.includes('"options"')) {
      return 'quiz';
    }
    return 'general';
  };

  const isArtifactGeneration = (content: string) => {
    return content.includes('[MINDMAP_GENERATION_REQUEST]') ||
      content.includes('[FLASHCARDS_GENERATION_REQUEST]') ||
      content.includes('[INFOGRAPHIC_GENERATION_REQUEST]') ||
      (content.includes('"nodes"') && content.includes('"edges"')) ||
      (content.includes('"cards"') && content.includes('"front"')) ||
      (content.includes('"sections"') && content.length > 100);
  };

  // PHASE 2: Comprehensive cleanup function to remove ALL artifact JSON/markdown
  const cleanMarkdownFromArtifacts = (markdown: string): string => {
    if (!markdown) return '';
    let cleaned = markdown;

    // Remove JSON code blocks Specifically
    cleaned = cleaned.replace(/```json[\s\S]*?```/g, '');

    // Remove standalone JSON objects that contain artifact-specific keys
    // This regex looks for blocks starting with { and ending with } that contain one of our keywords
    // We use a more aggressive approach to catch nested structures
    const artifactKeys = ['"nodes"', '"edges"', '"cards"', '"front"', '"back"', '"sections"', '"title"', '"questions"', '"options"'];

    // First pass: Remove large JSON structures that are obviously artifacts
    // Using greedy match to capture full nested objects if they contain artifact keys
    cleaned = cleaned.replace(/\{[\s\S]+\}/g, (match) => {
      const artifactKeys = ['"nodes"', '"edges"', '"cards"', '"front"', '"back"', '"sections"', '"title"', '"questions"', '"options"'];
      if (artifactKeys.some(key => match.includes(key))) {
        return '';
      }
      return match;
    });

    // Second pass: Remove request markers like [MINDMAP_GENERATION_REQUEST]
    cleaned = cleaned.replace(/\[[A-Z_]+_REQUEST\]\s*/gi, '');

    // Third pass: Remove stray fragments (stray braces, trailing quotes, "conclusion" fields)
    cleaned = cleaned.replace(/"[a-zA-Z0-9_-]+":\s*"[\s\S]*?"\s*\}*/g, '');
    cleaned = cleaned.replace(/\s*[}\]]+\s*$/gm, ''); // Trailing closing braces/brackets

    // Remove extra whitespace and blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();

    // Final sanity check: if the remaining text looks like JSON trash, clear it
    // Check for mostly being symbols, quotes, and braces
    const symbolCount = (cleaned.match(/[{}\[\]",:]/g) || []).length;
    if (cleaned.length > 0 && symbolCount / cleaned.length > 0.3) {
      return '';
    }

    // If nothing meaningful left (very short or just whitespace), clear it
    if (cleaned.length < 15 || cleaned.match(/^[{}\[\]",:\s]*$/)) {
      return '';
    }

    return cleaned;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  const checkScrollButtons = (messageId: string) => {
    const carousel = carouselRefs.current[messageId];
    if (!carousel) return;

    setCanScrollLeft(prev => ({
      ...prev,
      [messageId]: carousel.scrollLeft > 0
    }));
    setCanScrollRight(prev => ({
      ...prev,
      [messageId]: carousel.scrollLeft < carousel.scrollWidth - carousel.clientWidth - 10
    }));
  };

  const scrollCarousel = (messageId: string, direction: 'left' | 'right') => {
    const carousel = carouselRefs.current[messageId];
    if (!carousel) return;

    const scrollAmount = 336; // Card width (320px) + gap (16px)
    const newScrollLeft = direction === 'left'
      ? carousel.scrollLeft - scrollAmount
      : carousel.scrollLeft + scrollAmount;

    carousel.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });

    setTimeout(() => checkScrollButtons(messageId), 300);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Initialize scroll button states for all carousels
    Object.keys(carouselRefs.current).forEach(messageId => {
      if (carouselRefs.current[messageId]) {
        checkScrollButtons(messageId);
      }
    });
  }, [messages]);

  // PHASE 3: Auto-scroll when artifacts render
  React.useLayoutEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Scroll when assistant message completes (not loading)
      if (lastMessage.role === 'assistant' && !lastMessage.isLoading) {
        // Small delay to ensure artifacts are rendered
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
          });
        }, 100);
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      if (onTyping) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        isCurrentlyTyping.current = false;
        onTyping(false);
      }
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingText(message.content);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEdit = (messageId: string) => {
    const next = editingText.trim();
    if (!next) return;
    if (typeof onEditPrompt === 'function') {
      onEditPrompt(messageId, next);
    } else {
      onSendMessage(next);
    }
    cancelEdit();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">AI Chat</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasSelectedSources
              ? 'Ask questions about your sources'
              : 'Add sources to start chatting'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearChat}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <ICONS.trash className="w-4 h-4" />
              <span className="text-xs font-bold">Clear</span>
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {isLoading && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="flex justify-center mb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">
                Initializing AI tutor...
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Setting up your study session
              </p>
            </div>
          </div>
        ) : messages.length === 0 && !hasSelectedSources ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">
                Add a source to get started
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Upload PDFs, add text, or link websites to chat with your AI study buddy
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">👋</div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">
                Ready to help you study!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ask me questions about your sources, request summaries, or explore concepts
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Sender info (only for user messages in collaborative mode) */}
                {message.role === 'user' && message.senderName && (
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      {message.senderName}
                    </span>
                    {message.senderAvatar ? (
                      <div className="w-5 h-5 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 p-0.5 bg-white dark:bg-slate-800">
                        <img src={message.senderAvatar} alt={message.senderName} className="w-full h-full rounded-full object-cover" />
                      </div>
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm ${(() => {
                          const colors = ['bg-rose-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-orange-500'];
                          return colors[message.senderId ? message.senderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length : 0];
                        })()
                          }`}
                      >
                        {message.senderName.charAt(0)}
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`max-w-[80%] break-words overflow-hidden ${message.role === 'user'
                    ? 'bg-indigo-600 dark:bg-indigo-700 text-white rounded-2xl rounded-tr-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm'
                    } px-5 py-3 shadow-sm`}
                >
                  {/* Per-message tools (user prompts + assistant responses) */}
                  <div className={`flex items-center gap-1 mb-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(message.content)}
                      className={`p-1 rounded-lg transition-colors ${message.role === 'user'
                        ? 'hover:bg-white/15 text-white/90'
                        : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      title="Copy"
                      aria-label="Copy"
                    >
                      <ICONS.Copy className="w-4 h-4" />
                    </button>

                    {message.role === 'user' && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(message)}
                          className="p-1 rounded-lg hover:bg-white/15 text-white/90 transition-colors"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <ICONS.Edit className="w-4 h-4" />
                        </button>

                        {typeof onRegeneratePrompt === 'function' && (
                          <button
                            type="button"
                            onClick={() => onRegeneratePrompt(message.id)}
                            className="p-1 rounded-lg hover:bg-white/15 text-white/90 transition-colors"
                            title="Regenerate"
                            aria-label="Regenerate"
                            disabled={isLoading}
                          >
                            <ICONS.refresh className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {message.isLoading ? (
                    // PHASE 1: Show artifact-specific skeleton if generating an artifact
                    isArtifactGeneration(message.content) ? (
                      <ArtifactLoadingSkeleton type={detectArtifactType(message.content)} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Thinking...</span>
                      </div>
                    )
                  ) : message.role === 'user' ? (
                    editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full min-h-[96px] px-4 py-3 bg-white/10 text-white placeholder:text-white/60 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(message.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-700 hover:bg-slate-50"
                          >
                            Run
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )
                  ) : (
                    <>
                      {(() => {
                        // If message content is a JSON payload with a mindmap, render the MindMapViewer
                        try {
                          const parsed = JSON.parse(message.content);
                          if (parsed && parsed.mindmap) {
                            return (
                              <div className="mt-2">
                                <MindMapViewer mindmapJson={parsed.mindmap} format="both" className="w-full" />
                              </div>
                            );
                          }
                        } catch (e) {
                          // not JSON — fall through to markdown parsing
                        }

                        // Only parse courses if the message contains properly formatted course links
                        // OR contains plain text course format with Platform: ... | Rating: ... | Price: ...
                        const hasFormattedCourseLinks = message.content.includes('[') &&
                          message.content.includes('](') &&
                          /\[.*\]\(https?:\/\/.*\)\s*-?\s*Platform:/i.test(message.content);

                        const hasPlainTextCourses = /Platform:\s*[A-Za-z\s]+\s*\|\s*Rating:/i.test(message.content);

                        let courses: any[] = [];
                        let cleanMarkdownAfterCourses = message.content;

                        // Parse if we have either format
                        if (hasFormattedCourseLinks || hasPlainTextCourses) {
                          const result = extractCoursesFromMarkdown(message.content);
                          courses = result.courses;
                          cleanMarkdownAfterCourses = result.cleanMarkdown;

                          // Debug logging
                          if (courses.length > 0) {
                            console.log('✅ Courses parsed successfully:', {
                              courseCount: courses.length
                            });
                          }
                        }

                        const { cleanMarkdown: markdownAfterQuiz, quiz } = extractQuizFromMarkdown(cleanMarkdownAfterCourses);

                        // Used by multiple artifact detectors to infer what the user asked for
                        const currentMessageIndex = messages.findIndex(m => m.id === message.id);
                        const priorUserMessages = currentMessageIndex > 0
                          ? messages.slice(0, currentMessageIndex).filter((m) => m.role === 'user')
                          : [];

                        // Only parse mindmap if (same pattern as infographic/flashcards):
                        // 1. The message contains explicit mindmap JSON structure (nodes/edges or label/children)
                        // 2. AND the immediately preceding user message requested a mindmap
                        let hasMindmapJson = message.content.includes('"nodes"') &&
                          message.content.includes('"edges"');

                        // Only the immediate prior user message counts (same as other artifacts)
                        const lastUserMessage = priorUserMessages.length > 0 ? priorUserMessages[priorUserMessages.length - 1] : null;
                        const isExplicitMindmapRequest = message.content.includes('[MINDMAP_GENERATION_REQUEST]') ||
                          (!!lastUserMessage && (
                            lastUserMessage.content.toLowerCase().includes('mind map') ||
                            lastUserMessage.content.toLowerCase().includes('mindmap') ||
                            lastUserMessage.content.toLowerCase().includes('concept map') ||
                            lastUserMessage.content.includes('[MINDMAP_GENERATION_REQUEST]')
                          ));

                        // Also check if mindmap JSON might be wrapped in answer field of JSON response
                        let contentToParse = markdownAfterQuiz;
                        if (!hasMindmapJson && message.content.includes('"answer"') && message.content.includes('"nodes"')) {
                          try {
                            const jsonMatch1 = message.content.match(/\{"tool":\s*null,\s*"answer":\s*"([^"]*(?:\\.[^"]*)*)"[^}]*\}/);
                            if (jsonMatch1) {
                              const answerContent = jsonMatch1[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
                              if (answerContent.includes('"nodes"') && answerContent.includes('"edges"')) {
                                contentToParse = answerContent;
                                hasMindmapJson = true;
                              }
                            }
                            if (!hasMindmapJson) {
                              const answerMatch = message.content.match(/"answer":\s*"(\{[^"]*"nodes"[^"]*\})"/);
                              if (answerMatch) {
                                const extracted = answerMatch[1].replace(/\\"/g, '"');
                                if (extracted.includes('"nodes"') && extracted.includes('"edges"')) {
                                  contentToParse = extracted;
                                  hasMindmapJson = true;
                                }
                              }
                            }
                          } catch (e) {
                            // Extraction failed
                          }
                        }
                        // Recompute structure flag if we found mindmap in answer field
                        const hasMindmapData = hasMindmapJson ||
                          (message.content.includes('"children"') && message.content.includes('"label"'));

                        let mindmap = null;
                        let cleanMarkdown = markdownAfterQuiz;

                        // Parse mindmap only when BOTH: explicit request AND response has mindmap JSON structure
                        // Be more lenient for assistant messages
                        if (hasMindmapData && (isExplicitMindmapRequest || message.role === 'assistant')) {
                          const result = extractMindMapFromMarkdown(contentToParse);
                          mindmap = result.mindmap;
                          cleanMarkdown = result.cleanMarkdown;
                          // PHASE 2: Apply comprehensive cleanup
                          cleanMarkdown = cleanMarkdownFromArtifacts(cleanMarkdown);
                        }

                        // Check for infographic JSON
                        const isExplicitInfographicRequest = message.content.includes('[INFOGRAPHIC_GENERATION_REQUEST]') ||
                          priorUserMessages.some((m) => m.content.toLowerCase().includes('infographic'));
                        const hasInfographicData = containsInfographicData(message.content);

                        let infographic = null;
                        if (hasInfographicData && (isExplicitInfographicRequest || message.role === 'assistant')) {
                          const result = extractInfographicFromMarkdown(message.content);
                          if (result.success && result.data) {
                            infographic = result.data;
                            console.log('✅ Infographic parsed successfully');

                            // PHASE 2: Apply comprehensive cleanup
                            cleanMarkdown = cleanMarkdownFromArtifacts(cleanMarkdown);
                          }
                        }

                        // Check for flashcard data
                        const isExplicitFlashcardRequest = message.content.includes('[FLASHCARDS_GENERATION_REQUEST]') ||
                          priorUserMessages.some((m) => {
                            const low = m.content.toLowerCase();
                            return low.includes('flashcard') ||
                              low.includes('study cards') ||
                              low.includes('revision cards') ||
                              low.includes('practice cards');
                          });
                        const hasFlashcardData = containsFlashcardData(message.content);

                        let flashcardSet = null;
                        // Be more lenient: if it has high-confidence flashcard data, try parsing anyway
                        // especially for assistant messages where markers might be lost during streaming
                        if (hasFlashcardData && (isExplicitFlashcardRequest || message.role === 'assistant')) {
                          const result = extractFlashcardsFromMarkdown(message.content);
                          if (result.success && result.data) {
                            flashcardSet = result.data;
                            console.log('✅ Flashcards parsed successfully:', flashcardSet.cards.length, 'cards');

                            // PHASE 2: Apply comprehensive cleanup
                            cleanMarkdown = cleanMarkdownFromArtifacts(cleanMarkdown);
                          }
                        }

                        return (
                          <>
                            {/* Verified Mode Response */}
                            {message.role === 'assistant' && message.verifiedData && (
                              <div className="mb-4">
                                <VerifiedResponseView data={message.verifiedData} />
                              </div>
                            )}

                            {/* Render mindmap */}
                            {mindmap && mindmap.nodes && mindmap.nodes.length > 0 && (
                              <div className="mt-5 -mx-5 px-5 py-5 bg-gradient-to-br from-emerald-50 dark:from-emerald-900/30 via-teal-50 dark:via-teal-900/30 to-cyan-50 dark:to-cyan-900/30 rounded-xl">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-emerald-600 dark:bg-emerald-700 rounded-lg flex items-center justify-center shadow-md">
                                      <span className="text-white text-lg">🧠</span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-800 dark:text-slate-200">Mind Map</h4>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                      {mindmap.nodes.length} {mindmap.nodes.length === 1 ? 'Node' : 'Nodes'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {onSaveMindMapToStudio && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSaveMindMapToStudio(mindmap)}
                                        className="flex items-center gap-1"
                                      >
                                        <ICONS.Download className="w-4 h-4" />
                                        <span className="text-xs font-bold">Save to Studio</span>
                                      </Button>
                                    )}

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openBoardPicker({ kind: 'mindmap', data: mindmap, title: 'Mindmap' })}
                                      className="flex items-center gap-1"
                                    >
                                      <ICONS.StudyBoard className="w-4 h-4" />
                                      <span className="text-xs font-bold">Add to Study Board</span>
                                    </Button>
                                  </div>
                                </div>
                                <div className="w-full overflow-auto min-h-[300px] max-h-[500px]">
                                  <MindMapViewer
                                    mindmapJson={mindmap}
                                    format="both"
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Render markdown content */}
                            {cleanMarkdown && (
                              <div className="prose prose-sm max-w-none prose-slate dark:prose-invert prose-headings:font-black prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:my-3 prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-strong:text-slate-800 dark:prose-strong:text-slate-200 prose-ul:my-3 prose-ol:my-3 prose-li:my-1">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkBreaks]}
                                  components={{
                                    p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                    h1: ({ node, ...props }) => <h1 className="mt-4 mb-2 first:mt-0" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="mt-4 mb-2 first:mt-0" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="mt-3 mb-2 first:mt-0" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="my-3 space-y-1" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="my-3 space-y-1" {...props} />,
                                    li: ({ node, ...props }) => <li className="my-1" {...props} />,
                                    blockquote: ({ node, ...props }) => <blockquote className="my-3 border-l-4 border-indigo-400 pl-4 italic" {...props} />,
                                  }}
                                >
                                  {cleanMarkdown}
                                </ReactMarkdown>
                              </div>
                            )}
                            {/* Render infographic */}
                            {infographic && (
                              <div className="mt-5 -mx-5 px-5 py-5 bg-gradient-to-br from-cyan-50 dark:from-cyan-900/30 via-blue-50 dark:via-blue-900/30 to-indigo-50 dark:to-indigo-900/30 rounded-xl">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-600 dark:to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                                      <span className="text-white text-lg">📈</span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-800 dark:text-slate-200">Infographic</h4>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                      Visual Summary
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {onSaveInfographicToStudio && (
                                      <button
                                        onClick={() => onSaveInfographicToStudio(infographic)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
                                      >
                                        <ICONS.download className="w-4 h-4" />
                                        Save to Studio
                                      </button>
                                    )}

                                    <button
                                      onClick={() => openBoardPicker({ kind: 'infographic', data: infographic, title: infographic?.title || 'Infographic' })}
                                      className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                                    >
                                      <ICONS.StudyBoard className="w-4 h-4" />
                                      Add to Study Board
                                    </button>
                                  </div>
                                </div>
                                <InfographicViewer
                                  infographic={infographic}
                                  variant="compact"
                                  maxSections={2}
                                  className="border-2 border-cyan-200 dark:border-cyan-800 shadow-sm"
                                />
                              </div>
                            )}

                            {/* Render flashcards */}
                            {flashcardSet && flashcardSet.cards && flashcardSet.cards.length > 0 && (
                              <div className="mt-5 -mx-5 px-5 py-5 bg-gradient-to-br from-blue-50 dark:from-blue-900/30 via-indigo-50 dark:via-indigo-900/30 to-purple-50 dark:to-purple-900/30 rounded-xl">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-lg flex items-center justify-center shadow-md">
                                      <span className="text-white text-lg">🎴</span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-800 dark:text-slate-200">Flashcards</h4>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                      {flashcardSet.cards.length} {flashcardSet.cards.length === 1 ? 'Card' : 'Cards'}
                                    </span>
                                  </div>
                                  {onSaveFlashcardsToStudio && (
                                    <button
                                      onClick={() => onSaveFlashcardsToStudio(flashcardSet)}
                                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
                                    >
                                      <ICONS.download className="w-4 h-4" />
                                      Save to Studio
                                    </button>
                                  )}
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                                  <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-4 text-center">{flashcardSet.title}</h3>
                                  <FlashcardViewer cards={flashcardSet.cards} />
                                </div>
                              </div>
                            )}

                            {/* Render quiz */}
                            {quiz && quiz.length > 0 && (
                              <div className="mt-5 -mx-5 px-5 py-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="w-8 h-8 bg-indigo-600 dark:bg-indigo-700 rounded-lg flex items-center justify-center shadow-md">
                                    <ICONS.lightbulb className="w-4 h-4 text-white" />
                                  </div>
                                  <h4 className="text-base font-black text-slate-800 dark:text-slate-200">Practice Quiz</h4>
                                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                    {quiz.length} {quiz.length === 1 ? 'Question' : 'Questions'}
                                  </span>
                                </div>
                                <QuizCard
                                  questions={quiz}
                                  onSaveToStudio={onSaveQuizToStudio ? () => onSaveQuizToStudio(quiz) : undefined}
                                />
                              </div>
                            )}

                            {/* Render course cards */}
                            {courses.length > 0 && (
                              <div className="mt-5 -mx-5 px-5 py-5 bg-gradient-to-r from-indigo-50 dark:from-indigo-900/30 via-purple-50 dark:via-purple-900/30 to-pink-50 dark:to-pink-900/30 rounded-xl">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-lg flex items-center justify-center shadow-md">
                                      <ICONS.book className="w-4 h-4 text-white" />
                                    </div>
                                    <h4 className="text-base font-black text-slate-800 dark:text-slate-200">Recommended Courses</h4>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                      {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Save to Studio button */}
                                    {onSaveCourseFinderToStudio && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onSaveCourseFinderToStudio(courses)}
                                        className="flex items-center gap-1"
                                      >
                                        <ICONS.Download className="w-4 h-4" />
                                        <span className="text-xs font-bold">Save to Studio</span>
                                      </Button>
                                    )}

                                    {/* Navigation buttons */}
                                    {courses.length > 1 && (
                                      <>
                                        <button
                                          onClick={() => scrollCarousel(message.id, 'left')}
                                          disabled={!canScrollLeft[message.id]}
                                          className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg border-2 border-indigo-200 dark:border-indigo-700 flex items-center justify-center hover:bg-indigo-600 dark:hover:bg-indigo-700 hover:border-indigo-600 dark:hover:border-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800 disabled:hover:border-indigo-200 dark:disabled:hover:border-indigo-700 transition-all shadow-sm group"
                                        >
                                          <ICONS.ChevronLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
                                        </button>
                                        <button
                                          onClick={() => scrollCarousel(message.id, 'right')}
                                          disabled={!canScrollRight[message.id]}
                                          className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg border-2 border-indigo-200 dark:border-indigo-700 flex items-center justify-center hover:bg-indigo-600 dark:hover:bg-indigo-700 hover:border-indigo-600 dark:hover:border-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800 disabled:hover:border-indigo-200 dark:disabled:hover:border-indigo-700 transition-all shadow-sm group"
                                        >
                                          <ICONS.ChevronRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Carousel container */}
                                <div className="relative">
                                  <div
                                    ref={(el) => {
                                      carouselRefs.current[message.id] = el;
                                    }}
                                    onScroll={() => checkScrollButtons(message.id)}
                                    className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scroll-smooth snap-x snap-mandatory"
                                    style={{ scrollbarColor: 'rgb(165 180 252) rgb(241 245 249)' }}
                                  >
                                    {courses.map((course, idx) => (
                                      <div key={idx} className="snap-start">
                                        <CourseCard course={course} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}

                  {/* Citations Display - Phase 4 */}
                  {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                    <CitationDisplay citations={message.citations} />
                  )}

                  <div className={`text-[10px] font-bold mt-2 ${message.role === 'user' ? 'text-indigo-200 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'} flex items-center gap-1`}>
                    <ICONS.Clock className="w-3 h-3 opacity-60" />
                    {new Date(message.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-6 py-1 bg-slate-50 dark:bg-slate-900 flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
          </div>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            {typingUsers.length === 1
              ? `${typingUsers[0]} is typing...`
              : typingUsers.length === 2
                ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
                : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`}
          </p>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);

                // Handle typing indicator
                if (onTyping) {
                  if (!isCurrentlyTyping.current) {
                    isCurrentlyTyping.current = true;
                    onTyping(true);
                  }

                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    isCurrentlyTyping.current = false;
                    onTyping(false);
                  }, 3000);
                }
              }}
              onKeyPress={handleKeyPress}
              placeholder={
                hasSelectedSources
                  ? 'Ask anything - I can search web, scrape sites, summarize, etc...'
                  : 'Add sources to start chatting...'
              }
              disabled={!hasSelectedSources || isLoading}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 resize-none text-sm"
              rows={3}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!inputText.trim() || !hasSelectedSources || isLoading}
            className="flex-shrink-0 h-[60px] px-6"
          >
            {isLoading ? (
              <ICONS.refresh className="w-5 h-5 animate-spin" />
            ) : (
              <ICONS.send className="w-5 h-5" />
            )}
          </Button>
        </form>

        {/* Verified Mode Toggle */}
        {hasSelectedSources && onVerifiedModeChange && (
          <div className="mt-3">
            <VerifiedModeToggle
              enabled={verifiedMode}
              onChange={onVerifiedModeChange}
            />
          </div>
        )}

        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
          Press Enter to send • Shift + Enter for new line
        </p>
      </div>

      <BoardPickerModal
        isOpen={isBoardPickerOpen}
        onClose={() => {
          setIsBoardPickerOpen(false);
          setPendingBoardInsert(null);
        }}
        onSelectBoard={handleSelectBoard}
        title="Add to Study Board"
      />
    </div>
  );
};

export default ChatPanel;
