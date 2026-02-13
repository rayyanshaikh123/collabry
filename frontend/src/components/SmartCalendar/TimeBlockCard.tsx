/**
 * FRONTEND: TimeBlockCard Component
 * File: frontend/src/components/SmartCalendar/TimeBlockCard.tsx
 * 
 * Purpose: Draggable task card for calendar view
 * Features:
 * - Drag-drop to reschedule
 * - Conflict badge with warning
 * - Priority color coding
 * - Compact display (shows title, duration, priority)
 * 
 * Used in: CalendarWeekView.tsx, CalendarDayView.tsx
 */

import React, { useState } from 'react';
import { TaskTimeBlock } from '@/hooks/useCalendarData';
import { useCalendarViewStore } from '@/stores/calendarView.store';
import {
  AlertCircle,
  Clock,
  GripVertical,
  ChevronRight,
} from 'lucide-react';

interface TimeBlockCardProps {
  task: TaskTimeBlock;
  onTaskSelect: (taskId: string) => void;
  isDragOverlay?: boolean;
}

// ============================================================================
// PRIORITY & STATUS COLOR MAPPING
// ============================================================================

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-50 border-red-300 hover:bg-red-100';
    case 'high':
      return 'bg-orange-50 border-orange-300 hover:bg-orange-100';
    case 'medium':
      return 'bg-blue-50 border-blue-300 hover:bg-blue-100';
    case 'low':
      return 'bg-gray-50 border-gray-300 hover:bg-gray-100';
    default:
      return 'bg-gray-50 border-gray-300';
  }
};

const getPriorityTextColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return 'text-red-700';
    case 'high':
      return 'text-orange-700';
    case 'medium':
      return 'text-blue-700';
    case 'low':
      return 'text-gray-700';
    default:
      return 'text-gray-700';
  }
};

