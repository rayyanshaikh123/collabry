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
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  onRegenerateResponse,
  isLoading = false,
  hasSelectedSources,
  onSaveQuizToStudio,
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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">AI Chat</h2>
          <p className="text-xs text-slate-500">
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
              <h3 className="text-xl font-black text-slate-800 mb-2">
                Add a source to get started
              </h3>
              <p className="text-sm text-slate-500">
                Upload PDFs, add text, or link websites to chat with your AI study buddy
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">👋</div>
              <h3 className="text-xl font-black text-slate-800 mb-2">
                Ready to help you study!
              </h3>
              <p className="text-sm text-slate-500">
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
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm'
                  } px-5 py-3 shadow-sm`}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-slate-500">Thinking...</span>
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

                        const { cleanMarkdown: markdownAfterCourses, courses } = extractCoursesFromMarkdown(message.content);
                        const { cleanMarkdown, quiz } = extractQuizFromMarkdown(markdownAfterCourses);

                        return (
                          <>
                            {/* Render markdown content */}
                            {cleanMarkdown && (
                              <div className="prose prose-sm max-w-none prose-slate prose-headings:font-black prose-headings:text-slate-800 prose-p:text-slate-700 prose-p:my-3 prose-a:text-indigo-600 prose-strong:text-slate-800 prose-ul:my-3 prose-ol:my-3 prose-li:my-1">
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
                            
                            {/* Render quiz */}
                            {quiz && quiz.length > 0 && (
                              <div className="mt-5 -mx-5 px-5 py-5 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                                    <ICONS.lightbulb className="w-4 h-4 text-white" />
                                  </div>
                                  <h4 className="text-base font-black text-slate-800">Practice Quiz</h4>
                                  <span className="text-xs font-semibold text-slate-500 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200">
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
                              <div className="mt-5 -mx-5 px-5 py-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                                      <ICONS.book className="w-4 h-4 text-white" />
                                    </div>
                                    <h4 className="text-base font-black text-slate-800">Recommended Courses</h4>
                                    <span className="text-xs font-semibold text-slate-500 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200">
                                      {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
                                    </span>
                                  </div>
                                  
                                  {/* Navigation buttons */}
                                  {courses.length > 1 && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => scrollCarousel(message.id, 'left')}
                                        disabled={!canScrollLeft[message.id]}
                                        className="w-8 h-8 bg-white rounded-lg border-2 border-indigo-200 flex items-center justify-center hover:bg-indigo-600 hover:border-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-indigo-200 transition-all shadow-sm group"
                                      >
                                        <ICONS.ChevronLeft className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
                                      </button>
                                      <button
                                        onClick={() => scrollCarousel(message.id, 'right')}
                                        disabled={!canScrollRight[message.id]}
                                        className="w-8 h-8 bg-white rounded-lg border-2 border-indigo-200 flex items-center justify-center hover:bg-indigo-600 hover:border-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-indigo-200 transition-all shadow-sm group"
                                      >
                                        <ICONS.ChevronRight className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
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
                  <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
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
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
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
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-400 resize-none text-sm"
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
        <p className="text-xs text-slate-400 mt-2 text-center">
          Press Enter to send • Shift + Enter for new line
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
