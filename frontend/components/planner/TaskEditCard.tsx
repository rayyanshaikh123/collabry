'use client';

import React from 'react';
import { Button, Input } from '../UIElements';
import { StudyTask } from '@/lib/services/studyPlanner.service';

interface TaskEditCardProps {
  task: Partial<StudyTask>;
  onUpdate: (updates: Partial<StudyTask>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const TaskEditCard: React.FC<TaskEditCardProps> = ({
  task,
  onUpdate,
  onSave,
  onCancel
}) => {
  return (
    <div className="p-4 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30">
      <div className="space-y-3">
        <Input
          value={task.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Task title"
          className="font-bold"
        />

        <Input
          value={task.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Description"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            type="date"
            value={task.scheduledDate ? String(task.scheduledDate).split('T')[0] : ''}
            onChange={(e) => onUpdate({ scheduledDate: e.target.value })}
          />
          <select
            value={task.priority || 'medium'}
            onChange={(e) => onUpdate({ priority: e.target.value as any })}
            className="px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={onSave}>
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
