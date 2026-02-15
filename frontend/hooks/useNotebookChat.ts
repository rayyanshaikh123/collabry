import { useState, useRef, useCallback } from 'react';
import type { ChatMessage } from '@/components/study-notebook/ChatPanel';
import { useAuthStore } from '@/lib/stores/auth.store';

interface UseNotebookChatProps {
  notebookId: string;
  sessionId: string;
  localMessages: ChatMessage[];
  setLocalMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setIsStreaming: (value: boolean) => void;
  setIsChatLoading: (value: boolean) => void;
  clearSessionMessages: any; // React Query mutation
  sourceIds?: string[];
  senderName?: string;
  isCollaborative?: boolean;
  onToken?: (token: string, messageId: string) => void;
  onComplete?: (message: string, messageId: string) => void;
  onMessageSent?: (message: ChatMessage) => void;
  onClear?: () => void;
  verifiedMode?: boolean;
}

export function useNotebookChat({
  notebookId,
  sessionId,
  localMessages,
  setLocalMessages,
  setIsStreaming,
  setIsChatLoading,
  clearSessionMessages,
  sourceIds,
  senderName,
  isCollaborative,
  onToken,
  onComplete,
  onMessageSent,
  onClear,
}: UseNotebookChatProps) {
  const chatAbortRef = useRef<AbortController | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [verifiedMode, setVerifiedMode] = useState(false);

  /**
   * Extract answer from JSON response format: {"answer": "..."}
   */
  const extractAnswerFromJson = (text: string): string | null => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.answer === 'string') {
        return parsed.answer;
      }
    } catch {
      // Not JSON
    }
    return null;
  };

  /**
   * Stream AI response using SSE with optimized rendering
   */
  const runAssistantStream = useCallback(
    async ({
      userText,
      includeUserMessage,
      extraPayload,
      userRole = 'user',
    }: {
      userText: string;
      includeUserMessage: boolean;
      extraPayload?: Record<string, any>;
      userRole?: 'user' | 'system';
    }) => {
      if (chatAbortRef.current) {
        chatAbortRef.current.abort();
        chatAbortRef.current = null;
      }

      const abortController = new AbortController();
      chatAbortRef.current = abortController;

      const userMsgId = includeUserMessage ? `user-${Date.now()}` : null;
      const loadingId = `assistant-${Date.now()}`;

      if (includeUserMessage && userMsgId) {
        const newMessage: ChatMessage = {
          id: userMsgId,
          role: userRole,
          content: userText,
          timestamp: new Date().toISOString(),
          senderName
        };
        setLocalMessages((prev) => [...prev, newMessage]);
        if (onMessageSent) onMessageSent(newMessage);
      }

      setLocalMessages((prev) => [...prev, { id: loadingId, role: 'assistant', content: '', isLoading: true, timestamp: new Date().toISOString() }]);
      setIsChatLoading(true);
      setIsStreaming(true);

      let fullResponse = '';
      let rafId: number | null = null;

      const scheduleRender = () => {
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          setLocalMessages((prev) =>
            prev.map((msg) => (msg.id === loadingId ? { ...msg, content: fullResponse, isLoading: false } : msg))
          );
          rafId = null;
        });
      };

      try {
        if (!accessToken) {
          throw new Error('Not authenticated');
        }
        if (!sessionId) {
          throw new Error('Notebook AI session not initialized');
        }

        const apiUrl = (process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000').replace(/\/+$/, '');
        const endpoint = `${apiUrl}/ai/sessions/${sessionId}/chat/stream`;

        // Get CSRF token from cookie
        const getCsrfToken = (): string | null => {
          if (typeof document === 'undefined') return null;
          const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]*)/);
          return match ? decodeURIComponent(match[1]) : null;
        };

        const csrfToken = getCsrfToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        };

        if (csrfToken) {
          headers['x-csrf-token'] = csrfToken;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          credentials: 'include', // Required to send cookies (including CSRF token cookie)
          body: JSON.stringify({
            message: userText,
            session_id: sessionId,
            notebook_id: notebookId,
            source_ids: sourceIds,
            sender_name: senderName,
            is_collaborative: isCollaborative,
            // Best-effort: enable retrieval when available; backend can ignore if unsupported.
            use_rag: true,
            verified_mode: verifiedMode,
            ...(extraPayload || {}),
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(text || `Request failed with status ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader');

        const decoder = new TextDecoder();
        let sseBuffer = '';
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

              // AI Engine stream format: { content: "..." }
              if (maybeJson && typeof maybeJson.content === 'string') {
                appended = maybeJson.content;
              }

              // AI Engine completion marker: { done: true, ... }
              if (maybeJson && maybeJson.done === true) {
                appended = '';
                sawDoneEvent = true;
              }

              // Backward compatible: older server streamed `{ chunk: "..." }`
              if (maybeJson && typeof maybeJson.chunk === 'string') {
                appended = maybeJson.chunk;
              }

              // Current server streams typed payloads
              if (maybeJson && typeof maybeJson.type === 'string') {
                if (maybeJson.type === 'token' && typeof maybeJson.content === 'string') {
                  appended = maybeJson.content;
                } else if (maybeJson.type === 'complete' && maybeJson.verified_data) {
                  // Verified mode complete event with verification data
                  console.log('✅ [Verified mode complete]', maybeJson.verified_data);
                  // Store verified data in message metadata
                  setLocalMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === loadingId
                        ? { ...msg, verifiedData: maybeJson.verified_data }
                        : msg
                    )
                  );
                  appended = '';
                  sawDoneEvent = true;
                } else if (maybeJson.type === 'citations' && maybeJson.citations) {
                  // PHASE 4: Citations event
                  console.log('📚 [Citations]', maybeJson.citations);
                  // Store citations in message metadata
                  setLocalMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === loadingId
                        ? { ...msg, citations: maybeJson.citations }
                        : msg
                    )
                  );
                  appended = '';
                } else if (maybeJson.type === 'thinking') {
                  // Thinking events in verified mode
                  console.log('💭 [Thinking]', maybeJson.content);
                  appended = '';
                } else if (maybeJson.type === 'tool_start') {
                  console.log('🔧 [LLM tool_start]', {
                    tool: maybeJson.tool,
                    inputs: maybeJson.inputs,
                  });
                  appended = '';
                } else if (maybeJson.type === 'tool_end') {
                  console.log('✅ [LLM tool_end]', {
                    tool: maybeJson.tool,
                    output_preview: maybeJson.output,
                    output_truncated: maybeJson.output_truncated,
                    output_len: maybeJson.output_len,
                  });
                  appended = '';
                } else if (maybeJson.type === 'error') {
                  console.error('❌ [LLM error]', maybeJson);
                  appended = typeof maybeJson.message === 'string' ? maybeJson.message : '❌ An error occurred.';
                } else {
                  appended = '';
                }
              }
            } catch {
              // ignore
            }

            if (appended) {
              fullResponse += appended;
              scheduleRender();
              if (onToken) onToken(appended, loadingId);
            }
          }

          if (sawDoneEvent) break;
        }

        scheduleRender();
        if (onComplete) onComplete(fullResponse, loadingId);
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
    },
    [accessToken, sessionId, setLocalMessages, setIsStreaming, setIsChatLoading]
  );

  const handleSendMessage = useCallback(
    async (message: string) => {
      await runAssistantStream({ userText: message, includeUserMessage: true });
    },
    [runAssistantStream]
  );

  /**
   * Structured artifact request:
   * Sends a lightweight descriptor to the backend while the full prompt
   * is constructed and executed server-side.
   */
  const handleArtifactRequest = useCallback(
    async (payload: {
      artifact: 'quiz' | 'flashcards' | 'mindmap' | 'summary';
      topic: string;
      params?: Record<string, any>;
    }) => {
      const { artifact, topic, params } = payload;

      const artifactLabels: Record<typeof artifact, string> = {
        quiz: 'Quiz generation requested',
        flashcards: 'Preparing flashcards',
        mindmap: 'Creating concept map',
        summary: 'Generating summary',
      };

      const displayText = artifactLabels[artifact] || 'Generating study artifact';

      await runAssistantStream({
        userText: displayText,
        includeUserMessage: true,
        userRole: 'system',
        extraPayload: {
          type: 'artifact_request',
          artifact,
          topic,
          artifact_params: params || {},
        },
      });
    },
    [runAssistantStream]
  );

  const handleRegeneratePrompt = useCallback(
    async (messageId: string) => {
      const idx = localMessages.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      const msg = localMessages[idx];
      if (msg.role !== 'user') return;

      setLocalMessages((prev) => prev.slice(0, idx + 1));
      await runAssistantStream({ userText: msg.content, includeUserMessage: false });
    },
    [localMessages, setLocalMessages, runAssistantStream]
  );

  const handleEditPrompt = useCallback(
    async (messageId: string, newText: string) => {
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
    },
    [localMessages, setLocalMessages, runAssistantStream]
  );

  const handleClearChat = useCallback(
    async (showConfirm: any, showSuccess: any, showError: any) => {
      if (!sessionId) return;

      showConfirm(
        'Are you sure you want to clear the chat history?',
        async () => {
          try {
            await clearSessionMessages.mutateAsync(sessionId);
            setLocalMessages([]);
            if (onClear) onClear();
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
    },
    [sessionId, clearSessionMessages, setLocalMessages]
  );

  const handleRegenerateResponse = useCallback(() => {
    if (localMessages.length < 2) return;

    for (let i = localMessages.length - 1; i >= 0; i--) {
      if (localMessages[i].role === 'user') {
        setLocalMessages((prev) => prev.slice(0, i + 1));
        handleSendMessage(localMessages[i].content);
        break;
      }
    }
  }, [localMessages, setLocalMessages, handleSendMessage]);

  return {
    handleSendMessage,
    handleArtifactRequest,
    handleRegeneratePrompt,
    handleEditPrompt,
    handleClearChat,
    handleRegenerateResponse,
    setLocalMessages,
    verifiedMode,
    setVerifiedMode,
  };
}
