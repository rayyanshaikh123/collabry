'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useNotebooks, useDeleteNotebook } from '@/hooks/useNotebook';
import { Card, Button } from '../../../components/UIElements';
import { ICONS } from '../../../constants';
import { showError, showConfirm } from '@/lib/alert';
import NotebookInvitations from '../../../components/study-notebook/NotebookInvitations';

export default function StudyNotebooksPage() {
  const router = useRouter();
  const { data: notebooksData, isLoading, error } = useNotebooks();
  const deleteNotebook = useDeleteNotebook();

  // Handle both response structures (wrapped { data: [...] } or raw array)
  const maybeWrapped = (notebooksData as any)?.data;
  const notebooks = Array.isArray(maybeWrapped)
    ? (maybeWrapped as any[])
    : Array.isArray(notebooksData)
      ? (notebooksData as any[])
      : [];

  const handleCreateNew = () => {
    router.push('/study-notebook/new');
  };

  const handleOpenNotebook = (id: string) => {
    router.push(`/study-notebook/${id}`);
  };

  const handleDeleteNotebook = async (id: string, title: string) => {
    showConfirm(
      `Are you sure you want to delete "${title}"?`,
      async () => {
        try {
          await deleteNotebook.mutateAsync(id);
        } catch (error: any) {
          console.error('Failed to delete notebook:', error);
          showError(error.message || 'Failed to delete notebook. Please try again.');
        }
      },
      'Delete Notebook',
      'Delete',
      'Cancel'
    );
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center box-border bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400 font-semibold">Loading notebooks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Error loading notebooks:', error);
    return (
      <div className="h-full w-full flex items-center justify-center box-border bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 dark:text-red-400 font-semibold">Failed to load notebooks</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
            {error instanceof Error ? error.message : 'Please check your connection and try again'}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show empty state even if no data (not an error, just empty)
  return (
    <div className="h-full flex flex-col relative bg-slate-50 dark:bg-slate-950 overflow-hidden -m-4 md:-m-8">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b-4 border-slate-100 dark:border-slate-800 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-200">Study Notebooks 📓</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Manage your AI-powered study sessions with sources and artifacts
            </p>
          </div>
          <Button onClick={handleCreateNew} variant="primary" className="gap-2">
            <ICONS.plus className="w-5 h-5" />
            Create New Notebook
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <NotebookInvitations />
        {/* Stats Cards */}
        {notebooks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="flex items-center gap-4 bg-gradient-to-br from-indigo-50 dark:from-indigo-900/30 to-white dark:to-slate-900 border-indigo-100 dark:border-indigo-800">
              <div className="w-14 h-14 bg-indigo-500 dark:bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50">
                <ICONS.Book className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-200">{notebooks.length}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">Total Notebooks</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 bg-gradient-to-br from-emerald-50 dark:from-emerald-900/30 to-white dark:to-slate-900 border-emerald-100 dark:border-emerald-800">
              <div className="w-14 h-14 bg-emerald-500 dark:bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50">
                <ICONS.fileText className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-200">
                  {notebooks.reduce((acc, nb) => acc + (nb.sources?.length || 0), 0)}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Total Sources</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 bg-gradient-to-br from-amber-50 dark:from-amber-900/30 to-white dark:to-slate-800 border-amber-100 dark:border-amber-800">
              <div className="w-14 h-14 bg-amber-400 dark:bg-amber-500 rounded-2xl flex items-center justify-center text-slate-800 dark:text-slate-200 shadow-lg shadow-amber-200 dark:shadow-amber-900/50">
                <ICONS.lightbulb className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-3xl font-black text-slate-800 dark:text-slate-200">
                  {notebooks.reduce((acc, nb) => acc + (nb.artifacts?.length || 0), 0)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Total Artifacts</p>
              </div>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {notebooks.length === 0 && (
          <Card className="text-center py-20">
            <div className="mx-auto w-32 h-32 bg-indigo-500 dark:bg-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 dark:shadow-indigo-900/50">
              <ICONS.Book className="w-16 h-16 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-200 mb-3">
              No notebooks yet! 🚀
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto font-medium">
              Create your first study notebook to organize sources, chat with AI, and generate
              study materials like quizzes and mind maps.
            </p>
            <Button
              onClick={handleCreateNew}
              variant="primary"
              size="lg"
              className="gap-2 mx-auto"
            >
              <ICONS.plus className="w-5 h-5" />
              Create Your First Notebook
            </Button>
          </Card>
        )}

        {/* Notebooks Grid */}
        {notebooks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notebooks.map((notebook) => (
              <Card
                key={notebook._id}
                hoverable
                className="cursor-pointer"
              >
                <div onClick={() => handleOpenNotebook(notebook._id)}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-1 line-clamp-1">
                        📓 {notebook.title}
                      </h3>
                      {notebook.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 font-medium">
                          {notebook.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotebook(notebook._id, notebook.title);
                      }}
                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all hover:scale-110"
                    >
                      <ICONS.trash className="w-5 h-5 text-rose-500 dark:text-rose-400" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold">
                      <ICONS.fileText className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>{notebook.sources?.length || 0} sources</span>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold">
                      <ICONS.lightbulb className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>{notebook.artifacts?.length || 0} artifacts</span>
                    </div>
                  </div>

                  {/* AI Session Badge */}
                  {notebook.aiSessionId && (
                    <div className="mb-4">
                      <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-xs font-bold shadow-md">
                        <ICONS.zap className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <span>AI Active</span>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t-2 border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {new Date(notebook.lastAccessed).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 font-bold text-sm group-hover:translate-x-1 transition-transform">
                      <span>Open</span>
                      <ICONS.ChevronRight className="w-4 h-4" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


