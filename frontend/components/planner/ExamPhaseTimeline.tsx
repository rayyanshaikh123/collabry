/**
 * ExamPhaseTimeline Component
 * Displays exam countdown with phase progression visual
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ExamStrategyContext } from '@/types/planner.types';

interface ExamPhaseTimelineProps {
  examStrategy: ExamStrategyContext;
}

const phaseConfig = {
  preparation: {
    label: 'Preparation',
    color: 'bg-green-500',
    icon: '📚',
    description: 'Foundation building phase',
  },
  acceleration: {
    label: 'Acceleration',
    color: 'bg-blue-500',
    icon: '🚀',
    description: 'Increasing study intensity',
  },
  intensive: {
    label: 'Intensive',
    color: 'bg-orange-500',
    icon: '🔥',
    description: 'High-intensity revision',
  },
  final: {
    label: 'Final Sprint',
    color: 'bg-red-600',
    icon: '⚡',
    description: 'Last-minute consolidation',
  },
};

export const ExamPhaseTimeline: React.FC<ExamPhaseTimelineProps> = ({ examStrategy }) => {
  const {
    examDate,
    daysUntilExam,
    currentPhase,
    intensityMultiplier,
    taskDensityPerDay,
    phaseDescription,
    recommendations,
  } = examStrategy;

  // Guard clause - don't render if exam mode is disabled or data is missing
  if (!examDate || !currentPhase || intensityMultiplier === undefined || daysUntilExam === undefined) {
    return null;
  }

  const phaseInfo = phaseConfig[currentPhase as keyof typeof phaseConfig];
  const examDateFormatted = new Date(examDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate progress (assuming 30 days max, progress decreases as exam approaches)
  const totalDays = 30;
  const progress = Math.max(0, ((totalDays - daysUntilExam) / totalDays) * 100);

  return (
    <Card className="border-l-4" style={{ borderLeftColor: phaseInfo ? phaseInfo.color.replace('bg-', '#') : '#3b82f6' }}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{phaseInfo?.icon}</span>
            <span>Exam Timeline</span>
          </div>
          <div className="text-sm font-normal text-gray-500">
            {daysUntilExam} days left
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Countdown Display */}
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {daysUntilExam}
          </div>
          <div className="text-sm text-gray-500">days until exam</div>
          <div className="text-xs text-gray-400 mt-1">{examDateFormatted}</div>
        </div>

        {/* Phase Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{phaseInfo?.label} Phase</span>
            <span className="text-xs text-gray-500">{phaseInfo?.description}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-600 dark:text-gray-400">{phaseDescription}</p>
        </div>

        {/* Intensity Indicators */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">Intensity</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {intensityMultiplier.toFixed(1)}x
            </div>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400">Tasks/Day</div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {taskDensityPerDay}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Phase Recommendations:
            </div>
            <ul className="space-y-1">
              {recommendations.slice(0, 3).map((rec, idx) => (
                <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1">
                  <span className="text-blue-500">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
