/**
 * FRONTEND: ConflictWarning Component
 * File: frontend/src/components/SmartCalendar/ConflictWarning.tsx
 * 
 * Purpose: Display task conflicts with resolution options
 * Features:
 * - List all unresolved conflicts
 * - Show overlap details (time, duration)
 * - Auto-resolve with one click
 * - Accept/ignore conflict action
 * 
 * Used in: CalendarWeekView, ConflictPanel (side panel)
 */

import React, { useState } from 'react';
import { ConflictData, useResolveConflict } from '@/hooks/useCalendarData';
import { AlertTriangle, CheckCircle2, X, Clock, RefreshCw } from 'lucide-react';

interface ConflictWarningProps {
  conflict: ConflictData;
  task1Title?: string;
  task2Title?: string;
  onResolve?: () => void;
}

// ============================================================================
// SEVERITY COLOR MAPPING
// ============================================================================

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high':
      return 'bg-red-50 border-red-300 text-red-900';
    case 'medium':
      return 'bg-yellow-50 border-yellow-300 text-yellow-900';
    case 'low':
      return 'bg-blue-50 border-blue-300 text-blue-900';
    default:
      return 'bg-gray-50 border-gray-300';
  }
};

const getSeverityBadgeColor = (severity: string): string => {
  switch (severity) {
    case 'high':
      return 'bg-red-200 text-red-800';
    case 'medium':
      return 'bg-yellow-200 text-yellow-800';
    case 'low':
      return 'bg-blue-200 text-blue-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'resolved':
      return <CheckCircle2 size={16} className="text-green-600" />;
    case 'accepted':
      return <CheckCircle2 size={16} className="text-blue-600" />;
    default:
      return <AlertTriangle size={16} className="text-red-600" />;
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ConflictWarning: React.FC<ConflictWarningProps> = ({
  conflict,
  task1Title = 'Task 1',
  task2Title = 'Task 2',
  onResolve,
}) => {
  const { mutateAsync: resolveConflict, isPending } = useResolveConflict();
  const [isResolved, setIsResolved] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAutoResolve = async () => {
    try {
      const result = await resolveConflict({ conflictId: conflict._id });

      if (result.success) {
        setIsResolved(true);
        onResolve?.();
      }
    } catch (error) {
      console.error('[ConflictWarning] Resolution failed:', error);
      // TODO: Show error toast
    }
  };

  const handleAcceptConflict = () => {
    setAccepted(true);
    // TODO: Call API to mark as accepted
  };

  const handleDismiss = () => {
    // Just hide this warning
  };

  // ============================================================================
  // EARLY RETURNS
  // ============================================================================

  if (isResolved) {
    return (
      <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-300 flex items-start gap-3">
        <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900">Conflict Resolved</p>
          <p className="text-xs text-green-700 mt-1">
            {task2Title} has been rescheduled to avoid the overlap.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-green-600 hover:text-green-800 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-300 flex items-start gap-3">
        <CheckCircle2 size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">Conflict Accepted</p>
          <p className="text-xs text-blue-700 mt-1">
            You&apos;ve acknowledged the conflict. Plan accordingly.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-600 hover:text-blue-800 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div
      className={`
        px-4
        py-3
        rounded-lg
        border-2
        space-y-3
        transition-all
        ${getSeverityColor(conflict.severity)}
      `}
    >
      {/* === HEADER === */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">Scheduling Conflict</span>
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getSeverityBadgeColor(conflict.severity)}`}
              >
                {conflict.severity.toUpperCase()}
              </span>
            </div>

            <p className="text-xs opacity-75 line-clamp-1">
              {task1Title} ↔ {task2Title}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-current hover:opacity-70 flex-shrink-0 transition-opacity"
        >
          <X size={16} />
        </button>
      </div>

      {/* === CONFLICT DETAILS === */}
      <div className="pl-8 space-y-2 bg-white/30 p-2 rounded">
        <div className="flex items-center gap-2 text-xs">
          <Clock size={14} />
          <span>
            <strong>{conflict.overlappingMinutes} minutes</strong> overlap
          </span>
        </div>

        <div className="text-xs opacity-90">
          <div className="font-medium mb-1">Affected Tasks:</div>
          <ul className="space-y-1 ml-4 list-disc">
            <li className="line-clamp-1">{task1Title}</li>
            <li className="line-clamp-1">{task2Title}</li>
          </ul>
        </div>

        {conflict.resolutionStatus && (
          <div className="text-xs opacity-75">
            <strong>Status:</strong> {conflict.resolutionStatus.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      {/* === ACTION BUTTONS === */}
      <div className="flex gap-2 pt-2 pl-8">
        {/* Auto-Resolve Button */}
        <button
          onClick={handleAutoResolve}
          disabled={isPending}
          className={`
            flex-1
            inline-flex
            items-center
            justify-center
            gap-2
            px-3
            py-2
            text-xs
            font-medium
            rounded-lg
            transition-all
            
            ${
              isPending
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-60'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }
          `}
          title="Let AI reschedule one of the tasks"
        >
          {isPending ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Resolving...
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Auto-Resolve
            </>
          )}
        </button>

        {/* Accept Button */}
        <button
          onClick={handleAcceptConflict}
          disabled={isPending}
          className={`
            flex-1
            px-3
            py-2
            text-xs
            font-medium
            rounded-lg
            border-2
            transition-all
            hover:opacity-80
            active:scale-95
            
            ${
              isPending
                ? 'border-gray-300 text-gray-600 bg-gray-100 cursor-not-allowed opacity-60'
                : 'border-current opacity-70 hover:opacity-100'
            }
          `}
          title="I'll figure it out myself"
        >
          Ignore
        </button>
      </div>

      {/* === INFO MESSAGE === */}
      <div className="pl-8 text-xs opacity-75 italic">
        Tip: Auto-resolve will intelligently reschedule one task to avoid the overlap.
      </div>
    </div>
  );
};

// ============================================================================
// CONFLICT LIST COMPONENT
// ============================================================================

interface ConflictListProps {
  conflicts: ConflictData[];
  taskTitlesMap?: Record<string, string>;
  onConflictResolved?: () => void;
}

export const ConflictList: React.FC<ConflictListProps> = ({
  conflicts,
  taskTitlesMap = {},
  onConflictResolved,
}) => {
  const unresolvedConflicts = conflicts.filter(
    c => !['auto_resolved', 'user_resolved', 'accepted'].includes(c.resolutionStatus)
  );

  if (unresolvedConflicts.length === 0) {
    return (
      <div className="px-4 py-6 text-center bg-green-50 rounded-lg border border-green-200">
        <CheckCircle2 size={32} className="mx-auto mb-2 text-green-600" />
        <p className="text-sm font-medium text-green-900">No Conflicts</p>
        <p className="text-xs text-green-700">Your schedule is conflict-free!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-red-600" />
        <h3 className="font-semibold text-sm">
          {unresolvedConflicts.length} Conflict{unresolvedConflicts.length !== 1 ? 's' : ''}
        </h3>
      </div>

      <div className="space-y-3">
        {unresolvedConflicts.map(conflict => (
          <ConflictWarning
            key={conflict._id}
            conflict={conflict}
            task1Title={taskTitlesMap[conflict.task1Id] || 'Task 1'}
            task2Title={taskTitlesMap[conflict.task2Id] || 'Task 2'}
            onResolve={onConflictResolved}
          />
        ))}
      </div>
    </div>
  );
};

export default ConflictWarning;
