'use client';

import React, { useState } from 'react';
import { Button } from '../UIElements';
import { ICONS } from '../../constants';
import { Flashcard } from '../../lib/flashcardParser';

interface FlashcardViewerProps {
  cards: Flashcard[];
  onSaveToStudio?: () => void;
}

const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ cards, onSaveToStudio }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState<'sequential' | 'random'>('sequential');

  if (!cards || cards.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500 dark:text-slate-400">
        No flashcards available
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    if (studyMode === 'random') {
      const randomIndex = Math.floor(Math.random() * cards.length);
      setCurrentIndex(randomIndex);
    } else {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
            {currentIndex + 1} / {cards.length}
          </span>
          <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setStudyMode('sequential')}
              className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                studyMode === 'sequential'
                  ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Sequential
            </button>
            <button
              onClick={() => setStudyMode('random')}
              className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                studyMode === 'random'
                  ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-200 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Random
            </button>
          </div>
        </div>
        {onSaveToStudio && (
          <button
            onClick={onSaveToStudio}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <ICONS.download className="w-4 h-4" />
            Save to Studio
          </button>
        )}
      </div>

      {/* Flashcard */}
      <div
        className="relative h-96 cursor-pointer perspective-1000"
        onClick={handleFlip}
        style={{ perspective: '1000px' }}
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute w-full h-full backface-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl shadow-xl border-2 border-blue-200 dark:border-blue-800 p-8 flex flex-col items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="text-sm font-black text-blue-600 dark:text-blue-400 mb-4 uppercase tracking-wide">
              Question
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 text-center leading-relaxed">
              {currentCard.front}
            </div>
            <div className="mt-8 text-sm text-slate-500 dark:text-slate-400 italic">
              Click to reveal answer
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute w-full h-full backface-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-700 dark:to-slate-800 rounded-2xl shadow-xl border-2 border-emerald-200 dark:border-emerald-800 p-8 flex flex-col items-center justify-center"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mb-4 uppercase tracking-wide">
              Answer
            </div>
            <div className="text-xl font-medium text-slate-800 dark:text-slate-200 text-center leading-relaxed">
              {currentCard.back}
            </div>
            {currentCard.category && (
              <div className="mt-6 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-bold">
                {currentCard.category}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrevious}
          disabled={cards.length === 1}
          className="p-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          <ICONS.ChevronLeft className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </button>
        <button
          onClick={handleFlip}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <ICONS.refresh className="w-5 h-5" />
          Flip Card
        </button>
        <button
          onClick={handleNext}
          disabled={cards.length === 1}
          className="p-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          <ICONS.ChevronRight className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        </button>
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center gap-2">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              setIsFlipped(false);
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-blue-600 dark:bg-blue-400 w-8'
                : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default FlashcardViewer;
