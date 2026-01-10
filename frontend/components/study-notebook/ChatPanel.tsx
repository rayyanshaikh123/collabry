'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input } from '../UIElements';
import { ICONS } from '../../constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import CourseCard from './CourseCard';
import QuizCard from './QuizCard';
import MindMapViewer from './MindMapViewer';
import { extractCoursesFromMarkdown } from '../../lib/courseParser';
import { extractQuizFromMarkdown } from '../../lib/quizParser';
import { extractMindMapFromMarkdown } from '../../lib/mindmapParser';
import { extractInfographicFromMarkdown, containsInfographicData } from '../../lib/infographicParser';
import { extractFlashcardsFromMarkdown, containsFlashcardData } from '../../lib/flashcardParser';
import FlashcardViewer from './FlashcardViewer';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isLoading?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  onRegenerateResponse: () => void;
  isLoading?: boolean;
  hasSelectedSources: boolean;
  onSaveQuizToStudio?: (questions: any[]) => void;
  onSaveMindMapToStudio?: (mindmap: any) => void;
  onSaveInfographicToStudio?: (infographic: any) => void;
  onSaveFlashcardsToStudio?: (flashcardSet: any) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  onRegenerateResponse,
  isLoading = false,
  hasSelectedSources,
  onSaveQuizToStudio,
  onSaveMindMapToStudio,
  onSaveInfographicToStudio,
  onSaveFlashcardsToStudio,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [canScrollLeft, setCanScrollLeft] = useState<{ [key: string]: boolean }>({});
  const [canScrollRight, setCanScrollRight] = useState<{ [key: string]: boolean }>({});

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
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
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerateResponse}
                disabled={isLoading}
                className="flex items-center gap-1"
              >
                <ICONS.refresh className="w-4 h-4" />
                <span className="text-xs font-bold">Regenerate</span>
              </Button>
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
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && !hasSelectedSources ? (
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
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-indigo-600 dark:bg-indigo-700 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-sm'
                  } px-5 py-3 shadow-sm`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Thinking...</span>
                    </div>
                  ) : message.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                        // Must have markdown links with Platform info (not just mentions of "course")
                        const hasFormattedCourseLinks = message.content.includes('[') && 
                                                       message.content.includes('](') && 
                                                       /\[.*\]\(https?:\/\/.*\)\s*-\s*Platform:/i.test(message.content);
                        
                        let courses: any[] = [];
                        let cleanMarkdownAfterCourses = message.content;
                        
                        // Only parse if we have properly formatted course links
                        if (hasFormattedCourseLinks) {
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
                        
                        // Only parse mindmap if:
                        // 1. The message contains mindmap JSON structure (nodes/edges)
                        // 2. AND it was explicitly requested (contains mindmap generation marker or keywords)
                        let hasMindmapJson = message.content.includes('"nodes"') && 
                                            message.content.includes('"edges"');
                        
                        // Check if this is an explicit mindmap request
                        // Look for the marker we add in the prompt, or check if previous user message was about mindmap
                        const currentMessageIndex = messages.findIndex(m => m.id === message.id);
                        const isExplicitMindmapRequest = message.content.includes('[MINDMAP_GENERATION_REQUEST]') ||
                                                        // Check if any previous user message in the conversation was about mindmap
                                                        (currentMessageIndex > 0 && messages.slice(0, currentMessageIndex).some((m) => 
                                                          m.role === 'user' && 
                                                          (m.content.toLowerCase().includes('mind map') || 
                                                           m.content.toLowerCase().includes('mindmap') ||
                                                           m.content.includes('[MINDMAP_GENERATION_REQUEST]'))
                                                        ));
                        
                        // Also check if mindmap JSON might be wrapped in answer field of JSON response
                        let contentToParse = markdownAfterQuiz;
                        if (!hasMindmapJson && message.content.includes('"answer"') && message.content.includes('"nodes"')) {
                          // Try to extract JSON from answer field - handle both escaped and unescaped JSON
                          try {
                            // Pattern 1: {"tool": null, "answer": "{\"nodes\": ...}"}
                            const jsonMatch1 = message.content.match(/\{"tool":\s*null,\s*"answer":\s*"([^"]*(?:\\.[^"]*)*)"[^}]*\}/);
                            if (jsonMatch1) {
                              const answerContent = jsonMatch1[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
                              if (answerContent.includes('"nodes"') && answerContent.includes('"edges"')) {
                                contentToParse = answerContent;
                                hasMindmapJson = true; // Update flag
                              }
                            }
                            
                            // Pattern 2: Try to find JSON object directly in answer field (unescaped)
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
                            // Extraction failed, use original content
                          }
                        }
                        
                        // Also check for hierarchical structure (children format)
                        const hasMindmapStructure = hasMindmapJson || 
                                                  (contentToParse.includes('"children"') && 
                                                   contentToParse.includes('"label"')) ||
                                                  (message.content.includes('"children"') && 
                                                   message.content.includes('"label"'));
                        
                        let mindmap = null;
                        let cleanMarkdown = markdownAfterQuiz;
                        
                        // Only parse if we have structure AND it was explicitly requested
                        if (hasMindmapStructure && isExplicitMindmapRequest) {
                          const result = extractMindMapFromMarkdown(contentToParse);
                          mindmap = result.mindmap;
                          cleanMarkdown = result.cleanMarkdown;
                          
                          // Debug logging
                          if (mindmap) {
                            console.log('✅ Mindmap parsed successfully:', {
                              nodeCount: mindmap.nodes?.length || 0,
                              edgeCount: mindmap.edges?.length || 0
                            });
                          } else {
                            console.log('⚠️ Mindmap JSON detected but parsing failed or rejected');
                          }
                        }

                        // Check for infographic JSON
                        const isExplicitInfographicRequest = message.content.toLowerCase().includes('infographic');
                        const hasInfographicData = containsInfographicData(message.content);
                        
                        let infographic = null;
                        if (hasInfographicData && isExplicitInfographicRequest) {
                          const result = extractInfographicFromMarkdown(message.content);
                          if (result.success && result.data) {
                            infographic = result.data;
                            console.log('✅ Infographic parsed successfully');
                            
                            // Remove JSON from markdown display
                            cleanMarkdown = cleanMarkdown.replace(/\{[\s\S]*"title"[\s\S]*"sections"[\s\S]*\}/g, '').trim();
                          }
                        }

                        // Check for flashcard data
                        const isExplicitFlashcardRequest = message.content.toLowerCase().includes('flashcard');
                        const hasFlashcardData = containsFlashcardData(message.content);
                        
                        let flashcardSet = null;
                        if (hasFlashcardData && isExplicitFlashcardRequest) {
                          const result = extractFlashcardsFromMarkdown(message.content);
                          if (result.success && result.data) {
                            flashcardSet = result.data;
                            console.log('✅ Flashcards parsed successfully:', flashcardSet.cards.length, 'cards');
                            
                            // Remove JSON from markdown display
                            cleanMarkdown = cleanMarkdown.replace(/\{[\s\S]*"cards"[\s\S]*"front"[\s\S]*\}/g, '').trim();
                          }
                        }

                        return (
                          <>
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
                                    p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                    h1: ({node, ...props}) => <h1 className="mt-4 mb-2 first:mt-0" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="mt-4 mb-2 first:mt-0" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="mt-3 mb-2 first:mt-0" {...props} />,
                                    ul: ({node, ...props}) => <ul className="my-3 space-y-1" {...props} />,
                                    ol: ({node, ...props}) => <ol className="my-3 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="my-1" {...props} />,
                                    blockquote: ({node, ...props}) => <blockquote className="my-3 border-l-4 border-indigo-400 pl-4 italic" {...props} />,
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
                                  {onSaveInfographicToStudio && (
                                    <button
                                      onClick={() => onSaveInfographicToStudio(infographic)}
                                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
                                    >
                                      <ICONS.download className="w-4 h-4" />
                                      Save to Studio
                                    </button>
                                  )}
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-cyan-200 dark:border-cyan-800 shadow-sm">
                                  <div className="text-center mb-4">
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200 mb-2">{infographic.title}</h3>
                                    {infographic.subtitle && (
                                      <p className="text-sm text-slate-600 dark:text-slate-400">{infographic.subtitle}</p>
                                    )}
                                  </div>
                                  <div className="space-y-4">
                                    {infographic.sections?.slice(0, 2).map((section: any, idx: number) => (
                                      <div key={idx} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-2xl">{section.icon}</span>
                                          <h4 className="font-bold text-slate-800 dark:text-slate-200">{section.title}</h4>
                                        </div>
                                        {section.keyPoints?.slice(0, 3).map((point: string, pidx: number) => (
                                          <p key={pidx} className="text-sm text-slate-600 dark:text-slate-400 ml-8">• {point}</p>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4 italic">
                                    Click "Save to Studio" to view full interactive infographic
                                  </p>
                                </div>
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
                                  <FlashcardViewer cards={flashcardSet.cards.slice(0, 3)} />
                                  <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4 italic">
                                    Preview showing first 3 cards. Click "Save to Studio" to study all {flashcardSet.cards.length} cards.
                                  </p>
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
                                  
                                  {/* Navigation buttons */}
                                  {courses.length > 1 && (
                                    <div className="flex items-center gap-2">
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
                                    </div>
                                  )}
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
                  <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'}`}>
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

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
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
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
          Press Enter to send • Shift + Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
