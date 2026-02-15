import api from '@/lib/api';

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Source {
  _id: string;
  type: 'pdf' | 'text' | 'website' | 'audio';
  name: string;
  filePath?: string;
  url?: string;
  content?: string;
  size?: number;
  selected: boolean;
  dateAdded: string;

  // Audio specific fields
  audioUrl?: string;
  duration?: number;
  transcription?: string;
  transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  transcriptionError?: string;
}

export interface Artifact {
  _id: string;
  type: 'quiz' | 'mindmap' | 'flashcards' | 'infographic' | 'course-finder';
  referenceId: string;
  title: string;
  data?: any; // Inline data for flashcards and infographics
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
    return response as ApiResponse<Notebook[]>;
  }

  async getNotebook(id: string): Promise<ApiResponse<Notebook>> {
    const response = await api.get(`/notebook/notebooks/${id}`);
    return response as ApiResponse<Notebook>;
  }

  async createNotebook(data: { title?: string; description?: string }): Promise<ApiResponse<Notebook>> {
    const response = await api.post('/notebook/notebooks', data);
    return response as ApiResponse<Notebook>;
  }

  async updateNotebook(id: string, data: { title?: string; description?: string }) {
    const response = await api.put(`/notebook/notebooks/${id}`, data);
    return response;
  }

  async deleteNotebook(id: string) {
    const response = await api.delete(`/notebook/notebooks/${id}`);
    return response;
  }

  async addSource(notebookId: string, payload: FormData | Record<string, any>) {
    const response = await api.post(
      `/notebook/notebooks/${notebookId}/sources`,
      payload
    );
    return response;
  }

  async toggleSource(notebookId: string, sourceId: string) {
    const response = await api.patch(
      `/notebook/notebooks/${notebookId}/sources/${sourceId}`
    );
    return response;
  }

  async removeSource(notebookId: string, sourceId: string) {
    const response = await api.delete(
      `/notebook/notebooks/${notebookId}/sources/${sourceId}`
    );
    return response;
  }

  async getSourceContent(notebookId: string, sourceId: string) {
    const response = await api.get(
      `/notebook/notebooks/${notebookId}/sources/${sourceId}/content`
    );
    return response;
  }

  async getContext(notebookId: string) {
    const response = await api.get(`/notebook/notebooks/${notebookId}/context`);
    return response;
  }

  async linkArtifact(notebookId: string, data: {
    type: 'quiz' | 'mindmap' | 'flashcards' | 'infographic' | 'course-finder';
    referenceId: string;
    title: string;
    data?: any;
  }) {
    const response = await api.post(
      `/notebook/notebooks/${notebookId}/artifacts`,
      data
    );
    return response;
  }

  async unlinkArtifact(notebookId: string, artifactId: string) {
    const response = await api.delete(
      `/notebook/notebooks/${notebookId}/artifacts/${artifactId}`
    );
    return response;
  }

  // Collaboration
  async getCollaborators(notebookId: string) {
    const response = await api.get(`/notebook/notebooks/${notebookId}/collaborators`);
    return response;
  }

  async inviteCollaborator(notebookId: string, email: string, role: string = 'editor') {
    const response = await api.post(`/notebook/notebooks/${notebookId}/collaborators/invite`, {
      email,
      role
    });
    return response;
  }

  async removeCollaborator(notebookId: string, userId: string) {
    const response = await api.delete(`/notebook/notebooks/${notebookId}/collaborators/${userId}`);
    return response;
  }

  async updateCollaboratorRole(notebookId: string, userId: string, data: { role?: string; permissions?: any }) {
    const response = await api.patch(`/notebook/notebooks/${notebookId}/collaborators/${userId}/role`, data);
    return response;
  }

  async generateShareLink(notebookId: string) {
    const response = await api.post(`/notebook/notebooks/${notebookId}/share-link`);
    return response;
  }

  async joinViaShareCode(shareCode: string) {
    const response = await api.post(`/notebook/notebooks/join/${shareCode}`);
    return response;
  }

  // Invitation Management
  async getPendingInvitations() {
    const response = await api.get('/notebook/invitations/pending');
    return response;
  }

  async acceptInvitation(notebookId: string) {
    const response = await api.post(`/notebook/notebooks/${notebookId}/invitations/accept`);
    return response;
  }

  async rejectInvitation(notebookId: string) {
    const response = await api.post(`/notebook/notebooks/${notebookId}/invitations/reject`);
    return response;
  }

  // Friends Integration
  async getFriendsToInvite(notebookId: string) {
    const response = await api.get(`/notebook/notebooks/${notebookId}/friends`);
    return response;
  }

  getAudioUrl(notebookId: string, sourceId: string) {
    // Construct full URL including base API path
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    return `${baseURL}/notebook/notebooks/${notebookId}/sources/${sourceId}/audio`;
  }
}

export default new NotebookService();
