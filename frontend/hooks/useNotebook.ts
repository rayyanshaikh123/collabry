import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notebookService, { Notebook, Source, Artifact, ApiResponse } from '@/lib/services/notebook.service';

type AddSourcePayload =
  | FormData
  | {
    type: 'text';
    name: string;
    content: string;
  }
  | {
    type: 'website';
    name?: string;
    url: string;
  }
  | {
    type: 'audio';
    name: string;
    file: File;
  };

const updateNotebookQueryCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  notebookId: string,
  updater: (notebook: Notebook) => Notebook
) => {
  queryClient.setQueryData(['notebooks', notebookId], (old: any) => {
    if (!old) return old;

    // Expected shape from getNotebook(): { success, data: Notebook }
    if (old?.data && typeof old === 'object') {
      const currentNotebook = old.data as Notebook;
      if (!currentNotebook || !currentNotebook._id) return old;
      return { ...old, data: updater(currentNotebook) };
    }

    // Fallback if cache was written as a raw Notebook
    const currentNotebook = old as Notebook;
    if (!currentNotebook || !currentNotebook._id) return old;
    return updater(currentNotebook);
  });
};

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
    mutationFn: (payload: AddSourcePayload) => notebookService.addSource(notebookId, payload as any),
    onMutate: async (payload: AddSourcePayload) => {
      await queryClient.cancelQueries({ queryKey: ['notebooks', notebookId] });

      const previous = queryClient.getQueryData(['notebooks', notebookId]);

      const optimisticId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const nowIso = new Date().toISOString();
      const optimisticSource: Source = {
        _id: optimisticId,
        type: 'text',
        name: 'New source',
        selected: true,
        dateAdded: nowIso,
      };

      try {
        if (typeof FormData !== 'undefined' && payload instanceof FormData) {
          const rawType = String(payload.get('type') || 'pdf');
          const type = (['pdf', 'text', 'website', 'audio'].includes(rawType) ? rawType : 'pdf') as Source['type'];
          const name = String(payload.get('name') || 'Untitled Source');
          optimisticSource.type = type;
          optimisticSource.name = name;
        } else {
          const p: any = payload;
          optimisticSource.type = p.type;
          optimisticSource.name = p.name || p.url || 'Untitled Source';
          if (p.url) optimisticSource.url = p.url;
        }
      } catch {
        // best-effort; keep defaults
      }

      updateNotebookQueryCache(queryClient, notebookId, (nb) => {
        const existing = nb.sources ?? [];
        return { ...nb, sources: [...existing, optimisticSource] };
      });

      return { previous, optimisticId };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notebooks', notebookId], context.previous);
      }
    },
    onSuccess: (response: any, _payload: AddSourcePayload, context) => {
      const addedSource = response?.data as Source | undefined;
      if (!addedSource?._id) return;

      updateNotebookQueryCache(queryClient, notebookId, (nb) => {
        const existing = nb.sources ?? [];
        const withoutOptimistic = context?.optimisticId
          ? existing.filter((s) => s._id !== context.optimisticId)
          : existing;

        const alreadyThere = withoutOptimistic.some((s) => s._id === addedSource._id);
        if (alreadyThere) return nb;
        return { ...nb, sources: [...withoutOptimistic, addedSource] };
      });
    },
    onSettled: () => {
      // Ensure we converge with backend (and pick up any server-side derived fields)
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] });
    },
  });
};

export const useToggleSource = (notebookId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => notebookService.toggleSource(notebookId, sourceId),
    onMutate: async (sourceId: string) => {
      await queryClient.cancelQueries({ queryKey: ['notebooks', notebookId] });

      const previous = queryClient.getQueryData(['notebooks', notebookId]);

      // Optimistic toggle so UI updates immediately
      updateNotebookQueryCache(queryClient, notebookId, (nb) => ({
        ...nb,
        sources: (nb.sources ?? []).map((s) =>
          s._id === sourceId ? { ...s, selected: !s.selected } : s
        )
      }));

      return { previous };
    },
    onError: (_err, _sourceId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notebooks', notebookId], context.previous);
      }
    },
    onSuccess: (response: any) => {
      // Server is source of truth
      const updated = response?.data as Source | undefined;
      if (!updated?._id) return;
      updateNotebookQueryCache(queryClient, notebookId, (nb) => ({
        ...nb,
        sources: (nb.sources ?? []).map((s) => (s._id === updated._id ? { ...s, selected: updated.selected } : s))
      }));
    },
    onSettled: () => {
      // Ensure we converge with backend even if response shape changes
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] });
    },
  });
};

export const useRemoveSource = (notebookId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => notebookService.removeSource(notebookId, sourceId),
    onSuccess: (_response: any, sourceId: string) => {
      updateNotebookQueryCache(queryClient, notebookId, (nb) => ({
        ...nb,
        sources: (nb.sources ?? []).filter((s) => s._id !== sourceId)
      }));
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
    mutationFn: (data: { type: 'quiz' | 'mindmap' | 'flashcards' | 'infographic' | 'course-finder'; referenceId: string; title: string; data?: any }) =>
      notebookService.linkArtifact(notebookId, data),
    onSuccess: (response: any) => {
      const added = response?.data as Artifact | undefined;
      if (!added?._id) return;
      updateNotebookQueryCache(queryClient, notebookId, (nb) => {
        const existing = nb.artifacts ?? [];
        const alreadyThere = existing.some((a) => a._id === added._id);
        if (alreadyThere) return nb;
        return { ...nb, artifacts: [...existing, added] };
      });
    },
    onSettled: () => {
      // Ensure we converge with backend to pick up the linked artifact
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] });
    },
  });
};

export const useUnlinkArtifact = (notebookId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artifactId: string) => notebookService.unlinkArtifact(notebookId, artifactId),
    onSuccess: (_response: any, artifactId: string) => {
      updateNotebookQueryCache(queryClient, notebookId, (nb) => ({
        ...nb,
        artifacts: (nb.artifacts ?? []).filter((a) => a._id !== artifactId)
      }));
    },
    onSettled: () => {
      // Ensure we converge with backend after unlinking
      queryClient.invalidateQueries({ queryKey: ['notebooks', notebookId] });
    },
  });
};
