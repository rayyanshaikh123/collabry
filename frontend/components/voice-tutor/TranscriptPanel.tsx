'use client';

import React, { useRef, useEffect } from 'react';

interface ConversationTurn {
  speaker: 'student' | 'tutor';
  text: string;
  timestamp: string;
}

interface TranscriptPanelProps {
  transcript: ConversationTurn[];
  connected: boolean;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  transcript,
  connected
}) => {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-3xl border-4 border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col"
      style={{ height: connected ? '500px' : 'auto' }}
    >
      <div className="px-6 py-4 border-b-4 border-slate-100 dark:border-slate-800">
        <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">
          Conversation Transcript
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {transcript.length === 0 && !connected && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎓</div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">
              Start a voice session to begin learning
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
              Your AI tutor will teach through interactive conversation
            </p>
          </div>
        )}

        {transcript.length === 0 && connected && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-500 mx-auto mb-4"></div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">
              Waiting for tutor...
            </p>
          </div>
        )}

        {transcript.map((turn, i) => (
          <div
            key={i}
            className={`flex ${turn.speaker === 'student' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                turn.speaker === 'student'
                  ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">
                  {turn.speaker === 'student' ? '👤' : '🤖'}
                </span>
                <span className="text-xs font-black uppercase opacity-70">
                  {turn.speaker === 'student' ? 'You' : 'Tutor'}
                </span>
              </div>
              <p className="font-medium text-sm leading-relaxed">{turn.text}</p>
              <p
                className={`text-xs mt-2 opacity-60 ${
                  turn.speaker === 'student'
                    ? 'text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {new Date(turn.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );
};
