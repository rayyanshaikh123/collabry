const axios = require('axios');

const AI_ENGINE_BASE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

class AIService {
  constructor() {
    this.client = axios.create({
      baseURL: AI_ENGINE_BASE_URL,
      timeout: 60000, // 60 seconds for AI operations
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Forward request to AI engine with user's JWT token
   */
  async forwardToAI(endpoint, data, userToken) {
    try {
      const response = await this.client.post(endpoint, data, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error('AI Engine Error:', error.message);
      throw new Error(
        error.response?.data?.error || 'AI Engine request failed'
      );
    }
  }

  /**
   * Chat with AI
   */
  async chat(message, userId, conversationId, userToken) {
    return this.forwardToAI(
      '/api/chat',
      {
        message,
        user_id: userId,
        conversation_id: conversationId,
      },
      userToken
    );
  }

  /**
   * Streaming chat with AI
   */
  async chatStream(message, userId, conversationId, userToken) {
    return this.forwardToAI(
      '/api/chat/stream',
      {
        message,
        user_id: userId,
        conversation_id: conversationId,
      },
      userToken
    );
  }

  /**
   * Summarize text
   */
  async summarize(text, userId, userToken) {
    return this.forwardToAI(
      '/api/summarize',
      {
        text,
        user_id: userId,
      },
      userToken
    );
  }

  /**
   * Generate Q&A from text
   */
  async generateQA(text, userId, userToken) {
    return this.forwardToAI(
      '/api/qa/generate',
      {
        text,
        user_id: userId,
      },
      userToken
    );
  }

  /**
   * Generate mind map
   */
  async generateMindMap(text, userId, userToken) {
    return this.forwardToAI(
      '/api/mindmap/generate',
      {
        text,
        user_id: userId,
      },
      userToken
    );
  }

  /**
   * Ingest document for RAG
   */
  async ingestDocument(content, metadata, userId, userToken) {
    return this.forwardToAI(
      '/api/ingest',
      {
        content,
        metadata,
        user_id: userId,
      },
      userToken
    );
  }

  /**
   * Health check for AI engine
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return {
        status: 'error',
        message: 'AI Engine is not available',
      };
    }
  }
}

module.exports = new AIService();
