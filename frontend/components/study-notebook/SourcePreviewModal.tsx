'use client';

import React from 'react';
import { Card, Button } from '../UIElements';
import { ICONS } from '../../constants';

// Helper to format seconds as MM:SS
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SourcePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  notebookId: string;
  source: {
    id: string;
    name: string;
    type: 'pdf' | 'text' | 'website' | 'audio';
    content: string;
    transcriptionSegments?: Array<{
      start: number;
      end: number;
      text: string;
    }>;
  } | null;
}

const SourcePreviewModal: React.FC<SourcePreviewModalProps> = ({
  isOpen,
  onClose,
  isLoading,
  notebookId,
  source,
}) => {
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [activeTab, setActiveTab] = React.useState<'transcript' | 'plain'>('transcript');
  const [currentTime, setCurrentTime] = React.useState(0);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  React.useEffect(() => {
    if (isOpen && source?.type === 'audio' && notebookId) {
      const fetchAudio = async () => {
        setIsAudioLoading(true);
        try {
          const { apiClient } = await import('@/lib/api');
          const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
          const url = `${baseURL}/notebook/notebooks/${notebookId}/sources/${source.id}/audio`;

          const response = await apiClient.getClient().get(url, {
            responseType: 'blob'
          });

          const blobUrl = URL.createObjectURL(new Blob([response.data]));
          setAudioUrl(blobUrl);
        } catch (err) {
          console.error('Failed to load audio:', err);
        } finally {
          setIsAudioLoading(false);
        }
      };

      fetchAudio();
    }

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
    };
  }, [isOpen, source?.id, source?.type, notebookId]);

  if (!isOpen) return null;

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'text':
        return '📝';
      case 'website':
        return '🌐';
      case 'audio':
        return '🎙️';
      default:
        return '📁';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'PDF Document';
      case 'text':
        return 'Text File';
      case 'website':
        return 'Website';
      case 'audio':
        return 'Audio Transcription';
      default:
        return 'Source';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-2 border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-700 dark:to-purple-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{source ? getSourceIcon(source.type) : '📁'}</div>
            <div>
              <h2 className="text-xl font-black text-white">{source?.name || 'Source Preview'}</h2>
              <p className="text-sm text-indigo-100">
                {source ? getTypeLabel(source.type) : 'Loading...'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <ICONS.close className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-purple-600 dark:bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-pink-600 dark:bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Loading source content...</p>
            </div>
          ) : !source ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📂</div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">No source selected</p>
            </div>
          ) : (
            <div className="space-y-6">
              {source.type === 'audio' && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                      <ICONS.Mic className="w-5 h-5" />
                    </span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Recording Player</h3>
                  </div>

                  {isAudioLoading ? (
                    <div className="h-12 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                      <span className="text-xs text-slate-500 animate-pulse">Loading audio stream...</span>
                    </div>
                  ) : audioUrl ? (
                    <audio
                      ref={audioRef}
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      className="w-full h-12 rounded-xl"
                      src={audioUrl}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  ) : (
                    <div className="h-12 flex items-center justify-center bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                      <span className="text-xs text-rose-600 dark:text-rose-400">Failed to load audio recording.</span>
                    </div>
                  )}

                  {source.transcriptionSegments && source.transcriptionSegments.length > 0 && (
                    <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Interactive Transcript</h4>
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                          <button
                            onClick={() => setActiveTab('transcript')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === 'transcript' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Segments
                          </button>
                          <button
                            onClick={() => setActiveTab('plain')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${activeTab === 'plain' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Full Text
                          </button>
                        </div>
                      </div>

                      {activeTab === 'transcript' ? (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {source.transcriptionSegments.map((segment, idx) => {
                            const isActive = currentTime >= segment.start && currentTime <= (segment.end || segment.start + 5);
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (audioRef.current) {
                                    audioRef.current.currentTime = segment.start;
                                    audioRef.current.play();
                                  }
                                }}
                                className={`w-full text-left p-3 rounded-xl border transition-all group ${isActive
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20'
                                  : 'border-transparent hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:bg-white dark:hover:bg-slate-800'
                                  }`}
                              >
                                <div className="flex gap-3">
                                  <span className={`text-[10px] font-mono mt-0.5 tabular-nums ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {formatTime(segment.start)}
                                  </span>
                                  <p className={`text-sm transition-colors ${isActive ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                                    {segment.text}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                          {source.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {source.type !== 'audio' && (
                <div className="prose prose-sm max-w-none prose-slate dark:prose-invert prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800 prose-code:text-indigo-600 dark:prose-code:text-indigo-400">
                  {source.type === 'website' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {source.content}
                    </ReactMarkdown>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      {source.content}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SourcePreviewModal;
