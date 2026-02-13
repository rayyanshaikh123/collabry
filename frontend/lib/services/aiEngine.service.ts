/**
 * AI Engine Service
 * Direct connection to FastAPI AI Engine (port 8000)
 */

import axios, { AxiosInstance } from 'axios';

const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';

class AIEngineService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: AI_ENGINE_URL.replace(/\/+$/, ''), // Remove trailing slashes
      timeout: 60000, // 60 seconds for AI operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - attach JWT token from Zustand in-memory state
    this.client.interceptors.request.use(
      (config) => {
        // Lazy import to avoid circular dependency
        const { useAuthStore } = require('../stores/auth.store');
        const token = useAuthStore.getState().accessToken;
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // If data is FormData, remove Content-Type to let browser set it
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        let errorMessage = 'AI request failed';

        if (error.response) {
          // Server responded with error status
          errorMessage = error.response.data?.detail
            || error.response.data?.message
            || error.response.data?.error
            || `Server error: ${error.response.status}`;
        } else if (error.request) {
          // Request made but no response received
          errorMessage = 'AI Engine not responding. Please check if it is running on port 8000.';
        } else if (error.message) {
          // Error in request setup
          errorMessage = error.message;
        }

        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  /**
   * Chat with AI
   */
  async chat(message: string, userId: string, conversationId?: string, notebookId?: string, sourceIds?: string[]) {
    const payload = {
      message,
      session_id: conversationId,
      notebook_id: notebookId,
      source_ids: sourceIds,
      stream: false
    };
    console.log('📤 Sending chat request:', payload);
    return this.client.post(`/ai/sessions/${conversationId}/chat`, payload);
  }

  /**
   * Streaming chat with AI
   */
  async chatStream(message: string, userId: string, conversationId: string, notebookId?: string, sourceIds?: string[]) {
    return this.client.post(`/ai/sessions/${conversationId}/chat/stream`, {
      message,
      session_id: conversationId,
      notebook_id: notebookId,
      source_ids: sourceIds,
      stream: true
    });
  }

  /**
   * Summarize text
   */
  async summarize(text: string, userId: string, options?: { max_length?: number; style?: string }) {
    return this.client.post('/ai/summarize', {
      text,
      user_id: userId,
      ...options,
    });
  }

  /**
   * Streaming summarization
   */
  async summarizeStream(text: string, userId: string, options?: { max_length?: number; style?: string }) {
    return this.client.post('/ai/summarize/stream', {
      text,
      ...options,
    });
  }

  /**
   * Generate Q&A from text
   */
  async generateQA(text: string, userId: string, options?: { num_questions?: number }) {
    return this.client.post('/ai/qa/generate', {
      text,
      user_id: userId,
      ...options,
    });
  }

  /**
   * Question answering with RAG
   */
  async questionAnswer(question: string, userId: string, options?: { use_rag?: boolean; context?: string; top_k?: number }) {
    return this.client.post('/ai/qa', {
      question,
      user_id: userId,
      use_rag: options?.use_rag !== false,
      context: options?.context,
      top_k: options?.top_k || 3,
    });
  }

  /**
   * Streaming QA with RAG
   */
  async questionAnswerStream(question: string, userId: string, options?: { use_rag?: boolean; context?: string; top_k?: number }) {
    return this.client.post('/ai/qa/stream', {
      question,
      use_rag: options?.use_rag !== false,
      context: options?.context,
      top_k: options?.top_k || 3,
    });
  }

  /**
   * QA with file upload
   */
  async questionAnswerWithFile(question: string, file: File, use_rag: boolean = false) {
    const formData = new FormData();
    formData.append('question', question);
    formData.append('file', file);
    formData.append('use_rag', String(use_rag));

    return this.client.post('/ai/qa/file', formData);
  }

  /**
   * Generate quiz questions from text
   */
  async generateQuiz(text: string, options?: { num_questions?: number; difficulty?: string; include_options?: boolean }) {
    return this.client.post('/ai/qa/generate', {
      text,
      num_questions: options?.num_questions || 5,
      difficulty: options?.difficulty || 'medium',
      include_options: options?.include_options || false,
    });
  }

  /**
   * Generate quiz questions with streaming
   */
  async generateQuizStream(text: string, options?: { num_questions?: number; difficulty?: string; include_options?: boolean }) {
    return this.client.post('/ai/qa/generate/stream', {
      text,
      num_questions: options?.num_questions || 5,
      difficulty: options?.difficulty || 'medium',
      include_options: options?.include_options || false,
    }, {
      responseType: 'stream'
    });
  }

  /**
   * Generate quiz from uploaded file
   */
  async generateQuizFromFile(file: File, options?: { num_questions?: number; difficulty?: string; include_options?: boolean }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('num_questions', String(options?.num_questions || 5));
    formData.append('difficulty', options?.difficulty || 'medium');
    formData.append('include_options', String(options?.include_options || false));

    return this.client.post('/ai/qa/generate/file', formData);
  }

  /**
   * Generate mind map
   */
  async generateMindMap(text: string, userId: string, options?: { max_nodes?: number }) {
    return this.client.post('/ai/mindmap/generate', {
      text,
      user_id: userId,
      ...options,
    });
  }

  /**
   * Ingest document for RAG
   */
  async ingestDocument(
    content: string,
    userId: string,
    metadata?: {
      title?: string;
      source?: string;
      [key: string]: any;
    }
  ) {
    return this.client.post('/ai/ingest', {
      content,
      user_id: userId,
      metadata: metadata || {},
    });
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(userId: string, conversationId?: string) {
    return this.client.get('/ai/conversations', {
      params: {
        user_id: userId,
        conversation_id: conversationId,
      },
    });
  }

  /**
   * Clear conversation history
   */
  async clearConversation(userId: string, conversationId?: string) {
    return this.client.delete('/ai/conversations', {
      params: {
        user_id: userId,
        conversation_id: conversationId,
      },
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        ...response,
        status: 'healthy',
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error?.message || 'AI Engine is not available',
      };
    }
  }

  /**
   * List voice classes (stub - feature not yet implemented)
   */
  async listVoiceClasses() {
    // TODO: Implement voice classes feature
    return { classes: [] };
  }

  /**
   * Schedule voice class (stub - feature not yet implemented)
   */
  async scheduleVoiceClass(payload: any) {
    // TODO: Implement voice class scheduling feature
    return {
      id: `temp-${Date.now()}`,
      ...payload,
      scheduled_start: payload.scheduled_start,
      status: 'scheduled',
    };
  }

  /**
   * Start scheduled voice class (stub - feature not yet implemented)
   */
  async startScheduledVoiceClass(classId: string) {
    // TODO: Implement voice class start feature
    return {
      room_name: `room-${classId}`,
      student_token: '',
      ws_url: '',
      session_id: classId,
    };
  }
}

export const aiEngineService = new AIEngineService();
export default aiEngineService;
