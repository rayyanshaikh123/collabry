import React from 'react';
import { StudyTask } from '@/lib/services/studyPlanner.service';
import { ICONS } from '../../constants';
import { Button, Badge } from '../UIElements';

interface DayScheduleModalProps {
    date: Date | null;
    tasks: StudyTask[];
    onClose: () => void;
    onEditTask?: (task: StudyTask) => void;
    onDeleteTask?: (task: StudyTask) => void;
    onAddTask?: (date: Date) => void;
}

export const DayScheduleModal: React.FC<DayScheduleModalProps> = ({
    date,
    tasks,
    onClose,
    onEditTask,
    onDeleteTask,
    onAddTask,
}) => {
    if (!date) return null;

    // Calculate total duration
    const totalMinutes = tasks.reduce((sum, t) => sum + (t.duration || 60), 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    // Sort tasks by time
    const sortedTasks = [...tasks].sort((a, b) => {
        const timeA = a.startTime || a.timeSlotStart || '00:00';
        const timeB = b.startTime || b.timeSlotStart || '00:00';
        return timeA.localeCompare(timeB);
    });

    const formatTime = (isoString?: string) => {
        if (!isoString) return '18:00'; // Default fallback
        try {
            const d = new Date(isoString);
            if (isNaN(d.getTime())) return '18:00';
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '18:00';
        }
    };

    const getDuration = (start?: string, end?: string, defaultDuration = 60) => {
        if (!start || !end) return `${defaultDuration}m`;
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        const diff = (e - s) / 1000 / 60;
        return `${Math.round(diff)}m`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="text-indigo-600 dark:text-indigo-400">{date.getDate()}</span>
                            {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-2">
                            <ICONS.Clock size={16} />
                            {tasks.length} sessions • {totalHours} hours planned
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <ICONS.Plus size={24} className="rotate-45 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {sortedTasks.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ICONS.Calendar size={32} />
                            </div>
                            <p className="font-medium">No study sessions scheduled</p>
                            <p className="text-sm">Take a break or add a session!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedTasks.map((task, idx) => {
                                const startTime = task.startTime || task.timeSlotStart;
                                const endTime = task.endTime || task.timeSlotEnd;
                                const isCompleted = task.status === 'completed';

                                return (
                                    <div
                                        key={task.id || idx}
                                        className={`
                      group relative p-4 rounded-xl border-2 transition-all hover:shadow-md
                      ${isCompleted
                                                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900'
                                            }
                    `}
                                    >
                                        <div className="flex gap-4">
                                            {/* Time Column */}
                                            <div className="flex flex-col items-center justify-center min-w-[4.5rem] px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400">
                                                <span>{formatTime(startTime)}</span>
                                                <div className="w-px h-2 bg-slate-300 dark:bg-slate-600 my-0.5"></div>
                                                <span className="opacity-75">{getDuration(startTime, endTime, task.duration)}</span>
                                            </div>

                                            {/* Details Column */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className={`font-bold text-base truncate ${isCompleted ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                                        {task.title}
                                                    </h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${task.priority === 'urgent' ? 'bg-rose-100 text-rose-700' :
                                                        task.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {task.priority || 'Normal'}
                                                    </span>
                                                </div>

                                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                                    {task.topic || task.subject || 'General Study'}
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {onEditTask && !isCompleted && (
                                                    <button
                                                        onClick={() => onEditTask(task)}
                                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-indigo-600 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <ICONS.Edit size={16} />
                                                    </button>
                                                )}
                                                {onDeleteTask && (
                                                    <button
                                                        onClick={() => task.id && onDeleteTask(task)}
                                                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded text-slate-500 hover:text-rose-600 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <ICONS.Trash size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                    {onAddTask && (
                        <Button onClick={() => onAddTask(date)}>
                            <ICONS.Plus size={18} className="mr-2" />
                            Add Time Slot
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
