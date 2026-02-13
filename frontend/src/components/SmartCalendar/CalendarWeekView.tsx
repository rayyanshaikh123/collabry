/**
 * FRONTEND: CalendarWeekView Component
 * File: frontend/src/components/SmartCalendar/CalendarWeekView.tsx
 * 
 * Purpose: 7-day time-grid calendar view
 * Features:
 * - Hourly time slots (8 AM - 8 PM by default, configurable)
 * - 7-day layout (Monday-Sunday)
 * - Drag-drop to reschedule tasks
 * - Conflict visualization
 * - Current time indicator (shows "now" line)
 * 
 * Used in: PlannerNew.tsx as one of the view modes
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { TaskTimeBlock, useTasksByDateRange, useRescheduleTaskSmart } from '@/hooks/useCalendarData';
import { useCalendarViewStore, useCalendarDragDrop } from '@/stores/calendarView.store';
import TimeBlockCard from './TimeBlockCard';
import { ChevronLeft, ChevronRight, RotateCcw, AlertCircle } from 'lucide-react';

interface CalendarWeekViewProps {
  planId: string;
  onTaskSelect: (taskId: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOURS_START = 8; // 8 AM
const HOURS_END = 20; // 8 PM
const HOURS_TOTAL = HOURS_END - HOURS_START; // 12 hours
const HOUR_HEIGHT = 100; // pixels per hour

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getDayLabel = (date: Date): string => {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return dayNames[date.getDay()];
};

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff));
};

const getDayDate = (weekStart: Date, dayIndex: number): Date => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayIndex);
  return date;
};

const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getTaskPositionAndHeight = (task: TaskTimeBlock): { top: number; height: number } => {
  const startTime = new Date(task.timeSlotStart);
  const endTime = new Date(task.timeSlotEnd);
  
  const startHour = startTime.getHours();
  const startMinute = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinute = endTime.getMinutes();
  
  // Calculate position as percentage from day start
  const startPercent = ((startHour - HOURS_START) * 60 + startMinute) / (HOURS_TOTAL * 60);
  const endPercent = ((endHour - HOURS_START) * 60 + endMinute) / (HOURS_TOTAL * 60);
  
  return {
    top: startPercent * 100,
    height: Math.max((endPercent - startPercent) * 100, 5), // Min 5px height
  };
};

const isTaskOnDay = (task: TaskTimeBlock, dayStart: Date): boolean => {
  const taskStart = new Date(task.timeSlotStart);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  
  return taskStart >= dayStart && taskStart < dayEnd;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  planId,
  onTaskSelect,
}) => {
  const { currentDate, setCurrentDate } = useCalendarViewStore();
  const { isDragging, dragTarget, setDragTarget, resetDragState } = useCalendarDragDrop();
  const { mutate: rescheduleTask } = useRescheduleTaskSmart();
  
  // Get week data
  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  // Fetch tasks for entire week
  const { data: tasks = [], isLoading } = useTasksByDateRange(planId, weekStart, weekEnd);
  
  // State for drop zone highlighting
  const [dropZoneHover, setDropZoneHover] = useState<string | null>(null);
  
  // Current time indicator
  const [currentTimePercent, setCurrentTimePercent] = useState<number>(0);
  
  // Update current time line
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      if (hours >= HOURS_START && hours < HOURS_END) {
        const percent = ((hours - HOURS_START) * 60 + minutes) / (HOURS_TOTAL * 60) * 100;
        setCurrentTimePercent(percent);
      } else {
        setCurrentTimePercent(-1); // Hide if outside hours
      }
    };
    
    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update each minute
    
    return () => clearInterval(interval);
  }, []);
  
  // ============================================================================
  // DRAG & DROP HANDLERS
  // ============================================================================
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDayDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    dayIndex: number,
    yPercent: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dayId = `day-${dayIndex}`;
    setDropZoneHover(dayId);
    
    setDragTarget({
      date: getDayDate(weekStart, dayIndex),
      slotIndex: Math.floor(yPercent / (100 / (HOURS_TOTAL * 2))), // 30-min slots
    });
  };
  
  const handleDayDragLeave = () => {
    setDropZoneHover(null);
  };
  
  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    dayIndex: number,
    yPercent: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const taskId = e.dataTransfer.getData('taskId');
      if (!taskId) {
        console.warn('[CalendarWeekView] No taskId in drop data');
        resetDragState();
        return;
      }
      
      // Calculate new start time
      const dropDay = getDayDate(weekStart, dayIndex);
      const percentOfDay = Math.max(0, Math.min(1, yPercent / 100));
      
      const newStartHour = HOURS_START + percentOfDay * HOURS_TOTAL;
      const newStart = new Date(dropDay);
      const floorHour = Math.floor(newStartHour);
      const floorMinute = Math.round((newStartHour - floorHour) * 60 / 30) * 30; // Round to 30-min
      
      newStart.setHours(floorHour, floorMinute, 0, 0);
      
      // Reschedule task via API
      rescheduleTask(
        {
          taskId,
          newStartTime: newStart.toISOString(),
          reason: 'drag_drop_reschedule',
        },
        {
          onSuccess: () => {
            console.log('[CalendarWeekView] Task rescheduled successfully');
          },
          onError: (error) => {
            console.error('[CalendarWeekView] Reschedule failed:', error);
            // TODO: Show toast notification to user
          },
        }
      );
    } finally {
      resetDragState();
      setDropZoneHover(null);
    }
  };
  
  // ============================================================================
  // RENDER TIME GRID
  // ============================================================================
  
  const renderTimeColumn = () => {
    const hours: JSX.Element[] = [];
    
    for (let i = HOURS_START; i < HOURS_END; i++) {
      const isPM = i >= 12;
      const displayHour = i % 12 || 12;
      
      hours.push(
        <div
          key={`time-${i}`}
          className="h-[100px] border-b border-gray-200 px-2 py-1 text-xs text-gray-500 font-medium"
        >
          {displayHour}:00 {isPM ? 'PM' : 'AM'}
        </div>
      );
    }
    
    return hours;
  };
  
  const renderDayColumn = (dayIndex: number) => {
    const dayStart = getDayDate(weekStart, dayIndex);
    const dayTasks = tasks.filter(task => isTaskOnDay(task, dayStart));
    
    const dayId = `day-${dayIndex}`;
    
    return (
      <div
        key={dayId}
        className="flex-1 border-r border-gray-200 relative bg-white"
        onDragOver={(e) => handleDayDragOver(e, dayIndex, (e.clientY % HOUR_HEIGHT) / HOUR_HEIGHT * 100)}
        onDragLeave={handleDayDragLeave}
        onDrop={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
          handleDrop(e, dayIndex, yPercent);
        }}
      >
        {/* Hour slots background */}
        {Array.from({ length: HOURS_TOTAL }).map((_, hourIdx) => (
          <div
            key={`slot-${hourIdx}`}
            className="h-[100px] border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
          />
        ))}
        
        {/* Current time indicator */}
        {currentTimePercent >= 0 && dayStart.toDateString() === new Date().toDateString() && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
            style={{ top: `${currentTimePercent}%` }}
          >
            <div className="w-2 h-2 bg-red-500 rounded-full -mt-0.75 -ml-1" />
          </div>
        )}
        
        {/* Drop zone highlight */}
        {dropZoneHover === dayId && isDragging && (
          <div className="absolute inset-0 bg-blue-100 opacity-30 pointer-events-none z-10" />
        )}
        
        {/* Task blocks */}
        <div className="absolute inset-0">
          {dayTasks.map((task) => {
            const { top, height } = getTaskPositionAndHeight(task);
            
            return (
              <div
                key={task._id}
                className="absolute left-1 right-1"
                style={{
                  top: `${top}%`,
                  height: `${height}%`,
                  minHeight: '40px',
                }}
              >
                <TimeBlockCard
                  task={task}
                  onTaskSelect={onTaskSelect}
                  isDragOverlay={false}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-4">
      {/* === HEADER: Week Navigation === */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <button
          onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex-1 text-center">
          <h2 className="text-lg font-semibold">
            {formatDateShort(weekStart)} - {formatDateShort(new Date(weekStart.setDate(weekStart.getDate() + 6)))}
          </h2>
        </div>
        
        <button
          onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight size={20} />
        </button>
        
        <button
          onClick={() => setCurrentDate(new Date())}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-2"
          title="Jump to today"
        >
          <RotateCcw size={20} />
        </button>
      </div>
      
      {/* === CALENDAR GRID === */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* Header: Day names */}
        <div className="flex border-b border-gray-200">
          <div className="w-24 border-r border-gray-200 bg-gray-50 flex items-center justify-center text-xs font-semibold text-gray-600" />
          
          {Array.from({ length: 7 }).map((_, dayIdx) => {
            const dayDate = getDayDate(weekStart, dayIdx);
            const isToday = dayDate.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={`day-header-${dayIdx}`}
                className={`
                  flex-1
                  py-3
                  text-center
                  border-r
                  border-gray-200
                  ${isToday ? 'bg-blue-50' : 'bg-gray-50'}
                `}
              >
                <div className="text-xs font-semibold text-gray-700">
                  {getDayLabel(dayDate)}
                </div>
                <div
                  className={`
                    text-sm
                    font-bold
                    ${isToday ? 'text-blue-600 bg-blue-200 rounded px-2 py-0.5 inline-block' : 'text-gray-600'}
                  `}
                >
                  {dayDate.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Time grid */}
        <div className="flex overflow-x-auto">
          {/* Time column */}
          <div className="w-24 border-r border-gray-200 bg-gray-50 flex-shrink-0">
            {renderTimeColumn()}
          </div>
          
          {/* Day columns */}
          <div className="flex flex-1">
            {Array.from({ length: 7 }).map((_, dayIdx) => renderDayColumn(dayIdx))}
          </div>
        </div>
      </div>
      
      {/* === LEGEND === */}
      <div className="flex gap-4 text-xs text-gray-600 px-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" /> Current time
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-red-600" />
          Conflict
        </div>
      </div>
    </div>
  );
};

export default CalendarWeekView;
