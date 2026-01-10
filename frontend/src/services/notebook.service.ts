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
}

export default new NotebookService();
