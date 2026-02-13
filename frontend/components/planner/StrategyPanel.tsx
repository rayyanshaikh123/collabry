/**
 * StrategyPanel Component
 * Main strategy system UI - displays mode, recommendations, and controls
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Sparkles, Info } from 'lucide-react';
import { StrategyBadge } from './StrategyBadge';
import { ExamPhaseTimeline } from './ExamPhaseTimeline';
import { CognitiveLoadChart } from './CognitiveLoadChart';
import { ExamModeToggle } from './ExamModeToggle';
import { studyPlannerService } from '@/lib/services/studyPlanner.service';
import type {
  StrategyRecommendation,
  ExamStrategyContext,
  StrategyMode,
} from '@/types/planner.types';
import type { StudyTask } from '@/lib/services/studyPlanner.service';

interface StrategyPanelProps {
  planId: string;
  tasks: StudyTask[];
  onStrategyExecuted?: () => void;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({
  planId,
  tasks,
  onStrategyExecuted,
}) => {
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [recommendation, setRecommendation] = useState<StrategyRecommendation | null>(null);
  const [examStrategy, setExamStrategy] = useState<ExamStrategyContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load strategy data
  const loadStrategyData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[StrategyPanel] Loading data for plan:', planId);
      
      const [recData, examData] = await Promise.all([
        studyPlannerService.getRecommendedMode(planId),
        studyPlannerService.getExamStrategy(planId),
      ]);
      
      console.log('[StrategyPanel] Recommendation data:', recData);
      console.log('[StrategyPanel] Exam strategy data:', examData);
      
      if (!recData) {
        throw new Error('No recommendation data received from server');
      }
      
      setRecommendation(recData as any);
      setExamStrategy(examData as any);
    } catch (err: any) {
      console.error('[StrategyPanel] Failed to load strategy data:', err);
      console.error('[StrategyPanel] Error details:', { message: err.message, response: err.response, status: err.status });
      setError(err.message || 'Failed to load strategy recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStrategyData();
  }, [planId]);

  // Execute strategy (auto mode)
  const handleAutoExecute = async () => {
    setExecuting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await studyPlannerService.autoExecuteStrategy(planId);
      if (result.success) {
        setSuccessMessage(result.message);
        // Reload strategy data
        await loadStrategyData();
        // Notify parent to refresh tasks
        onStrategyExecuted?.();
      } else {
        setError(result.message || 'Strategy execution failed');
      }
    } catch (err: any) {
      console.error('Failed to execute strategy:', err);
      setError(err.message || 'Failed to execute strategy');
    } finally {
      setExecuting(false);
    }
  };

  // Execute specific strategy mode
  const handleManualExecute = async (mode: StrategyMode) => {
    setExecuting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await studyPlannerService.executeStrategy(planId, mode);
      if (result.success) {
        setSuccessMessage(`${mode.charAt(0).toUpperCase() + mode.slice(1)} strategy applied successfully!`);
        await loadStrategyData();
        onStrategyExecuted?.();
      } else {
        setError(result.message || 'Strategy execution failed');
      }
    } catch (err: any) {
      console.error('Failed to execute strategy:', err);
      setError(err.message || 'Failed to execute strategy');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading strategy...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !recommendation) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Exam Mode Enable Card (if not enabled) */}
      {examStrategy && !examStrategy.enabled && (
        <ExamModeToggle planId={planId} onExamModeEnabled={loadStrategyData} />
      )}

      {/* Main Strategy Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span>Study Strategy</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadStrategyData}
              disabled={loading || executing}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* No Data Message */}
          {!recommendation && !error && (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No strategy data available</p>
              <p className="text-sm mt-1">Click refresh to try again</p>
            </div>
          )}
          
          {/* Current Mode */}
          {recommendation && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recommended Mode:
                </span>
                <StrategyBadge
                  mode={recommendation.recommendedMode as StrategyMode}
                  confidence={recommendation.confidence}
                />
              </div>

              {/* Metrics Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Completion</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {Math.round(recommendation.metrics.completionRate)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Backlog</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {recommendation.metrics.backlog}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Streak</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {recommendation.metrics.currentStreak}
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              {recommendation.reasoning.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Info className="w-4 h-4" />
                    <span>Why this strategy?</span>
                  </div>
                  <ul className="space-y-1 pl-5">
                    {recommendation.reasoning.map((reason, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 list-disc">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAutoExecute}
                  disabled={executing}
                  className="flex-1"
                >
                  {executing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Apply Recommended Strategy
                    </>
                  )}
                </Button>
              </div>

              {/* Manual Strategy Selection */}
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                  Or choose manually...
                </summary>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManualExecute('balanced')}
                    disabled={executing}
                    title="Basic scheduling - works for all plans"
                  >
                    ⚖️ Balanced
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManualExecute('adaptive')}
                    disabled={executing || !examStrategy?.enabled}
                    title={examStrategy?.enabled ? "Exam-driven scheduling with priority scoring" : "Requires exam mode to be enabled"}
                  >
                    🎯 Adaptive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManualExecute('emergency')}
                    disabled={executing}
                    title="Crisis mode - works with or without exam date"
                  >
                    ⚠️ Emergency
                  </Button>
                </div>
                {!examStrategy?.enabled && (
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Enable exam mode to unlock Adaptive strategy
                  </p>
                )}
              </details>
            </div>
          )}

          {/* Success/Error Messages */}
          {successMessage && (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <AlertDescription className="text-green-700 dark:text-green-400">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Exam Timeline (if exam mode) */}
      {examStrategy && examStrategy.enabled && (
        <ExamPhaseTimeline examStrategy={examStrategy} />
      )}

      {/* Cognitive Load Chart */}
      {recommendation && tasks.length > 0 && (
        <CognitiveLoadChart
          tasks={tasks}
          strategyMode={recommendation.recommendedMode as StrategyMode}
        />
      )}
    </div>
  );
};
