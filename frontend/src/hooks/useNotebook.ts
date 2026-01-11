import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notebookService, { Notebook, Source, Artifact, ApiResponse } from '../services/notebook.service';

export const useNotebooks = () => {
  return useQuery<ApiResponse<Notebook[]>>({
    queryKey: ['notebooks'],
    queryFn: () => notebookService.getNotebooks()
  });
};

export const useNotebook = (id: string | undefined) => {
  return useQuery<{ success: boolean; data: Notebook }>({
    queryKey: ['notebooks', id],
    queryFn: () => notebookService.getNotebook(id!),
    enabled: !!id
  });
};

export const useCreateNotebook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; description?: string }) => 
      notebookService.createNotebook(data),
    onSuccess: (response) => {
      // Invalidate notebooks list
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
      
      // Set the new notebook data in cache
      const notebookId = (response as any)?.data?._id || (response as any)?._id;
      if (notebookId) {
        queryClient.setQueryData(['notebooks', notebookId], response);
      }
    }
  });
};

export const useUpdateNotebook = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; description?: string }) => 
      notebookService.updateNotebook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks', id] });
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    }
  });
};

export const useDeleteNotebook = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notebookService.deleteNotebook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks'] });
    }
  });
};

export const useAddSource = (notebookId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => notebookService.addSource(notebookId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] });
    }
  });
};

export const useToggleSource = (notebookId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => notebookService.toggleSource(notebookId, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] });
    }
  });
};

export const useRemoveSource = (notebookId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => notebookService.removeSource(notebookId, sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] });
    }
  });
};

export const useNotebookContext = (id: string | undefined) => {
  return useQuery({
    queryKey: ['notebooks', id, 'context'],
    queryFn: () => notebookService.getContext(id!),
    enabled: !!id
  });
};

export const useLinkArtifact = (notebookId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: 'quiz' | 'mindmap' | 'flashcards' | 'infographic'; referenceId: string; title: string; data?: any }) => 
      notebookService.linkArtifact(notebookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] });
    }
  });
};

export const useUnlinkArtifact = (notebookId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artifactId: string) => notebookService.unlinkArtifact(notebookId, artifactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] });
    }
  });
};
