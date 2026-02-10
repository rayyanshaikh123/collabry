/**
 * Visual Learning Aids Service
 * Handles all API calls for flashcards, mind maps, quizzes, and AI generation
 */

import { apiClient } from '@/lib/api';
import type {
  FlashcardSet,
  Flashcard,
  CreateFlashcardSetRequest,
  CreateFlashcardRequest,
  UpdateFlashcardRequest,
  TrackCardStudyRequest,
  MindMap,
  CreateMindMapRequest,
  UpdateMindMapRequest,
  Quiz,
  CreateQuizRequest,
  QuizAttempt,
  SubmitQuizAttemptRequest,
  QuizStatistics,
  Subject,
  CreateSubjectRequest,
  GenerateFlashcardsRequest,
  GenerateFlashcardsResponse,
  GenerateMindMapRequest,
  GenerateMindMapResponse,
  GenerateQuizRequest,
  GenerateQuizResponse,
} from '@/types';

export const visualAidsService = {
  // ============= FLASHCARDS =============

  /**
   * Get all flashcard sets for the authenticated user
   */
  async getFlashcardSets(subject?: string): Promise<FlashcardSet[]> {
    const url = subject ? `/visual-aids/flashcards/sets?subject=${subject}` : '/visual-aids/flashcards/sets';
    const response = await apiClient.get<FlashcardSet[]>(url);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to fetch flashcard sets');
  },

  /**
   * Get a specific flashcard set by ID
   */
  async getFlashcardSet(setId: string): Promise<FlashcardSet> {
    const response = await apiClient.get<FlashcardSet>(`/visual-aids/flashcards/sets/${setId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to fetch flashcard set');
  },

  /**
   * Create a new flashcard set
   */
  async createFlashcardSet(data: CreateFlashcardSetRequest): Promise<FlashcardSet> {
    const response = await apiClient.post<FlashcardSet>('/visual-aids/flashcards/sets', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to create flashcard set');
  },

  /**
   * Update a flashcard set
   */
  async updateFlashcardSet(setId: string, data: Partial<CreateFlashcardSetRequest>): Promise<FlashcardSet> {
    const response = await apiClient.put<FlashcardSet>(`/visual-aids/flashcards/sets/${setId}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to update flashcard set');
  },

  /**
   * Delete a flashcard set
   */
  async deleteFlashcardSet(setId: string): Promise<void> {
    const response = await apiClient.delete<void>(`/visual-aids/flashcards/sets/${setId}`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete flashcard set');
    }
  },

  /**
   * Add a card to a set
   */
  async addFlashcard(setId: string, data: CreateFlashcardRequest): Promise<Flashcard> {
    const response = await apiClient.post<Flashcard>(`/visual-aids/flashcards/sets/${setId}/cards`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to add flashcard');
  },

  /**
   * Update a flashcard
   */
  async updateFlashcard(setId: string, cardId: string, data: UpdateFlashcardRequest): Promise<Flashcard> {
    const response = await apiClient.put<Flashcard>(`/visual-aids/flashcards/sets/${setId}/cards/${cardId}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to update flashcard');
  },

  /**
   * Delete a flashcard
   */
  async deleteFlashcard(setId: string, cardId: string): Promise<void> {
    const response = await apiClient.delete<void>(`/visual-aids/flashcards/sets/${setId}/cards/${cardId}`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete flashcard');
    }
  },

  /**
   * Get shuffled cards from a set
   */
  async getShuffledCards(setId: string): Promise<Flashcard[]> {
    const response = await apiClient.get<{ cards: Flashcard[] }>(`/visual-aids/flashcards/sets/${setId}/shuffle`);
    if (response.success && response.data) {
      return response.data.cards;
    }
    throw new Error(response.error?.message || 'Failed to shuffle cards');
  },

  /**
   * Track card study (update confidence and review stats)
   */
  async trackCardStudy(setId: string, cardId: string, data: TrackCardStudyRequest): Promise<Flashcard> {
    const response = await apiClient.post<Flashcard>(`/visual-aids/flashcards/sets/${setId}/cards/${cardId}/track`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to track card study');
  },

  // ============= MIND MAPS =============

  /**
   * Get all mind maps for the authenticated user
   */
  async getMindMaps(subject?: string): Promise<MindMap[]> {
    const url = subject ? `/visual-aids/mindmaps?subject=${subject}` : '/visual-aids/mindmaps';
    const response = await apiClient.get<MindMap[]>(url);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to fetch mind maps');
  },

  /**
   * Get a specific mind map by ID
   */
  async getMindMap(mapId: string): Promise<MindMap> {
    const response = await apiClient.get<MindMap>(`/visual-aids/mindmaps/${mapId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to fetch mind map');
  },

  /**
   * Create a new mind map
   */
  async createMindMap(data: CreateMindMapRequest): Promise<MindMap> {
    const response = await apiClient.post<MindMap>('/visual-aids/mindmaps', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to create mind map');
  },

  /**
   * Update a mind map (creates new version)
   */
  async updateMindMap(mapId: string, data: UpdateMindMapRequest): Promise<MindMap> {
    const response = await apiClient.put<MindMap>(`/visual-aids/mindmaps/${mapId}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to update mind map');
  },

  /**
   * Delete a mind map
   */
  async deleteMindMap(mapId: string): Promise<void> {
    const response = await apiClient.delete<void>(`/visual-aids/mindmaps/${mapId}`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete mind map');
    }
  },

  /**
   * Get version history of a mind map
   */
  async getMindMapVersionHistory(mapId: string): Promise<MindMap[]> {
    const response = await apiClient.get<{ versions: MindMap[] }>(`/visual-aids/mindmaps/${mapId}/versions`);
    if (response.success && response.data) {
      return response.data.versions;
    }
    throw new Error(response.error?.message || 'Failed to fetch version history');
  },

  /**
   * Archive a mind map
   */
  async archiveMindMap(mapId: string): Promise<MindMap> {
    const response = await apiClient.post<MindMap>(`/visual-aids/mindmaps/${mapId}/archive`, {});
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to archive mind map');
  },

  // ============= QUIZZES =============

  /**
   * Get all quizzes for the authenticated user
   */
  async getQuizzes(subject?: string): Promise<Quiz[]> {
    const url = subject ? `/visual-aids/quizzes?subject=${subject}` : '/visual-aids/quizzes';
    const response = await apiClient.get<Quiz[]>(url);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to fetch quizzes');
  },

  /**
   * Get a specific quiz by ID
   */
  async getQuiz(quizId: string): Promise<Quiz> {
    const response = await apiClient.get<Quiz>(`/visual-aids/quizzes/${quizId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to fetch quiz');
  },

  /**
   * Create a new quiz
   */
  async createQuiz(data: CreateQuizRequest): Promise<Quiz> {
    const response = await apiClient.post<Quiz>('/visual-aids/quizzes', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to create quiz');
  },

  /**
   * Update a quiz
   */
  async updateQuiz(quizId: string, data: Partial<CreateQuizRequest>): Promise<Quiz> {
    const response = await apiClient.put<Quiz>(`/visual-aids/quizzes/${quizId}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to update quiz');
  },

  /**
   * Delete a quiz
   */
  async deleteQuiz(quizId: string): Promise<void> {
    const response = await apiClient.delete<void>(`/visual-aids/quizzes/${quizId}`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete quiz');
    }
  },

  /**
   * Create quiz from flashcard set
   */
  async createQuizFromFlashcards(
    setId: string,
    data: {
      quizTitle?: string;
      numberOfQuestions?: number;
      includeHints?: boolean;
    }
  ): Promise<Quiz> {
    const response = await apiClient.post<Quiz>(`/visual-aids/quizzes/from-flashcards/${setId}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to create quiz from flashcards');
  },

  /**
   * Submit quiz attempt
   */
  async submitQuizAttempt(quizId: string, data: SubmitQuizAttemptRequest): Promise<QuizAttempt> {
    const response = await apiClient.post<QuizAttempt>(`/visual-aids/quizzes/${quizId}/attempt`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to submit quiz attempt');
  },

  /**
   * Get user's quiz attempts
   */
  async getUserQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
    const response = await apiClient.get<{ attempts: QuizAttempt[] }>(`/visual-aids/quizzes/${quizId}/attempts`);
    if (response.success && response.data) {
      return response.data.attempts;
    }
    throw new Error(response.error?.message || 'Failed to fetch quiz attempts');
  },

  /**
   * Get quiz statistics
   */
  async getQuizStatistics(quizId: string): Promise<QuizStatistics> {
    const response = await apiClient.get<QuizStatistics>(`/visual-aids/quizzes/${quizId}/statistics`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to fetch quiz statistics');
  },

  // ============= SUBJECTS =============

  /**
   * Get all subjects for the authenticated user
   */
  async getSubjects(): Promise<Subject[]> {
    const response = await apiClient.get<Subject[]>('/visual-aids/subjects');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to fetch subjects');
  },

  /**
   * Create a new subject
   */
  async createSubject(data: CreateSubjectRequest): Promise<Subject> {
    const response = await apiClient.post<Subject>('/visual-aids/subjects', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to create subject');
  },

  // ============= AI GENERATION =============

  /**
   * Generate flashcards from content using AI
   */
  async generateFlashcards(data: GenerateFlashcardsRequest): Promise<GenerateFlashcardsResponse> {
    const response = await apiClient.post<GenerateFlashcardsResponse>('/visual-aids/generate/flashcards', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to generate flashcards');
  },

  /**
   * Generate mind map from topic using AI
   */
  async generateMindMap(data: GenerateMindMapRequest): Promise<GenerateMindMapResponse> {
    const response = await apiClient.post<GenerateMindMapResponse>('/visual-aids/generate/mindmap', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to generate mind map');
  },

  /**
   * Generate quiz from content using AI
   */
  async generateQuiz(data: GenerateQuizRequest): Promise<GenerateQuizResponse> {
    const response = await apiClient.post<any>('/visual-aids/generate/quiz', data);
    if (response.success && response.data) {
      // If saved to database, data is a quiz object with _id
      // If not saved, data is { questions: [...] }
      if (response.data._id) {
        // Saved quiz - return the quiz ID
        return {
          questions: response.data.questions || [],
          savedQuizId: response.data._id
        };
      } else {
        // Not saved - return just questions
        return {
          questions: response.data.questions || []
        };
      }
    }
    throw new Error(response.error?.message || 'Failed to generate quiz');
  },

  /**
   * Enhance existing flashcards with AI
   */
  async enhanceFlashcards(setId: string): Promise<{ flashcards: Flashcard[] }> {
    const response = await apiClient.post<{ flashcards: Flashcard[] }>(`/visual-aids/generate/enhance-flashcards/${setId}`, {});
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error?.message || 'Failed to enhance flashcards');
  },
};
