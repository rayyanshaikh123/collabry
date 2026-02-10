/**
 * AI Hooks
 * React hooks for AI Engine operations
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { aiEngineService } from '@/lib/services/aiEngine.service';
import { useAuthStore } from '@/lib/stores/auth.store';

/**
 * Hook for AI chat
 */
export const useAIChat = () => {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({
      message,
      conversationId,
    }: {
      message: string;
      conversationId?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return aiEngineService.chat(message, user.id, conversationId);
    },
  });
};

/**
 * Hook for text summarization
 */
export const useSummarize = () => {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({
      text,
      options,
    }: {
      text: string;
      options?: { max_length?: number; style?: string };
    }) => {
      if (!user) throw new Error('User not authenticated');
      return aiEngineService.summarize(text, user.id, options);
    },
  });
};

/**
 * Hook for Q&A generation
 */
export const useGenerateQA = () => {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({
      text,
      options,
    }: {
      text: string;
      options?: { num_questions?: number };
    }) => {
      if (!user) throw new Error('User not authenticated');
      return aiEngineService.generateQA(text, user.id, options);
    },
  });
};

/**
 * Hook for mind map generation
 */
export const useGenerateMindMap = () => {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({
      text,
      options,
    }: {
      text: string;
      options?: { max_nodes?: number };
    }) => {
      if (!user) throw new Error('User not authenticated');
      return aiEngineService.generateMindMap(text, user.id, options);
    },
  });
};

/**
 * Hook for document ingestion
 */
export const useIngestDocument = () => {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: ({
      content,
      metadata,
    }: {
      content: string;
      metadata?: { title?: string; source?: string; [key: string]: any };
    }) => {
      if (!user) throw new Error('User not authenticated');
      return aiEngineService.ingestDocument(content, user.id, metadata);
    },
  });
};

/**
 * Hook to get conversation history
 */
export const useConversationHistory = (conversationId?: string) => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['conversation-history', user?.id, conversationId],
    queryFn: () => {
      if (!user) throw new Error('User not authenticated');
      return aiEngineService.getConversationHistory(user.id, conversationId);
    },
    enabled: !!user,
  });
};

/**
 * Hook to clear conversation
 */
export const useClearConversation = () => {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (conversationId?: string) => {
      if (!user) throw new Error('User not authenticated');
      return aiEngineService.clearConversation(user.id, conversationId);
    },
  });
};

/**
 * Hook to check AI engine health
 */
export const useAIHealth = () => {
  return useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiEngineService.healthCheck(),
    refetchInterval: 30000, // Check every 30 seconds
  });
};
