'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateNotebook } from '../../src/hooks/useNotebook';
import { ICONS } from '../../constants';
import { Button, Card, Input } from '../UIElements';
import api from '../../src/lib/api';

export default function CreateNotebookForm() {
  const router = useRouter();
  const createNotebook = useCreateNotebook();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create notebook
      const response = await createNotebook.mutateAsync({ 
        title: title.trim(), 
        description: description.trim() 
      });

      const notebookId = response?.data?._id;

      if (!notebookId) {
        throw new Error('Failed to get notebook ID');
      }

      // Upload sources if any
      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', 'pdf');
          formData.append('name', file.name);

          try {
            await api.post(`/notebook/notebooks/${notebookId}/sources`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (error) {
            console.error('Failed to upload source:', file.name, error);
          }
        }
      }

      // Redirect to the new notebook
      router.push(`/study-notebook/${notebookId}`);
    } catch (error) {
      console.error('Failed to create notebook:', error);
      alert('Failed to create notebook. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-slate-50 overflow-hidden -m-4 md:-m-8">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 pt-8">
            <div className="mx-auto w-20 h-20 bg-indigo-500 rounded-[2rem] flex items-center justify-center mb-4 shadow-xl shadow-indigo-200">
              <span className="text-4xl">📓</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800 mb-2">
              Create New Study Notebook
            </h1>
            <p className="text-slate-600 font-medium">
              Add your study materials and start learning with AI
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
          <Card className="space-y-6">
            {/* Title Input */}
            <div>
              <label htmlFor="title" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Notebook Title *
              </label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Computer Science 101"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="description" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what you'll be studying..."
                rows={3}
                className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-sm font-medium resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="sources" className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Add Sources (Optional)
              </label>
              <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all">
                <input
                  id="sources"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="sources"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-3">
                    <ICONS.Upload className="w-8 h-8 text-indigo-600" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 mb-1">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    PDF, TXT, DOC, DOCX (Max 50MB each)
                  </span>
                </label>
              </div>

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-bold text-slate-700 uppercase tracking-wider">Selected Files:</p>
                  <ul className="space-y-2">
                    {files.map((file, index) => (
                      <li key={index} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-2xl border-2 border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <ICONS.fileText className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-700 block">{file.name}</span>
                            <span className="text-xs text-slate-500 font-medium">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, i) => i !== index))}
                          className="p-2 hover:bg-rose-50 rounded-xl transition-all hover:scale-110"
                          disabled={isSubmitting}
                        >
                          <ICONS.X className="w-4 h-4 text-rose-500" strokeWidth={2.5} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                onClick={() => router.push('/study-notebook')}
                variant="secondary"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <ICONS.Plus className="w-5 h-5" />
                    <span>Create Notebook</span>
                  </>
                )}
              </Button>
            </div>
          </Card>

            {/* Help Text */}
            <div className="mt-6 text-center text-sm text-slate-600 font-medium pb-8">
              <p>You can add more sources and materials after creating the notebook ✨</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
