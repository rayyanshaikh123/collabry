'use client';

import React, { useState } from 'react';
import { ICONS } from '../../constants';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizCardProps {
  questions: QuizQuestion[];
  onComplete?: (score: number) => void;
  onSaveToStudio?: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ questions, onComplete, onSaveToStudio }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const handleAnswerSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleNext = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer;
    const newAnswers = [...answers, isCorrect];
    setAnswers(newAnswers);
    setShowResult(true);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setQuizCompleted(true);
        const score = Math.round((newAnswers.filter(a => a).length / questions.length) * 100);
        onComplete?.(score);
      }
    }, 2000);
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnswers([]);
    setQuizCompleted(false);
  };

  if (quizCompleted) {
    const correctCount = answers.filter(a => a).length;
    const score = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎉</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">Quiz Complete!</h3>
          <div className="text-5xl font-black text-indigo-600 mb-4">{score}%</div>
          <p className="text-slate-600 mb-6">
            You got <span className="font-bold text-indigo-600">{correctCount}</span> out of{' '}
            <span className="font-bold">{questions.length}</span> questions correct
          </p>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
            >
              Try Again
            </button>
            {onSaveToStudio && (
              <button
                onClick={onSaveToStudio}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <ICONS.Download className="w-4 h-4" />
                Save to Studio
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <ICONS.lightbulb className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-600">Question {currentQuestion + 1}</h3>
            <p className="text-xs text-slate-400">of {questions.length}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Score</p>
          <p className="text-sm font-bold text-indigo-600">
            {answers.filter(a => a).length}/{currentQuestion}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-6">
        <h2 className="text-lg font-black text-slate-900 mb-4">{question.question}</h2>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === question.correctAnswer;
          const showCorrect = showResult && isCorrect;
          const showIncorrect = showResult && isSelected && !isCorrect;

          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={showResult}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                showCorrect
                  ? 'border-green-500 bg-green-50'
                  : showIncorrect
                  ? 'border-red-500 bg-red-50'
                  : isSelected
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                    showCorrect
                      ? 'bg-green-500 text-white'
                      : showIncorrect
                      ? 'bg-red-500 text-white'
                      : isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {showCorrect ? '✓' : showIncorrect ? '✗' : String.fromCharCode(65 + index)}
                </div>
                <span className={`font-medium ${showResult ? 'text-slate-700' : 'text-slate-800'}`}>
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showResult && question.explanation && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <ICONS.lightbulb className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-indigo-900 text-sm mb-1">Explanation</h4>
              <p className="text-sm text-indigo-800">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Next Button */}
      {!showResult && (
        <button
          onClick={handleNext}
          disabled={selectedAnswer === null}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          {currentQuestion === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
        </button>
      )}
    </div>
  );
};

export default QuizCard;
