'use client';

import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Card, Button, Badge, Input } from '../components/UIElements';
import { ICONS } from '../constants';
import { useAIChat, useSummarize, useGenerateQA, useGenerateMindMap, useAIHealth } from '@/hooks/useAI';
import { useAuthStore } from '@/lib/stores/auth.store';
import ReactMarkdown from 'react-markdown';
import { useSessions, useCreateSession, useSessionMessages, useSaveMessage, useDeleteSession } from '@/hooks/useSessions';
import type { Message as ChatMessage } from '@/lib/services/sessions.service';
import AlertModal from '../components/AlertModal';
import { useAlert } from '@/hooks/useAlert';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
}

interface QuizQuestion {
  question: string;
  answer: string;
  options?: string[];
  explanation?: string;
  difficulty?: string;
  isRevealed?: boolean;
}

type AIMode = 'chat' | 'summarize' | 'qa' | 'mindmap';

const StudyBuddyNew: React.FC = () => {
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { alertState, showAlert, hideAlert } = useAlert();
  
  // AI Hooks
  const { mutate: sendChat, isPending: isChatPending } = useAIChat();
  const { mutate: summarize, isPending: isSummarizePending } = useSummarize();
  const { mutate: generateQA, isPending: isQAPending } = useGenerateQA();
  const { mutate: generateMindMap, isPending: isMindMapPending } = useGenerateMindMap();
  const { data: aiHealth } = useAIHealth();

  // Local State
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // MongoDB Sessions Hooks
  const { data: sessionsData, isLoading: isLoadingSessions, refetch: refetchSessions } = useSessions();
  const createSession = useCreateSession();
  const { data: sessionMessages, isLoading: isLoadingMessages } = useSessionMessages(activeSessionId);
  const saveMessage = useSaveMessage();
  const deleteSession = useDeleteSession();

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [aiMode, setAIMode] = useState<AIMode>('chat');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showRateLimitWarning, setShowRateLimitWarning] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false); // Flag to prevent message reload during streaming
  const [uploadedFile, setUploadedFile] = useState<File | null>(null); // For file uploads
  const [showAttachMenu, setShowAttachMenu] = useState(false); // For + icon menu
  const [useRAG, setUseRAG] = useState(false); // Enable RAG for all modes
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]); // Store generated quiz questions

  // Transform sessions data
  const sessions = React.useMemo(() => {
    if (!sessionsData?.sessions) return [];
    return sessionsData.sessions.map(s => ({
      id: s.id,
      title: s.title,
      lastMessage: s.last_message || 'Start chatting...',
      timestamp: new Date(s.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      messageCount: s.message_count
    }));
  }, [sessionsData]);

  // Load messages from MongoDB when session changes OR when messages are fetched
  useEffect(() => {
    // Don't reload messages if we're currently streaming
    if (isStreaming) {
      console.log('⏸️ [useEffect] Skipping message reload - streaming in progress');
      return;
    }
    
    if (sessionMessages && activeSessionId) {
      console.log('📥 [useEffect] Loading messages from backend:', sessionMessages.length);
      setLocalMessages(sessionMessages);
    } else if (activeSessionId && !isLoadingMessages) {
      // If session is active but no messages, set empty array
      console.log('📥 [useEffect] No messages for session, setting empty array');
      setLocalMessages([]);
    }
  }, [activeSessionId, sessionMessages, isLoadingMessages, isStreaming]); // Added isStreaming dependency

  // Auto-select first session when loaded
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      console.log('🎯 [useEffect] Auto-selecting first session:', sessions[0].id);
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Check rate limit
  useEffect(() => {
    if (sessionsData?.limit_reached) {
      setShowRateLimitWarning(true);
    }
  }, [sessionsData]);

  // Close attach menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showAttachMenu && !target.closest('.attach-menu-container')) {
        setShowAttachMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

  // Debug: Log user and sessions data
  useEffect(() => {
    console.log('👤 [StudyBuddy] User:', user ? user.email : 'Not logged in');
    console.log('📊 [StudyBuddy] Sessions data:', sessionsData);
    console.log('🔄 [StudyBuddy] Loading sessions:', isLoadingSessions);
  }, [user, sessionsData, isLoadingSessions]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const addMessage = async (sender: 'user' | 'ai' | 'system', text: string, isLoading = false) => {
    // Generate unique timestamp by adding microseconds
    const now = Date.now();
    const uniqueId = Math.floor(Math.random() * 10000);
    const timestamp = new Date(now + uniqueId).toISOString();
    
    console.log('💬 [addMessage] Adding message:', { sender, text: text.substring(0, 50), isLoading, activeSessionId });
    
    const newMessage: ChatMessage = {
      role: sender === 'user' ? 'user' : 'assistant',
      content: text,
      timestamp,
      isLoading,
    };
    
    setLocalMessages(prev => {
      const updated = [...prev, newMessage];
      console.log('💬 [addMessage] Local messages updated:', updated.length);
      return updated;
    });
    
    // Don't save from here - we'll save separately in handleSendMessage
    console.log('⏭️ [addMessage] Message added to UI only');
    
    return timestamp; // Use timestamp as ID
  };

  const updateMessage = (messageTimestamp: string, text: string, isLoading = false) => {
    setLocalMessages(prev => {
      const updated = prev.map(msg => 
        msg.timestamp === messageTimestamp ? { ...msg, content: text, isLoading } : msg
      );
      return updated;
    });
  };

  // Stream message using Server-Sent Events
  const streamMessage = async (messageTimestamp: string, userMessage: string) => {
    console.log('🌊 [streamMessage] Starting SSE stream');
    setIsStreaming(true); // Prevent message reload during streaming
    
    if (!activeSessionId) {
      console.error('❌ No active session');
      updateMessage(messageTimestamp, '❌ No active session', false);
      setIsStreaming(false);
      return;
    }
    
    let fullResponse = '';
    let streamComplete = false;
    
    try {
      // Get auth token
      const authStorage = localStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        token = state?.accessToken || '';
      }

      const AI_ENGINE_URL = (process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const url = new URL(`/ai/sessions/${activeSessionId}/chat/stream`, AI_ENGINE_URL);
      
      // Use fetch with ReadableStream for SSE
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: activeSessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      // Keep "Thinking..." visible until first data arrives
      let firstChunkReceived = false;

      // Use effect-based rendering for smooth updates
      const processStream = async () => {
        while (!streamComplete) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ [streamMessage] Stream done');
            streamComplete = true;
            break;
          }
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data && data.trim()) {
                // Clear "Thinking..." on first actual data
                if (!firstChunkReceived) {
                  console.log('📥 [streamMessage] First chunk received, clearing loader');
                  firstChunkReceived = true;
                  updateMessage(messageTimestamp, '', false);
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                fullResponse += data;
                // Force synchronous update with flushSync and small delay
                flushSync(() => {
                  updateMessage(messageTimestamp, fullResponse, false);
                });
                // Reduced delay for faster streaming (1ms instead of 10ms)
                await new Promise(resolve => setTimeout(resolve, 1));
              }
            } else if (line.startsWith('event: done')) {
              console.log('✅ [streamMessage] Stream complete event');
              streamComplete = true;
              // Extract full response from event data if provided
              const eventData = line.substring(12); // "event: done\ndata: "
              if (eventData && eventData.trim()) {
                fullResponse = eventData.trim();
              }
            }
          }
        }
        
        // Final update to ensure everything is displayed
        console.log(`✅ [streamMessage] Final response length: ${fullResponse.length}`);
        flushSync(() => {
          updateMessage(messageTimestamp, fullResponse, false);
        });
        
        // Save to backend after a delay (let UI settle first)
        if (fullResponse && activeSessionId) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
          console.log('💾 [streamMessage] Saving AI response to backend...');
          try {
            await saveMessage.mutateAsync({ 
              sessionId: activeSessionId, 
              message: {
                role: 'assistant',
                content: fullResponse,
                timestamp: messageTimestamp
              }
            });
            console.log('✅ [streamMessage] AI response saved to backend');
          } catch (error) {
            console.error('❌ [streamMessage] Failed to save AI response:', error);
          }
        }
      };
      
      await processStream();

      console.log('✅ [streamMessage] Complete');

    } catch (error) {
      console.error('❌ [streamMessage] Error:', error);
      updateMessage(messageTimestamp, '❌ Streaming failed. Please try again.', false);
    } finally {
      // Re-enable message loading after streaming completes
      setIsStreaming(false);
      console.log('🔓 [streamMessage] Streaming complete, message reload enabled');
    }
  };

  // Stream summarization using Server-Sent Events
  const streamSummarize = async (messageTimestamp: string, textToSummarize: string) => {
    console.log('📝 [streamSummarize] Starting SSE stream for summarization');
    console.log('📝 [streamSummarize] Text length:', textToSummarize.length);
    setIsStreaming(true);
    
    let fullResponse = '';
    let streamComplete = false;
    
    try {
      // Get auth token
      const authStorage = localStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        token = state?.accessToken || '';
      }

      const AI_ENGINE_URL = (process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000').replace(/\/+$/, '');
      const url = new URL('/ai/summarize/stream', AI_ENGINE_URL);
      console.log('📝 [streamSummarize] Calling URL:', url.toString());
      
      // Use fetch with ReadableStream for SSE
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: textToSummarize,
          style: 'concise'  // Can be made configurable
        })
      });

      console.log('📝 [streamSummarize] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let firstChunkReceived = false;

      const processStream = async () => {
        while (!streamComplete) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ [streamSummarize] Stream done');
            streamComplete = true;
            break;
          }
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data && data.trim()) {
                if (!firstChunkReceived) {
                  console.log('📥 [streamSummarize] First chunk received');
                  firstChunkReceived = true;
                  updateMessage(messageTimestamp, '📝 **Summary:**\n\n', false);
                  await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                fullResponse += data;
                flushSync(() => {
                  updateMessage(messageTimestamp, `📝 **Summary:**\n\n${fullResponse}`, false);
                });
                // Reduced delay for faster streaming (1ms instead of 10ms)
                await new Promise(resolve => setTimeout(resolve, 1));
              }
            } else if (line.startsWith('event: done')) {
              console.log('✅ [streamSummarize] Stream complete event');
              streamComplete = true;
            }
          }
        }
        
        console.log(`✅ [streamSummarize] Final summary length: ${fullResponse.length}`);
        flushSync(() => {
          updateMessage(messageTimestamp, `📝 **Summary:**\n\n${fullResponse}`, false);
        });
        
        // Save to backend after a delay
        if (fullResponse && activeSessionId) {
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('💾 [streamSummarize] Saving summary to backend...');
          try {
            await saveMessage.mutateAsync({ 
              sessionId: activeSessionId, 
              message: {
                role: 'assistant',
                content: `📝 **Summary:**\n\n${fullResponse}`,
                timestamp: messageTimestamp
              }
            });
            console.log('✅ [streamSummarize] Summary saved to backend');
          } catch (error) {
            console.error('❌ [streamSummarize] Failed to save summary:', error);
          }
        }
      };
      
      await processStream();
      console.log('✅ [streamSummarize] Complete');

    } catch (error) {
      console.error('❌ [streamSummarize] Error:', error);
      updateMessage(messageTimestamp, '❌ Summarization failed. Please try again.', false);
    } finally {
      setIsStreaming(false);
      console.log('🔓 [streamSummarize] Streaming complete');
    }
  };

  // Generate Quiz Questions from content
  const generateQuiz = async (messageTimestamp: string, content: string, file?: File) => {
    console.log('❓ [generateQuiz] Starting quiz generation');
    console.log('❓ [generateQuiz] Content length:', content.length);
    if (file) console.log('❓ [generateQuiz] File:', file.name);
    setIsStreaming(true);
    
    const questions: QuizQuestion[] = [];
    
    try {
      const authStorage = localStorage.getItem('auth-storage');
      let token = '';
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        token = state?.accessToken || '';
      }

      const AI_ENGINE_URL = (process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000').replace(/\/+$/, '');
      let url: string;
      let requestBody: any;
      let headers: any = {
        'Authorization': `Bearer ${token}`
      };

      if (file) {
        // Use file upload endpoint for quiz generation
        url = `${AI_ENGINE_URL}/ai/qa/generate/file`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('num_questions', '5');
        formData.append('difficulty', 'medium');
        formData.append('include_options', 'true');
        requestBody = formData;
      } else {
        // Use streaming endpoint for quiz generation
        url = `${AI_ENGINE_URL}/ai/qa/generate/stream`;
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify({
          text: content,
          num_questions: 5,
          difficulty: 'medium',
          include_options: true
        });
      }

      console.log('❓ [generateQuiz] Calling URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: requestBody
      });

      console.log('❓ [generateQuiz] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Quiz generation failed: ${response.status}`);
      }

      if (file) {
        // For file upload, parse JSON response directly
        const data = await response.json();
        if (data.questions) {
          questions.push(...data.questions.map((q: any) => ({
            ...q,
            isRevealed: false
          })));
        }
      } else {
        // For streaming, use SSE to get questions one by one
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No reader available');
        }

        let streamComplete = false;
        let firstQuestionReceived = false;

        while (!streamComplete) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ [generateQuiz] Stream done');
            streamComplete = true;
            break;
          }
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data && data.trim()) {
                try {
                  const questionData = JSON.parse(data);
                  if (!firstQuestionReceived) {
                    console.log('📥 [generateQuiz] First question received');
                    firstQuestionReceived = true;
                    updateMessage(messageTimestamp, `❓ **Quiz Generated!**\n\nGenerating questions...`, false);
                  }
                  
                  questions.push({
                    ...questionData,
                    isRevealed: false
                  });
                  
                  console.log(`📥 [generateQuiz] Question ${questions.length} received`);
                  updateMessage(messageTimestamp, `❓ **Quiz Generated!**\n\n${questions.length} questions created. See below:`, false);
                  
                } catch (e) {
                  console.warn('Failed to parse question data:', e);
                }
              }
            } else if (line.startsWith('event: done')) {
              console.log('✅ [generateQuiz] Stream complete event');
              streamComplete = true;
            } else if (line.startsWith('event: error')) {
              console.error('❌ [generateQuiz] Error event received');
              streamComplete = true;
            }
          }
        }
      }
      
      console.log(`✅ [generateQuiz] Generated ${questions.length} questions`);
      
      // Store questions in state
      setQuizQuestions(questions);
      
      // Update message with final count
      flushSync(() => {
        updateMessage(messageTimestamp, `❓ **Quiz Generated!**\n\n${questions.length} questions created. Test yourself below! 🎯`, false);
      });
      
      // Save to backend
      if (questions.length > 0 && activeSessionId) {
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('💾 [generateQuiz] Saving quiz to backend...');
        try {
          await saveMessage.mutateAsync({ 
            sessionId: activeSessionId, 
            message: {
              role: 'assistant',
              content: `❓ **Quiz Generated!**\n\n${questions.length} questions created. Test yourself below! 🎯`,
              timestamp: messageTimestamp
            }
          });
          console.log('✅ [generateQuiz] Quiz saved to backend');
        } catch (error) {
          console.error('❌ [generateQuiz] Failed to save quiz:', error);
        }
      }

    } catch (error) {
      console.error('❌ [generateQuiz] Error:', error);
      updateMessage(messageTimestamp, '❌ Quiz generation failed. Please try again.', false);
      setQuizQuestions([]);
    } finally {
      setIsStreaming(false);
      console.log('🔓 [generateQuiz] Generation complete');
    }
  };

  const handleSendMessage = async () => {
    console.log('📤 [handleSendMessage] Starting', { inputText, user: !!user, activeSessionId });

    // Prevent re-entrant sends: if we're already streaming or an AI request
    // is pending, ignore additional send attempts. This avoids rapid state
    // updates that can trigger an infinite update loop in dev mode.
    if (isStreaming || isAnyPending) {
      console.warn('⚠️ [handleSendMessage] Send suppressed - streaming or request pending');
      return;
    }

    if (!inputText.trim() || !user || !activeSessionId) {
      console.warn('⚠️ [handleSendMessage] Validation failed', { 
        hasInput: !!inputText.trim(), 
        hasUser: !!user, 
        hasSession: !!activeSessionId 
      });
      return;
    }

    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message to UI
    const userTimestamp = new Date().toISOString();
    console.log('💬 [handleSendMessage] Adding user message to UI');
    await addMessage('user', userMessage);
    
    // Save user message to backend
    try {
      console.log('💾 [handleSendMessage] Saving user message to backend');
      await saveMessage.mutateAsync({ 
        sessionId: activeSessionId, 
        message: {
          role: 'user',
          content: userMessage,
          timestamp: userTimestamp
        }
      });
      console.log('✅ [handleSendMessage] User message saved');
    } catch (error) {
      console.error('❌ Failed to save user message:', error);
    }

    // Add loading message and start streaming immediately
    console.log('⏳ [handleSendMessage] Adding thinking loader');
    const loadingTimestamp = await addMessage('ai', 'Thinking...', true);
    console.log('🚀 [handleSendMessage] Starting stream with timestamp:', loadingTimestamp);

    // Handle different AI modes
    switch (aiMode) {
      case 'chat':
        console.log('💭 [handleSendMessage] Calling streamMessage');
        // Use streaming instead of regular chat
        await streamMessage(loadingTimestamp, userMessage);
        console.log('✅ [handleSendMessage] Stream complete');
        break;

      case 'summarize':
        console.log('📝 [handleSendMessage] Calling streamSummarize');
        await streamSummarize(loadingTimestamp, userMessage);
        console.log('✅ [handleSendMessage] Summarize stream complete');
        break;

      case 'qa':
        console.log('❓ [handleSendMessage] Calling generateQuiz');
        await generateQuiz(loadingTimestamp, userMessage, uploadedFile || undefined);
        console.log('✅ [handleSendMessage] Quiz generation complete');
        break;

      case 'mindmap':
        generateMindMap(
          { text: userMessage, options: { max_nodes: 10 } },
          {
            onSuccess: (response: any) => {
              const mindmap = response.mindmap || response.result || 'Mind map generated!';
              updateMessage(loadingTimestamp, `🧠 **Mind Map:**\n\n${typeof mindmap === 'string' ? mindmap : JSON.stringify(mindmap, null, 2)}`, false);
            },
            onError: (error: any) => {
              updateMessage(loadingTimestamp, `❌ Error: ${error.message}`, false);
            },
          }
        );
        break;
    }
  };

  const createNewSession = async () => {
    console.log('🆕 [StudyBuddy] Creating new session...');
    console.log('🆕 [StudyBuddy] Limit reached?', sessionsData?.limit_reached);
    
    if (sessionsData?.limit_reached) {
      console.warn('⚠️ [StudyBuddy] Rate limit reached, showing warning');
      setShowRateLimitWarning(true);
      return;
    }
    
    try {
      console.log('🆕 [StudyBuddy] Calling createSession mutation...');
      const newSession = await createSession.mutateAsync('New Chat Session');
      console.log('✅ [StudyBuddy] Session created:', newSession);
      setActiveSessionId(newSession.id);
      setLocalMessages([]);
      await refetchSessions();
      console.log('✅ [StudyBuddy] Sessions refetched');
    } catch (error: any) {
      console.error('❌ [StudyBuddy] Failed to create session:', error);
      console.error('❌ [StudyBuddy] Error details:', error.response?.data);
      if (error.response?.status === 403) {
        setShowRateLimitWarning(true);
      }
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Delete this session? This cannot be undone.')) {
      try {
        await deleteSession.mutateAsync(sessionId);
        if (activeSessionId === sessionId) {
          setActiveSessionId(sessions[0]?.id || '');
        }
        await refetchSessions();
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const getModeIcon = (mode: AIMode) => {
    switch (mode) {
      case 'chat': return '💬';
      case 'summarize': return '📝';
      case 'qa': return '❓';
      case 'mindmap': return '🧠';
    }
  };

  const getModeLabel = (mode: AIMode) => {
    switch (mode) {
      case 'chat': return 'Chat';
      case 'summarize': return 'Summarize';
      case 'qa': return 'Generate Q&A';
      case 'mindmap': return 'Mind Map';
    }
  };

  const isAnyPending = isChatPending || isSummarizePending || isQAPending || isMindMapPending;

  // If user is not logged in, show message
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <Card className="max-w-md p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Authentication Required</h2>
          <p className="text-slate-600">Please log in to use Study Buddy</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 -m-4 md:-m-8 bg-slate-50 overflow-hidden">
      {/* Session Management Sidebar */}
      <div className="w-full md:w-80 bg-white border-r-2 border-slate-100 flex flex-col h-full">
        {/* Rate Limit Warning */}
        {showRateLimitWarning && (
          <div className="p-4 bg-amber-50 border-b-2 border-amber-200">
            <div className="flex items-start gap-2">
              <div className="text-amber-500 text-lg mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-700 mb-1">Session Limit Reached</p>
                <p className="text-[10px] text-amber-600">
                  Free users can have {sessionsData?.max_sessions || 3} active sessions. Delete an old session to create a new one, or upgrade to premium for unlimited sessions.
                </p>
                <button
                  onClick={() => setShowRateLimitWarning(false)}
                  className="text-[10px] font-bold text-amber-600 underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-6 border-b-2 border-slate-50">
          <Button 
            onClick={createNewSession}
            variant="primary" 
            disabled={sessionsData?.limit_reached || createSession.isPending}
            className="w-full gap-2 rounded-2xl py-4 shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {createSession.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <ICONS.Plus size={18} strokeWidth={3} />
                New Session
              </>
            )}
          </Button>
          {sessionsData?.limit_reached && (
            <p className="text-[9px] text-center mt-2 text-amber-600 font-bold">
              {sessionsData.total}/{sessionsData.max_sessions} sessions used
            </p>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4 px-2">
            Recent Chats ({sessions.length})
            {isLoadingSessions && ' • Loading...'}
          </p>
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm font-bold text-slate-400">No sessions yet</p>
              <p className="text-xs text-slate-300 mt-1">Create your first session to start chatting!</p>
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className={`relative group rounded-2xl transition-all ${
                  activeSessionId === session.id 
                    ? 'bg-indigo-50 border-2 border-indigo-200 shadow-sm' 
                    : 'hover:bg-slate-50 border-2 border-transparent'
                }`}
              >
                <button
                  onClick={() => setActiveSessionId(session.id)}
                  className="w-full text-left p-4 pr-12"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-black truncate flex-1 ${activeSessionId === session.id ? 'text-indigo-600' : 'text-slate-800'}`}>
                      {session.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold ml-2 shrink-0">{session.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate font-medium">
                    {session.lastMessage}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="text-[10px]">{session.messageCount} msgs</Badge>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-rose-100 rounded-lg"
                  title="Delete session"
                >
                  <ICONS.Trash size={16} className="text-rose-500" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t-2 border-slate-50">
          {/* AI Health Status */}
          <Card className={`mb-4 p-3 rounded-2xl border-2 ${
            aiHealth?.status === 'healthy' 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-rose-50 border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${aiHealth?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              <p className={`text-xs font-bold ${aiHealth?.status === 'healthy' ? 'text-emerald-700' : 'text-rose-700'}`}>
                AI Engine {aiHealth?.status === 'healthy' ? 'Online' : 'Offline'}
              </p>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-none p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md">
                <ICONS.Sparkles size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-indigo-600">AI-Powered Learning</p>
                <p className="text-[10px] font-bold text-indigo-400 uppercase">Port 8000 • FastAPI</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        {/* Chat Header */}
        <div className="p-6 border-b-2 border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-4 border-white">
                🤖
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${aiHealth?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'} border-2 border-white rounded-full`}></div>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 leading-none">Study Buddy</h3>
              <p className={`text-xs font-bold uppercase tracking-tight mt-1 ${aiHealth?.status === 'healthy' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {aiHealth?.status === 'healthy' ? 'Online • Ready to Help' : 'Offline • Check AI Engine'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* AI Mode Selector */}
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl"
                onClick={() => setShowModeSelector(!showModeSelector)}
              >
                <span className="text-lg">{getModeIcon(aiMode)}</span>
              </Button>
              
              {showModeSelector && (
                <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-lg border-2 border-slate-100 p-2 min-w-[180px] z-50">
                  {(['chat', 'summarize', 'qa', 'mindmap'] as AIMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => {
                        setAIMode(mode);
                        setShowModeSelector(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                        aiMode === mode 
                          ? 'bg-indigo-50 text-indigo-600 font-bold' 
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-lg">{getModeIcon(mode)}</span>
                      <span className="text-sm">{getModeLabel(mode)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="rounded-xl"><ICONS.Menu size={20}/></Button>
          </div>
        </div>

        {/* Current Mode Indicator */}
        <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{getModeIcon(aiMode)}</span>
            <span className="text-sm font-bold text-slate-700">Mode: {getModeLabel(aiMode)}</span>
            {useRAG && (
              <Badge className="text-[10px] bg-emerald-100 text-emerald-600 border border-emerald-200">
                🔗 RAG Active
              </Badge>
            )}
            {uploadedFile && (
              <Badge className="text-[10px] bg-indigo-100 text-indigo-600 border border-indigo-200">
                📄 {uploadedFile.name}
              </Badge>
            )}
            {!uploadedFile && !useRAG && aiMode !== 'chat' && (
              <Badge className="ml-2 text-[10px] bg-indigo-100 text-indigo-600">
                {aiMode === 'summarize' && 'Paste text to summarize'}
                {aiMode === 'qa' && 'Ask questions or upload a file'}
                {aiMode === 'mindmap' && 'Paste topic to create mind map'}
              </Badge>
            )}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-50/30">
          {localMessages.map((message, idx) => (
            <div 
              key={message.timestamp || idx} 
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className="shrink-0 mt-1">
                {message.role === 'assistant' ? (
                  <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-xl shadow-md border-2 border-white">🤖</div>
                ) : message.role === 'system' ? (
                  <div className="w-10 h-10 bg-slate-300 rounded-xl flex items-center justify-center text-xl shadow-md border-2 border-white">ℹ️</div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center text-white font-black text-xl border-2 border-white shadow-md">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className={`max-w-[75%] space-y-1 ${message.role === 'user' ? 'items-end' : ''}`}>
                <div className={`p-5 rounded-[2rem] shadow-sm font-medium text-sm leading-relaxed border-2 ${
                  message.role === 'assistant' 
                    ? 'bg-white text-slate-800 rounded-tl-none border-slate-100' 
                    : message.role === 'system'
                    ? 'bg-slate-100 text-slate-600 rounded-tl-none border-slate-200'
                    : 'bg-indigo-500 text-white rounded-tr-none border-indigo-600'
                }`}>
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      <span className="text-slate-500">{message.content}</span>
                    </div>
                  ) : message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown 
                        components={{
                          p: ({node, ...props}) => <p className="mb-2" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2" {...props} />,
                          code: ({node, inline, ...props}: any) => 
                            inline ? 
                              <code className="bg-slate-700 text-amber-300 px-1 rounded" {...props} /> : 
                              <code className="block bg-slate-700 text-amber-300 p-2 rounded my-2" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase px-2">
                  {new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {/* Quiz Cards - Show after messages when quiz is generated */}
          {quizQuestions.length > 0 && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="text-2xl">🎯</div>
                <h3 className="text-lg font-bold text-slate-800">Test Yourself</h3>
                <Badge className="bg-indigo-100 text-indigo-600">{quizQuestions.length} Questions</Badge>
              </div>
              
              {quizQuestions.map((question, idx) => (
                <Card key={idx} className="p-6 bg-white border-2 border-indigo-100 shadow-lg hover:shadow-xl transition-all">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Badge className="bg-indigo-500 text-white shrink-0">Q{idx + 1}</Badge>
                      <p className="font-bold text-slate-800 flex-1">{question.question}</p>
                    </div>
                    
                    {question.options && question.options.length > 0 && (
                      <div className="space-y-2 pl-10">
                        {question.options.map((option, optIdx) => (
                          <div 
                            key={optIdx}
                            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer border border-slate-200"
                          >
                            <span className="text-sm text-slate-700">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.isRevealed ? (
                      <div className="space-y-3 pl-10">
                        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
                          <p className="text-xs font-bold text-emerald-600 uppercase mb-1">✓ Correct Answer</p>
                          <p className="font-bold text-emerald-800">{question.answer}</p>
                        </div>
                        
                        {question.explanation && (
                          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                            <p className="text-xs font-bold text-blue-600 uppercase mb-1">💡 Explanation</p>
                            <p className="text-sm text-blue-800">{question.explanation}</p>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const updated = [...quizQuestions];
                              updated[idx].isRevealed = false;
                              setQuizQuestions(updated);
                            }}
                            className="text-xs"
                          >
                            Hide Answer
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 pl-10">
                        <Button
                          size="sm"
                          onClick={() => {
                            const updated = [...quizQuestions];
                            updated[idx].isRevealed = true;
                            setQuizQuestions(updated);
                          }}
                          className="bg-indigo-500 hover:bg-indigo-600"
                        >
                          Show Answer
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-4 border-t border-slate-100 pl-10">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
                        }}
                      >
                        <ICONS.Trash size={14} className="mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-indigo-600 hover:bg-indigo-50"
                        onClick={() => {
                          // TODO: Add to visual aids
                          showAlert({
                            type: 'info',
                            title: 'Coming Soon',
                            message: 'Add to Visual Aids feature coming soon!'
                          });
                        }}
                      >
                        <ICONS.Plus size={14} className="mr-1" />
                        Add to Visual Aids
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              
              <Button
                variant="outline"
                onClick={() => setQuizQuestions([])}
                className="w-full text-red-600 hover:bg-red-50"
              >
                Clear All Questions
              </Button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t-2 border-slate-50">
          <div className="max-w-4xl mx-auto">
            {/* Hidden file input */}
            <input
              type="file"
              id="file-upload-input"
              accept=".pdf,.txt,.md"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 10 * 1024 * 1024) {
                    showAlert({
                      type: 'warning',
                      title: 'File Too Large',
                      message: 'File too large! Maximum size is 10MB'
                    });
                    e.target.value = '';
                    return;
                  }
                  setUploadedFile(file);
                  setShowAttachMenu(false);
                }
              }}
              className="hidden"
            />

            {/* File preview badge */}
            {uploadedFile && (
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl shadow-sm">
                  <span className="text-lg">📄</span>
                  <span className="text-sm font-semibold text-indigo-700">{uploadedFile.name}</span>
                  <span className="text-xs text-indigo-600">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="ml-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {/* RAG Toggle */}
                <button
                  onClick={() => setUseRAG(!useRAG)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    useRAG 
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' 
                      : 'bg-slate-100 text-slate-600 border-2 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-base">{useRAG ? '🔗' : '📚'}</span>
                  <span>RAG {useRAG ? 'On' : 'Off'}</span>
                </button>
              </div>
            )}
            
            <div className="relative">
              <Input 
                placeholder={
                  uploadedFile
                    ? `${getModeLabel(aiMode)} for ${uploadedFile.name}...`
                    : `${getModeLabel(aiMode)}... (${aiHealth?.status === 'healthy' ? 'AI Ready' : 'AI Offline'})`
                }
                className="rounded-[2.5rem] py-5 pl-16 pr-24 text-base border-2 focus:ring-8 shadow-inner bg-slate-50"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                disabled={isAnyPending || !user || aiHealth?.status !== 'healthy'}
              />
              
              {/* Left side - Attach Menu (+ icon) */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 attach-menu-container">
                <div className="relative">
                  <Button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={isAnyPending || !user}
                    className="w-12 h-12 rounded-full p-0 flex items-center justify-center bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 shadow-sm disabled:opacity-50 transition-all"
                    title="Attach file or use RAG"
                  >
                    <svg 
                      className={`w-5 h-5 text-slate-600 transition-transform ${showAttachMenu ? 'rotate-45' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2.5} 
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </Button>
                  
                  {/* Attach Menu Popup */}
                  {showAttachMenu && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border-2 border-slate-100 p-2 min-w-[280px] z-50">
                      <div className="p-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Attachments & Options</p>
                      </div>
                      
                      {/* File Upload Option */}
                      <button
                        onClick={() => {
                          document.getElementById('file-upload-input')?.click();
                        }}
                        className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-lg">
                          📎
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-700">Upload File</p>
                          <p className="text-xs text-slate-500">PDF, TXT, MD (max 10MB)</p>
                        </div>
                      </button>
                      
                      {/* RAG Toggle Option */}
                      <button
                        onClick={() => {
                          setUseRAG(!useRAG);
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                          useRAG ? 'bg-emerald-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          useRAG ? 'bg-emerald-200' : 'bg-slate-100'
                        }`}>
                          {useRAG ? '🔗' : '📚'}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-semibold ${useRAG ? 'text-emerald-700' : 'text-slate-700'}`}>
                            Use RAG {useRAG ? '(Active)' : '(Inactive)'}
                          </p>
                          <p className="text-xs text-slate-500">Search your documents</p>
                        </div>
                      </button>
                      
                      {/* Mode Switcher */}
                      <div className="pt-2 mt-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-3 mb-2">Mode</p>
                        {(['chat', 'summarize', 'qa', 'mindmap'] as AIMode[]).map(mode => (
                          <button
                            key={mode}
                            onClick={() => {
                              setAIMode(mode);
                              setShowAttachMenu(false);
                            }}
                            className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                              aiMode === mode 
                                ? 'bg-indigo-50 text-indigo-600' 
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="text-lg">{getModeIcon(mode)}</span>
                            <span className="text-sm font-medium">{getModeLabel(mode)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Send Button */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                <Button 
                  onClick={handleSendMessage}
                  disabled={isAnyPending || !inputText.trim() || !user || aiHealth?.status !== 'healthy'}
                  className="w-12 h-12 rounded-full p-0 flex items-center justify-center shadow-indigo-200 disabled:opacity-50"
                >
                  {isAnyPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ICONS.Share size={20} className="rotate-[-45deg] mr-0.5 mt-0.5" strokeWidth={3} />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4">
            {!user 
              ? '⚠️ Please log in to use Study Buddy'
              : aiHealth?.status !== 'healthy'
              ? '⚠️ AI Engine offline - Start it on port 8000'
              : 'Study Buddy uses AI powered by Ollama. Always verify important facts!'
            }
          </p>
        </div>
      </div>
      
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        confirmText={alertState.confirmText}
      />
    </div>
  );
};

export default StudyBuddyNew;
