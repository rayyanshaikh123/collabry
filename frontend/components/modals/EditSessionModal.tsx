'use client';

import React, { useState } from 'react';
import { Card, Button, Input, Badge } from '../UIElements';
import { ICONS } from '../../constants';
import { StudyTask } from '@/lib/services/studyPlanner.service';

interface EditSessionModalProps {
    session: StudyTask;
    onClose: () => void;
    onSave: (id: string, updates: Partial<StudyTask>, isEvent: boolean) => Promise<void>;
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({
    session,
    onClose,
    onSave,
}) => {
    // Helper to get ISO string for form initialization
    const getInitialStart = () => {
        if (session.startTime) return session.startTime;
        if (session.timeSlotStart) return session.timeSlotStart;
        if (session.scheduledDate && session.scheduledTime) {
            // Legacy construct
            try {
                const [hours, minutes] = session.scheduledTime.split(':').map(Number);
                const d = new Date(session.scheduledDate);
                d.setHours(hours, minutes);
                return d.toISOString();
            } catch { return ''; }
        }
        return '';
    };

    const getInitialEnd = () => {
        if (session.endTime) return session.endTime;
        if (session.timeSlotEnd) return session.timeSlotEnd;
        if (session.scheduledDate && session.scheduledTime) {
            try {
                const startStr = getInitialStart();
                if (!startStr) return '';
                const start = new Date(startStr);
                const end = new Date(start.getTime() + (session.duration || 60) * 60000);
                return end.toISOString();
            } catch { return ''; }
        }
        return '';
    };

    const [formData, setFormData] = useState<Partial<StudyTask>>({
        title: session.title,
        description: session.description || '',
        topic: session.topic || session.subject || '',
        startTime: getInitialStart(),
        endTime: getInitialEnd(),
        priority: session.priority || 'medium',
        status: session.status || 'scheduled',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Heuristic: Is this an event or legacy task?
    const isEvent = (session as any).type === 'MANUAL' || !!(session as any).startTime;

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            if (session.id) {
                await onSave(session.id, formData, isEvent);
                onClose();
            }
        } catch (error) {
            console.error('Failed to update session', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-lg bg-white dark:bg-slate-900 border-none shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        Edit Session
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                        <ICONS.X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Title</label>
                        <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">Time Range</label>
                        <div className="flex gap-2">
                            <Input
                                type="datetime-local"
                                value={formData.startTime ? new Date(formData.startTime).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setFormData({ ...formData, startTime: new Date(e.target.value).toISOString() })}
                                className="flex-1"
                            />
                            <span className="self-center text-slate-400">to</span>
                            <Input
                                type="datetime-local"
                                value={formData.endTime ? new Date(formData.endTime).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setFormData({ ...formData, endTime: new Date(e.target.value).toISOString() })}
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">Topic</label>
                        <Input
                            value={formData.topic}
                            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">Priority</label>
                            <select
                                className="w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Status</label>
                            <select
                                className="w-full p-2 rounded-lg border dark:bg-slate-800 dark:border-slate-700"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};
