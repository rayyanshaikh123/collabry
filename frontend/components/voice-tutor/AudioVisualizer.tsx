'use client';

import React from 'react';

interface AudioVisualizerProps {
  tutorSpeaking: boolean;
  visualizerData: number[];
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  tutorSpeaking,
  visualizerData
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border-4 border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-center gap-2 h-32">
        {visualizerData.map((height, i) => (
          <div
            key={i}
            className="w-2 bg-gradient-to-t from-indigo-500 to-indigo-300 dark:from-indigo-600 dark:to-indigo-400 rounded-full transition-all duration-100"
            style={{
              height: `${Math.max(10, height)}%`,
              opacity: tutorSpeaking ? 0.8 : 0.2,
            }}
          />
        ))}
      </div>
      {tutorSpeaking && (
        <p className="text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-4">
          Tutor is speaking...
        </p>
      )}
    </div>
  );
};
