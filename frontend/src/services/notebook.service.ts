import api from '../lib/api';

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Source {
  _id: string;
  type: 'pdf' | 'text' | 'website' | 'notes';
  name: string;
  filePath?: string;
  url?: string;
  content?: string;
  size?: number;
  selected: boolean;
  dateAdded: string;
}

export interface Artifact {
  _id: string;
  type: 'quiz' | 'mindmap' | 'flashcards';
  referenceId: string;
  title: string;
  createdAt: string;
}

export interface Notebook {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  sources: Source[];
  aiSessionId: string;
  artifacts: Artifact[];
  createdAt: string;
  updatedAt: string;
  lastAccessed: string;
}

// AI Engine Types
export interface WebScrapeResponse {
  url: string;
  title?: string;
  content: string;
  word_count: number;
  scraped_at: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
  searched_at: string;
}

export interface SummarizeResponse {
  summary: string;
  original_length: number;
  summary_length: number;
}

export interface KeyPoint {
  point: string;
  importance: 'high' | 'medium' | 'low';
}

export interface ExtractKeyPointsResponse {
  key_points: KeyPoint[];
  total_points: number;
}

class NotebookService {
  async getNotebooks(): Promise<ApiResponse<Notebook[]>> {
    const response = await api.get('/notebook/notebooks');
    return response.data;
  }

  async getNotebook(id: string): Promise<ApiResponse<Notebook>> {
    const response = await api.get(`/notebook/notebooks/${id}`);
    return response.data;
  }

  async createNotebook(data: { title?: string; description?: string }): Promise<ApiResponse<Notebook>> {
    const response = await api.post('/notebook/notebooks', data);
    return response.data;
  }

  async updateNotebook(id: string, data: { title?: string; description?: string }) {
    const response = await api.put(`/notebook/notebooks/${id}`, data);
    return response.data;
  }

  async deleteNotebook(id: string) {
    const response = await api.delete(`/notebook/notebooks/${id}`);
    return response.data;
  }

  async addSource(notebookId: string, formData: FormData) {
    const response = await api.post(
      `/notebook/notebooks/${notebookId}/sources`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  }

  async toggleSource(notebookId: string, sourceId: string) {
    const response = await api.patch(
      `/notebook/notebooks/${notebookId}/sources/${sourceId}`
    );
    return response.data;
  }

  async removeSource(notebookId: string, sourceId: string) {
    const response = await api.delete(
      `/notebook/notebooks/${notebookId}/sources/${sourceId}`
    );
    return response.data;
  }

  async getSourceContent(notebookId: string, sourceId: string) {
    const response = await api.get(
      `/notebook/notebooks/${notebookId}/sources/${sourceId}/content`
    );
    return response.data;
  }

  async getContext(notebookId: string) {
    const response = await api.get(`/notebook/notebooks/${notebookId}/context`);
    return response.data;
  }

  async linkArtifact(notebookId: string, data: {
    type: 'quiz' | 'mindmap' | 'flashcards';
    referenceId: string;
    title: string;
  }) {
    const response = await api.post(
      `/notebook/notebooks/${notebookId}/artifacts`,
      data
    );
    return response.data;
  }

  async unlinkArtifact(notebookId: string, artifactId: string) {
    const response = await api.delete(
      `/notebook/notebooks/${notebookId}/artifacts/${artifactId}`
    );
    return response.data;
  }

  // === AI Engine Methods ===

  /**
   * Scrape content from a URL for use as a notebook source
   */
  async scrapeUrl(url: string): Promise<WebScrapeResponse> {
    const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';
    const response = await fetch(`${AI_ENGINE_URL}/ai/notebook/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ url, extract_text_only: true })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to scrape URL');
    }

    return response.json();
  }

  /**
   * Search the web for information
   */
  async searchWeb(query: string, maxResults: number = 5): Promise<WebSearchResponse> {
    const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';
    const response = await fetch(`${AI_ENGINE_URL}/ai/notebook/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ query, max_results: maxResults })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Web search failed');
    }

    return response.json();
  }

  /**
   * Summarize content using AI
   */
  async summarizeContent(content: string, maxLength: number = 200): Promise<SummarizeResponse> {
    const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';
    const response = await fetch(`${AI_ENGINE_URL}/ai/notebook/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ content, max_length: maxLength })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Summarization failed');
    }

    return response.json();
  }

  /**
   * Extract key points from content
   */
  async extractKeyPoints(content: string, numPoints: number = 5): Promise<ExtractKeyPointsResponse> {
    const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';
    const response = await fetch(`${AI_ENGINE_URL}/ai/notebook/extract-key-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ content, num_points: numPoints })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Key points extraction failed');
    }

    return response.json();
  }

  /**
   * Stream summarization (Server-Sent Events)
   */
  async *streamSummarization(content: string, maxLength: number = 200): AsyncGenerator<string> {
    const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8000';
    const params = new URLSearchParams({
      content: content.slice(0, 5000), // Limit for URL params
      max_length: maxLength.toString()
    });

    const response = await fetch(`${AI_ENGINE_URL}/ai/notebook/summarize/stream?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Streaming summarization failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                yield parsed.chunk;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export default new NotebookService();
