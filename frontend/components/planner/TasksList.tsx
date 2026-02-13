'use client';

import React from 'react';
import { Card, Badge } from '../UIElements';
import { ICONS } from '@/constants';
import { StudyTask } from '@/lib/services/studyPlanner.service';
import { TaskEditCard } from './TaskEditCard';

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '';
  return timeStr;
};

const formatTimeSlot = (start?: string, end?: string) => {
  if (!start || !end) return null;
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const formatHM = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  return `${formatHM(startDate)}-${formatHM(endDate)}`;
};

const priorityColors: Record<string, string> = {
  low: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
  medium: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  high: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  urgent: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
};

interface TasksListProps {
  tasks: StudyTask[];
  selectedView: 'today' | 'upcoming' | 'plans';
  loading: boolean;
  editingTaskId: string | null;
  editForm: Partial<StudyTask>;
  onStartEdit: (task: StudyTask) => void;
  onEditFormChange: (updates: Partial<StudyTask>) => void;
  onSaveEdit: (taskId: string) => Promise<void>;
  onCancelEdit: () => void;
  onRequestComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TasksList: React.FC<TasksListProps> = ({
  tasks,
  selectedView,
  loading,
  editingTaskId,
  editForm,
  onStartEdit,
  onEditFormChange,
  onSaveEdit,
  onCancelEdit,
  onRequestComplete,
  onDeleteTask
}) => {
  return (
    <Card>
      <h3 className="font-black text-slate-800 dark:text-slate-200 text-lg mb-4">
        {selectedView === 'today' && '📅 Today\'s Tasks'}
        {selectedView === 'upcoming' && '🔮 Upcoming Tasks (7 days)'}
        {selectedView === 'plans' && '📚 All Plans'}
      </h3>

      {loading ? (
        <p className="text-center py-8 text-slate-400 dark:text-slate-500">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500">
          No tasks for this view.
          <br />
          {selectedView === 'today' && '✨ Enjoy your free day!'}
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => (
            <React.Fragment key={task.id}>
              {editingTaskId === task.id ? (
                <TaskEditCard
                  task={editForm}
                  onUpdate={onEditFormChange}
                  onSave={() => onSaveEdit(task.id)}
                  onCancel={onCancelEdit}
                />
              ) : (
                <div
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    task.status === 'completed'
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 opacity-60'
                      : task.isOverdue
                        ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        if (task.status !== 'completed') onRequestComplete(task.id);
                      }}
                      disabled={task.status === 'completed'}
                      className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        task.status === 'completed'
                          ? 'bg-emerald-500 dark:bg-emerald-600 border-emerald-500 dark:border-emerald-600'
                          : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-600'
                      }`}
                    >
                      {task.status === 'completed' && (
                        <ICONS.Plus size={16} className="text-white rotate-45" strokeWidth={4} />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="slate" className="text-[10px]">
                              {formatDate(task.scheduledDate)}
                            </Badge>
                            {task.scheduledTime && (
                              <Badge variant="slate" className="text-[10px]">
                                {formatTime(task.scheduledTime)}
                              </Badge>
                            )}
                            {/* Time block indicator */}
                            {task.timeSlotStart && task.timeSlotEnd ? (
                              <Badge variant="indigo" className="text-[10px] flex items-center gap-1">
                                <ICONS.Clock size={10} />
                                {formatTimeSlot(task.timeSlotStart, task.timeSlotEnd)}
                              </Badge>
                            ) : (
                              <Badge variant="slate" className="text-[10px] opacity-50">
                                🕐 Unscheduled
                              </Badge>
                            )}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                priorityColors[String(task.priority)] || ''
                              }`}
                            >
                              {task.priority}
                            </span>
                            <Badge variant="slate" className="text-[10px]">
                              {task.duration} min
                            </Badge>
                            {task.topic && (
                              <Badge variant="indigo" className="text-[10px]">
                                {task.topic}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {task.status !== 'completed' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => onStartEdit(task)}
                              className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                              title="Edit task"
                            >
                              <ICONS.Dashboard size={16} className="text-indigo-600" />
                            </button>
                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="p-2 hover:bg-rose-100 rounded-lg transition-colors"
                              title="Delete task"
                            >
                              <ICONS.Plus size={16} className="text-rose-400 rotate-45" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </Card>
  );
};
