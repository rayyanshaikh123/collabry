/**
 * Visual Learning Aids React Hook
 * Provides React Query hooks for all Visual Aids operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visualAidsService } from '@/lib/services/visualAids.service';
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
  SubmitQuizAttemptRequest,
  Subject,
  CreateSubjectRequest,
  GenerateFlashcardsRequest,
  GenerateMindMapRequest,
  GenerateQuizRequest,
} from '@/types/visualAids.types';

// Query Keys
export const visualAidsKeys = {
  all: ['visualAids'] as const,
  flashcardSets: (subject?: string) => [...visualAidsKeys.all, 'flashcards', 'sets', { subject }] as const,
  flashcardSet: (setId: string) => [...visualAidsKeys.all, 'flashcards', 'set', setId] as const,
  mindMaps: (subject?: string) => [...visualAidsKeys.all, 'mindmaps', { subject }] as const,
  mindMap: (mapId: string) => [...visualAidsKeys.all, 'mindmap', mapId] as const,
  mindMapVersions: (mapId: string) => [...visualAidsKeys.all, 'mindmap', mapId, 'versions'] as const,
  quizzes: (subject?: string) => [...visualAidsKeys.all, 'quizzes', { subject }] as const,
  quiz: (quizId: string) => [...visualAidsKeys.all, 'quiz', quizId] as const,
  quizAttempts: (quizId: string) => [...visualAidsKeys.all, 'quiz', quizId, 'attempts'] as const,
  quizStats: (quizId: string) => [...visualAidsKeys.all, 'quiz', quizId, 'stats'] as const,
  subjects: () => [...visualAidsKeys.all, 'subjects'] as const,
};

// ============= FLASHCARDS HOOKS =============

export function useFlashcardSets(subject?: string) {
  return useQuery({
    queryKey: visualAidsKeys.flashcardSets(subject),
    queryFn: () => visualAidsService.getFlashcardSets(subject),
  });
}

export function useFlashcardSet(setId: string) {
  return useQuery({
    queryKey: visualAidsKeys.flashcardSet(setId),
    queryFn: () => visualAidsService.getFlashcardSet(setId),
    enabled: !!setId,
  });
}

export function useCreateFlashcardSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFlashcardSetRequest) => visualAidsService.createFlashcardSet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSets() });
    },
  });
}

export function useUpdateFlashcardSet(setId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateFlashcardSetRequest>) => 
      visualAidsService.updateFlashcardSet(setId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSet(setId) });
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSets() });
    },
  });
}

export function useDeleteFlashcardSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setId: string) => visualAidsService.deleteFlashcardSet(setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSets() });
    },
  });
}

export function useAddFlashcard(setId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFlashcardRequest) => visualAidsService.addFlashcard(setId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSet(setId) });
    },
  });
}

export function useUpdateFlashcard(setId: string, cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFlashcardRequest) => 
      visualAidsService.updateFlashcard(setId, cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSet(setId) });
    },
  });
}

export function useDeleteFlashcard(setId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => visualAidsService.deleteFlashcard(setId, cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSet(setId) });
    },
  });
}

export function useShuffleCards(setId: string) {
  return useMutation({
    mutationFn: () => visualAidsService.getShuffledCards(setId),
  });
}

export function useTrackCardStudy(setId: string, cardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TrackCardStudyRequest) => 
      visualAidsService.trackCardStudy(setId, cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSet(setId) });
    },
  });
}

// ============= MIND MAPS HOOKS =============

export function useMindMaps(subject?: string) {
  return useQuery({
    queryKey: visualAidsKeys.mindMaps(subject),
    queryFn: () => visualAidsService.getMindMaps(subject),
  });
}

export function useMindMap(mapId: string) {
  return useQuery({
    queryKey: visualAidsKeys.mindMap(mapId),
    queryFn: () => visualAidsService.getMindMap(mapId),
    enabled: !!mapId,
  });
}

export function useCreateMindMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMindMapRequest) => visualAidsService.createMindMap(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.mindMaps() });
    },
  });
}

export function useUpdateMindMap(mapId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateMindMapRequest) => visualAidsService.updateMindMap(mapId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.mindMap(mapId) });
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.mindMaps() });
    },
  });
}

export function useDeleteMindMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mapId: string) => visualAidsService.deleteMindMap(mapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.mindMaps() });
    },
  });
}

export function useMindMapVersionHistory(mapId: string) {
  return useQuery({
    queryKey: visualAidsKeys.mindMapVersions(mapId),
    queryFn: () => visualAidsService.getMindMapVersionHistory(mapId),
    enabled: !!mapId,
  });
}

export function useArchiveMindMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mapId: string) => visualAidsService.archiveMindMap(mapId),
    onSuccess: (_, mapId) => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.mindMap(mapId) });
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.mindMaps() });
    },
  });
}

// ============= QUIZZES HOOKS =============

export function useQuizzes(subject?: string) {
  return useQuery({
    queryKey: visualAidsKeys.quizzes(subject),
    queryFn: () => visualAidsService.getQuizzes(subject),
  });
}

export function useQuiz(quizId: string) {
  return useQuery({
    queryKey: visualAidsKeys.quiz(quizId),
    queryFn: () => visualAidsService.getQuiz(quizId),
    enabled: !!quizId,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuizRequest) => visualAidsService.createQuiz(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.quizzes() });
    },
  });
}

export function useUpdateQuiz(quizId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateQuizRequest>) => 
      visualAidsService.updateQuiz(quizId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.quiz(quizId) });
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.quizzes() });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quizId: string) => visualAidsService.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.quizzes() });
    },
  });
}

export function useCreateQuizFromFlashcards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ setId, data }: { 
      setId: string; 
      data: { quizTitle?: string; numberOfQuestions?: number; includeHints?: boolean; }
    }) => visualAidsService.createQuizFromFlashcards(setId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.quizzes() });
    },
  });
}

export function useSubmitQuizAttempt(quizId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitQuizAttemptRequest) => 
      visualAidsService.submitQuizAttempt(quizId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.quizAttempts(quizId) });
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.quizStats(quizId) });
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.quiz(quizId) });
    },
  });
}

export function useQuizAttempts(quizId: string) {
  return useQuery({
    queryKey: visualAidsKeys.quizAttempts(quizId),
    queryFn: () => visualAidsService.getUserQuizAttempts(quizId),
    enabled: !!quizId,
  });
}

export function useQuizStatistics(quizId: string) {
  return useQuery({
    queryKey: visualAidsKeys.quizStats(quizId),
    queryFn: () => visualAidsService.getQuizStatistics(quizId),
    enabled: !!quizId,
  });
}

// ============= SUBJECTS HOOKS =============

export function useSubjects() {
  return useQuery({
    queryKey: visualAidsKeys.subjects(),
    queryFn: () => visualAidsService.getSubjects(),
    retry: 1, // Only retry once
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSubjectRequest) => visualAidsService.createSubject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.subjects() });
    },
  });
}

// ============= AI GENERATION HOOKS =============

export function useGenerateFlashcards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateFlashcardsRequest) => 
      visualAidsService.generateFlashcards(data),
    onSuccess: (response) => {
      if (response.savedSetId) {
        queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSets() });
      }
    },
  });
}

export function useGenerateMindMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateMindMapRequest) => 
      visualAidsService.generateMindMap(data),
    onSuccess: (response) => {
      if (response.savedMapId) {
        queryClient.invalidateQueries({ queryKey: visualAidsKeys.mindMaps() });
      }
    },
  });
}

export function useGenerateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateQuizRequest) => 
      visualAidsService.generateQuiz(data),
    onSuccess: () => {
      // Always invalidate quizzes to refetch the list
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.quizzes() });
    },
  });
}

export function useEnhanceFlashcards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (setId: string) => visualAidsService.enhanceFlashcards(setId),
    onSuccess: (_, setId) => {
      queryClient.invalidateQueries({ queryKey: visualAidsKeys.flashcardSet(setId) });
    },
  });
}
