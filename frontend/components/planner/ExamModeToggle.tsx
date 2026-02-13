/**
 * ExamModeToggle Component
 * Allows users to enable exam mode and set exam date
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Loader2, AlertCircle } from 'lucide-react';
import { studyPlannerService } from '@/lib/services/studyPlanner.service';

interface ExamModeToggleProps {
  planId: string;
  onExamModeEnabled?: () => void;
}

export const ExamModeToggle: React.FC<ExamModeToggleProps> = ({
  planId,
  onExamModeEnabled,
}) => {
  const [examDate, setExamDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEnableExamMode = async () => {
    if (!examDate) {
      setError('Please select an exam date');
      return;
    }

    const selectedDate = new Date(examDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate <= today) {
      setError('Exam date must be in the future');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await studyPlannerService.enableExamMode(planId, examDate, true);
      setSuccess(true);
      setTimeout(() => {
        onExamModeEnabled?.();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to enable exam mode:', err);
      setError(err.message || 'Failed to enable exam mode');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <AlertDescription className="text-green-700 dark:text-green-400">
          ✅ Exam mode enabled! Reloading strategy...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-dashed border-blue-300 dark:border-blue-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-5 h-5 text-blue-500" />
          <span>Enable Exam Mode</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Set your exam date to unlock intelligent exam-driven scheduling with priority scoring and adaptive intensity.
        </p>

        <div className="space-y-2">
          <label htmlFor="examDate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Exam Date
          </label>
          <input
            id="examDate"
            type="date"
            value={examDate}
            onChange={(e) => {
              setExamDate(e.target.value);
              setError(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleEnableExamMode}
          disabled={loading || !examDate}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enabling...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Enable Exam Mode
            </>
          )}
        </Button>

        <div className="pt-2 border-t text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p><strong>What you'll get:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 pl-2">
            <li>4-phase exam system (Preparation → Final Sprint)</li>
            <li>Priority scoring based on exam proximity</li>
            <li>Dynamic intensity multipliers (1.0x → 1.5x)</li>
            <li>Cognitive load balancing</li>
            <li>Automatic missed task redistribution</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
