'use client';

import React from 'react';
import { StudyTask } from '@/lib/services/studyPlanner.service';
import { Card, Badge, Button } from '../UIElements';
import { ICONS } from '@/constants';

interface DateDetailModalProps {
    date: Date | null;
    tasks: StudyTask[];
    onClose: () => void;
    onTaskClick?: (task: StudyTask) => void;
    onCompleteTask?: (taskId: string) => void;
}

const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const formatTimeRange = (task: StudyTask): string => {
    // V2 format with time slots
    if (task.timeSlotStart && task.timeSlotEnd) {
        return `⏰ ${formatTime(task.timeSlotStart)} - ${formatTime(task.timeSlotEnd)}`;
    }

    // Legacy format
    if (task.scheduledTime) {
        const duration = task.duration || 60;
        const [hours, minutes] = task.scheduledTime.split(':').map(Number);
        const start = new Date();
        start.setHours(hours, minutes, 0, 0);
        const end = new Date(start.getTime() + duration * 60 * 1000);
        return `⏰ ${formatTime(start.toISOString())} - ${formatTime(end.toISOString())}`;
    }

    return '🕐 No time set';
};

const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
    medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    high: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    urgent: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400',
};

const difficultyColors: Record<string, string> = {
    easy: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    medium: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    hard: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
};

export const DateDetailModal: React.FC<DateDetailModalProps> = ({
    date,
    tasks,
    onClose,
    onTaskClick,
    onCompleteTask,
}) => {
    if (!date) return null;

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const sortedTasks = [...tasks].sort((a, b) => {
        const timeA = a.timeSlotStart || a.scheduledTime || a.scheduledDate;
        const timeB = b.timeSlotStart || b.scheduledTime || b.scheduledDate;
        return new Date(timeA || 0).getTime() - new Date(timeB || 0).getTime();
    });

    const completedCount = tasks.filter(t => t.status === 'completed').length;
    const totalDuration = tasks.reduce((sum, t) => sum + (t.duration || 0), 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b-2 border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-200">
                                {formattedDate}
                            </h2>
                            <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                    <ICONS.Calendar size={16} />
                                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <ICONS.Clock size={16} />
                                    {Math.floor(totalDuration / 60)}h {totalDuration % 60}m total
                                </span>
                                <span className="flex items-center gap-1">
                                    <ICONS.Plus size={16} className="text-emerald-500 rotate-45" />
                                    {completedCount}/{tasks.length} completed
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            <ICONS.Plus size={24} className="rotate-45 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {sortedTasks.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-400 dark:text-slate-500 text-lg">
                                No tasks scheduled for this day.
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                                ✨ Enjoy your free day!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => onTaskClick?.(task)}
                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${task.status === 'completed'
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 opacity-75'
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Completion Checkbox */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (task.status !== 'completed') {
                                                    onCompleteTask?.(task.id);
                                                }
                                            }}
                                            className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.status === 'completed'
                                                    ? 'bg-emerald-500 border-emerald-500'
                                                    : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                                                }`}
                                        >
                                            {task.status === 'completed' && (
                                                <ICONS.Plus size={16} className="text-white rotate-45" strokeWidth={4} />
                                            )}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            {/* Time Badge */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge
                                                    variant="indigo"
                                                    className="text-xs font-mono font-bold"
                                                >
                                                    {formatTimeRange(task)}
                                                </Badge>
                                                <Badge variant="slate" className="text-xs">
                                                    {task.duration || 0} min
                                                </Badge>
                                            </div>

                                            {/* Title */}
                                            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                                                {task.title}
                                            </h3>

                                            {/* Description */}
                                            {task.description && (
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                                    {task.description}
                                                </p>
                                            )}

                                            {/* Tags */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {task.topic && (
                                                    <Badge variant="indigo" className="text-xs">
                                                        📚 {task.topic}
                                                    </Badge>
                                                )}
                                                <span
                                                    className={`px-2 py-1 rounded-lg text-xs font-bold ${priorityColors[String(task.priority)] || priorityColors.medium
                                                        }`}
                                                >
                                                    {task.priority}
                                                </span>
                                                <span
                                                    className={`px-2 py-1 rounded-lg text-xs font-bold ${difficultyColors[String(task.difficulty)] || difficultyColors.medium
                                                        }`}
                                                >
                                                    {task.difficulty}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t-2 border-slate-100 dark:border-slate-800">
                    <Button
                        variant="primary"
                        onClick={onClose}
                        className="w-full"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};
