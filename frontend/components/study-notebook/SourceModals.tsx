'use client';

import React from 'react';

interface SourceModalsProps {
  // Text modal
  addTextModalOpen: boolean;
  textTitle: string;
  textContent: string;
  setTextTitle: (value: string) => void;
  setTextContent: (value: string) => void;
  onSubmitText: () => void;
  onCloseTextModal: () => void;

  // Website modal
  addWebsiteModalOpen: boolean;
  websiteUrl: string;
  setWebsiteUrl: (value: string) => void;
  onSubmitWebsite: () => void;
  onCloseWebsiteModal: () => void;
}

export function SourceModals({
  addTextModalOpen,
  textTitle,
  textContent,
  setTextTitle,
  setTextContent,
  onSubmitText,
  onCloseTextModal,
  addWebsiteModalOpen,
  websiteUrl,
  setWebsiteUrl,
  onSubmitWebsite,
  onCloseWebsiteModal,
}: SourceModalsProps) {
  return (
    <>
      {/* Add Text Modal */}
      {addTextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
          <div className="w-11/12 max-w-2xl bg-white dark:bg-slate-900 rounded-lg p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">Add Text Source</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Enter a title for this text source"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Content *</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste or type your text content here..."
                  rows={10}
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onCloseTextModal}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSubmitText}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Website Modal */}
      {addWebsiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
          <div className="w-11/12 max-w-xl bg-white dark:bg-slate-900 rounded-lg p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-4">Add Website Source</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Website URL *</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Enter a valid URL (e.g., https://example.com). The AI can scrape the content for you.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onCloseWebsiteModal}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onSubmitWebsite}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-800 transition-colors"
              >
                Add Website
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
