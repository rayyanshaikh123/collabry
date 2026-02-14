'use client';

import React, { useState } from 'react';
import { Card, Badge, Button } from './UIElements';
import { ICONS } from '../constants';
import { StudyTask, StudyPlan } from '@/lib/services/studyPlanner.service';
import { DayScheduleModal } from './modals/DayScheduleModal';

interface CalendarProps {
  tasks: StudyTask[];
  plans?: StudyPlan[];
  viewDate?: Date;
  onViewDateChange?: (date: Date) => void;
  onTaskClick?: (task: StudyTask) => void;
  onPlanClick?: (plan: StudyPlan) => void;
  onDateClick?: (date: Date) => void;
  onCompleteTask?: (taskId: string) => void;
  onEditTask?: (task: StudyTask) => void;
  onDeleteTask?: (task: StudyTask) => void;
  onAddTask?: (date: Date) => void;
}

/**
 * Format time range, defaulting to 18:00 if missing (V2 migration fallback)
 */
const formatTimeRange = (task: StudyTask): string => {
  let start: Date;
  let end: Date;

  if (task.timeSlotStart && task.timeSlotEnd) {
    start = new Date(task.timeSlotStart);
    end = new Date(task.timeSlotEnd);
  } else if (task.scheduledTime) {
    const [hours, minutes] = task.scheduledTime.split(':').map(Number);
    start = new Date(task.scheduledDate || new Date().toISOString());
    start.setHours(hours, minutes, 0, 0);
    end = new Date(start.getTime() + (task.duration || 60) * 60000);
  } else if (task.startTime && task.endTime) {
    start = new Date(task.startTime);
    end = new Date(task.endTime);
  } else {
    // Fallback for legacy data (hide "Unscheduled", just show "18:00")
    start = new Date(task.scheduledDate || new Date().toISOString());
    start.setHours(18, 0, 0, 0);
    end = new Date(start.getTime() + 60 * 60000);
  }

  return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const Calendar: React.FC<CalendarProps> = ({
  tasks,
  plans = [],
  viewDate,
  onViewDateChange,
  onTaskClick,
  onPlanClick,
  onDateClick,
  onCompleteTask,
  onEditTask,
  onDeleteTask,
  onAddTask
}) => {
  const [internalDate, setInternalDate] = useState(new Date());
  const currentDate = viewDate || internalDate;

  const setCurrentDate = (date: Date) => {
    if (onViewDateChange) onViewDateChange(date);
    else setInternalDate(date);
  };

  // Modal State
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalTasks, setModalTasks] = useState<StudyTask[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);
  const startingDayOfWeek = firstDay.getDay();

  const calendarDays: (Date | null)[] = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Previous month filler
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push(new Date(year, month - 1, prevMonthLastDay - i));
  }

  // Current month
  for (let day = 1; day <= getDaysInMonth(year, month); day++) {
    calendarDays.push(new Date(year, month, day));
  }

  // Next month filler
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push(new Date(year, month + 1, day));
  }

  // Group tasks
  const tasksByDate = tasks.reduce((acc, task) => {
    // Intelligent Date Parsing
    let dateKey: string;
    if (task.timeSlotStart) dateKey = new Date(task.timeSlotStart).toDateString();
    else if (task.startTime) dateKey = new Date(task.startTime).toDateString();
    else if (task.scheduledDate) dateKey = new Date(task.scheduledDate).toDateString();
    else return acc;

    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, StudyTask[]>);

  // Group plans
  const plansByDate = plans.reduce((acc, plan) => {
    const startKey = new Date(plan.startDate).toDateString();
    const endKey = new Date(plan.endDate).toDateString();

    if (!acc[startKey]) acc[startKey] = [];
    acc[startKey].push({ ...plan, isStart: true });

    if (startKey !== endKey) {
      if (!acc[endKey]) acc[endKey] = [];
      acc[endKey].push({ ...plan, isStart: false });
    }
    return acc;
  }, {} as Record<string, Array<StudyPlan & { isStart: boolean }>>);

  const handleDayClick = (date: Date) => {
    const dateKey = date.toDateString();
    const tasksForDay = tasksByDate[dateKey] || [];
    setModalDate(date);
    setModalTasks(tasksForDay);
    setIsModalOpen(true);
    if (onDateClick) onDateClick(date);
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isCurrentMonth = (date: Date) => date.getMonth() === month;

  return (
    <>
      <Card className="p-6 transition-all hover:shadow-lg border-opacity-50">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm">
              <ICONS.ChevronLeft size={18} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 text-xs font-bold hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all">
              Today
            </button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all shadow-sm">
              <ICONS.ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-4 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-extrabold text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-2 lg:gap-4 auto-rows-fr">
          {calendarDays.map((date, index) => {
            if (!date) return <div key={index} className="min-h-[140px]" />;

            const dateKey = date.toDateString();
            const dateTasks = tasksByDate[dateKey] || [];
            const datePlans = plansByDate[dateKey] || [];
            const today = isToday(date);
            const currentMonth = isCurrentMonth(date);

            return (
              <div
                key={index}
                onClick={() => handleDayClick(date)}
                className={`
                  group relative min-h-[140px] p-2 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-1
                  ${today
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                  }
                  ${!currentMonth ? 'opacity-30 grayscale' : 'opacity-100'}
                  hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md hover:-translate-y-0.5
                `}
              >
                {/* Date Number */}
                <div className="flex justify-between items-start">
                  <span className={`
                    text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                    ${today ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300' : 'text-slate-700 dark:text-slate-300 group-hover:bg-slate-100 dark:group-hover:bg-slate-800'}
                  `}>
                    {date.getDate()}
                  </span>
                  {dateTasks.length > 0 && <span className="text-[10px] font-bold text-indigo-400">{dateTasks.length} slots</span>}
                </div>

                {/* Plan Markers */}
                {datePlans.map((plan, i) => (
                  <div key={i} className="h-1.5 w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-full" />
                  </div>
                ))}

                {/* Events */}
                <div className="flex-1 flex flex-col justify-end gap-1 mt-1">
                  {dateTasks.slice(0, 3).map((task, i) => {
                    const isUrgent = task.priority === 'urgent';
                    return (
                      <div
                        key={i}
                        className={`
                          text-[10px] px-2 py-1 rounded-md font-medium truncate flex items-center justify-between
                          ${task.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 decoration-emerald-500 line-through opacity-70'
                            : isUrgent
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300'
                          }
                        `}
                      >
                        <span className="truncate flex-1">{task.title}</span>
                        <span className="opacity-60 ml-1 text-[9px] font-mono">{formatTimeRange(task)}</span>
                      </div>
                    );
                  })}

                  {/* Overflow */}
                  {dateTasks.length > 3 && (
                    <div className="text-[10px] text-center font-bold text-slate-400 hover:text-indigo-500 p-1 rounded-md">
                      +{dateTasks.length - 3} more interactions
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Detail Modal */}
      {isModalOpen && modalDate && (
        <DayScheduleModal
          date={modalDate}
          tasks={modalTasks}
          onClose={() => setIsModalOpen(false)}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onAddTask={onAddTask}
        />
      )}
    </>
  );
};

export default Calendar;
