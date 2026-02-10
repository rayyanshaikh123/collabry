'use client';

import React from 'react';
import { ICONS } from '@/constants';

interface FileUploadSectionProps {
  selectedFile: File | null;
  loading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileRemove: () => void;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  selectedFile,
  loading,
  onFileChange,
  onFileRemove
}) => {
  return (
    <div className="max-w-7xl mx-auto mb-6">
      <div className="bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <label className="block font-bold text-slate-700 dark:text-slate-300">
            Upload Study Material
          </label>
          <span className="text-rose-500 dark:text-rose-400 text-sm font-black">*Required</span>
        </div>
        <div className="relative">
          <input
            type="file"
            accept=".txt,.md,.pdf,.doc,.docx"
            onChange={onFileChange}
            disabled={loading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center gap-3 w-full p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 cursor-pointer transition-colors"
          >
            {selectedFile ? (
              <>
                <ICONS.FileText className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                <div className="text-center">
                  <p className="font-bold text-slate-700 dark:text-slate-300">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onFileRemove();
                  }}
                  className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
                >
                  <ICONS.X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <ICONS.Upload className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                <div className="text-center">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Click to upload study material</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    TXT, MD, PDF, DOC, or DOCX files
                  </p>
                </div>
              </>
            )}
          </label>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Upload your study material (notes, textbooks, documents) to create a personalized learning session. The AI tutor will use this content to guide the conversation.
        </p>
      </div>
    </div>
  );
};