const getStatusBgColor = (status: string, isDragOverlay?: boolean): string => {
  if (isDragOverlay) {
    return 'opacity-75';
  }
  
  switch (status) {
    case 'completed':
      return 'opacity-50 line-through';
    case 'in-progress':
      return 'ring-2 ring-green-400';
    case 'skipped':
      return 'opacity-40';
    default:
      return '';
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const TimeBlockCard: React.FC<TimeBlockCardProps> = ({
  task,
  onTaskSelect,
  isDragOverlay = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const {
    setIsDragging: setStoreIsDragging,
    setDraggedTask,
    setDragSource,
  } = useCalendarViewStore();
  
  // Parse ISO datetime strings
  const startTime = new Date(task.timeSlotStart);
  const endTime = new Date(task.timeSlotEnd);
  
  // Format time display (e.g., "9:00 AM - 10:30 AM")
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  const timeRange = `${formatTime(startTime)} - ${formatTime(endTime)}`;
  
  // ============================================================================
  // DRAG HANDLERS
  // ============================================================================
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      setIsDragging(true);
      setStoreIsDragging(true);
      
      setDraggedTask({
        taskId: task._id,
        currentStart: startTime,
        currentEnd: endTime,
        duration: task.duration,
      });
      
      // Set drag source (for potential multi-drop support)
      setDragSource({
        date: startTime,
        slotIndex: Math.floor(startTime.getHours() * 60 / 30 + startTime.getMinutes() / 30),
      });
      
      // Add CSS class to indicate drag is happening
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('taskId', task._id);
      e.dataTransfer.setData('currentStart', startTime.toISOString());
      e.dataTransfer.setData('currentEnd', endTime.toISOString());
      
      // Custom drag image (optional - shows a ghost image while dragging)
      const dragImage = new Image();
      dragImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"%3E%3C/svg%3E';
      e.dataTransfer.setDragImage(dragImage, 0, 0);
    } catch (error) {
      console.error('[TimeBlockCard] Drag start error:', error);
      setIsDragging(false);
      setStoreIsDragging(false);
    }
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    // Don't clear store state here - let calendar handle drop completion
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onTaskSelect(task._id)}
      className={`
        relative
        rounded-lg
        border-2
        p-2.5
        cursor-grab
        active:cursor-grabbing
        transition-all
        duration-200
        select-none
        group
        
        ${getPriorityColor(task.priority)}
        ${getStatusBgColor(task.status, isDragOverlay)}
        ${isDragging ? 'opacity-60 shadow-lg transform scale-105' : ''}
        ${isDragOverlay ? 'shadow-xl ring-2 ring-offset-2 ring-blue-400' : 'hover:shadow-md'}
      `}
    >
      {/* === DRAG HANDLE + HEADER === */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* Drag Handle Icon */}
          <GripVertical
            size={14}
            className={`flex-shrink-0 opacity-50 hover:opacity-100 ${getPriorityTextColor(task.priority)}`}
          />
          
          {/* Task Title (truncated) */}
          <h3
            className={`
              text-xs
              font-semibold
              truncate
              ${getPriorityTextColor(task.priority)}
            `}
            title={task.title}
          >
            {task.title}
          </h3>
        </div>
        
        {/* === CONFLICT BADGE === */}
        {task.hasConflict && (
          <div
            className="flex-shrink-0 bg-red-200 rounded-full p-0.5 animate-pulse"
            title={`${task.conflictCount} conflict${task.conflictCount !== 1 ? 's' : ''}`}
          >
            <AlertCircle size={12} className="text-red-700" />
          </div>
        )}
      </div>
      
      {/* === TIME & DURATION === */}
      <div
        className={`
          flex
          items-center
          gap-1
          text-xs
          mb-1.5
          ${getPriorityTextColor(task.priority)}
          opacity-75
        `}
      >
        <Clock size={12} className="flex-shrink-0" />
        <span className="truncate">{timeRange}</span>
      </div>
      
      {/* === STATUS INDICATOR === */}
      {task.status !== 'pending' && (
        <div className="flex items-center gap-1">
          <div
            className={`
              h-1.5
              rounded-full
              flex-grow
              ${
                task.status === 'completed'
                  ? 'bg-green-400'
                  : task.status === 'in-progress'
                    ? 'bg-blue-400'
                    : task.status === 'skipped'
                      ? 'bg-gray-400'
                      : 'bg-gray-200'
              }
            `}
          />
        </div>
      )}
      
      {/* === CONFLICT INFO TOOLTIP === */}
      {task.hasConflict && (
        <div
          className={`
            absolute
            bottom-full
            left-1/2
            transform
            -translate-x-1/2
            mb-2
            px-2
            py-1
            bg-red-600
            text-white
            text-xs
            rounded
            whitespace-nowrap
            opacity-0
            group-hover:opacity-100
            pointer-events-none
            transition-opacity
            z-50
          `}
        >
          <div className="flex items-center gap-1">
            <AlertCircle size={12} />
            <span>{task.conflictCount} conflict(s)</span>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-red-600" />
        </div>
      )}
      
      {/* === HOVER INFO BUBBLE === */}
      <div
        className={`
          absolute
          -right-32
          top-0
          w-32
          px-2
          py-1.5
          bg-gray-900
          text-white
          text-xs
          rounded-lg
          opacity-0
          group-hover:opacity-100
          pointer-events-none
          transition-opacity
          z-40
          shadow-lg
        `}
      >
        <div className="space-y-1">
          <p className="font-semibold">{task.title}</p>
          
          {task.description && (
            <p className="text-gray-300 truncate">{task.description}</p>
          )}
          
          <div className="flex justify-between text-gray-200 text-xs">
            <span>Duration: {task.duration}m</span>
            <span>Priority: {task.priority}</span>
          </div>
          
          {task.hasConflict && (
            <div className="flex items-center gap-1 text-red-300">
              <AlertCircle size={12} />
              <span>Has {task.conflictCount} conflict(s)</span>
            </div>
          )}
        </div>
      </div>
      
      {/* === CLICK INDICATOR === */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-10 bg-white pointer-events-none" />
    </div>
  );
};

export default TimeBlockCard;
