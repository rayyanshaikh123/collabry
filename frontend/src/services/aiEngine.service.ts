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
      baseURL: AI_ENGINE_URL,
      timeout: 60000, // 60 seconds for AI operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - attach JWT token
    this.client.interceptors.request.use(
      (config) => {
        // Get token from Zustand persist storage
        const authStorage = localStorage.getItem('auth-storage');
        console.log('🔍 Auth storage:', authStorage ? 'Found' : 'Not found');
        
        if (authStorage) {
          try {
            const { state } = JSON.parse(authStorage);
            const token = state?.accessToken;
            console.log('🔑 Token extracted:', token ? `${token.substring(0, 20)}...` : 'None');
            
            if (token && config.headers) {
              config.headers.Authorization = `Bearer ${token}`;
              console.log('✅ Authorization header set');
            }
          } catch (e) {
            console.error('❌ Failed to parse auth storage:', e);
          }
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
  async chat(message: string, userId: string, conversationId?: string) {
    const payload = {
      message,
      session_id: conversationId,
      stream: false
    };
    console.log('📤 Sending chat request:', payload);
    console.log('🌐 Base URL:', this.client.defaults.baseURL);
    console.log('🎯 Full URL:', `${this.client.defaults.baseURL}/ai/chat`);
    return this.client.post('/ai/chat', payload);
  }

  /**
   * Streaming chat with AI
   */
  async chatStream(message: string, userId: string, conversationId?: string) {
    return this.client.post('/ai/chat/stream', {
      message,
      session_id: conversationId,
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
        status: 'healthy',
        ...response,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error?.message || 'AI Engine is not available',
      };
    }
  }
}

export const aiEngineService = new AIEngineService();
export default aiEngineService;
