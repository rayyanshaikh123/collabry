/**
 * Planner and Task Types
 */

export type TaskCategory = 'Exam' | 'Reading' | 'Assignment' | 'Project' | 'Other';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'completed' | 'archived';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  completedAt?: string;
  userId: string;
  boardId?: string;
  tags?: string[];
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes
  createdAt: string;
  updatedAt: string;
}

export interface PlannerEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  category: TaskCategory;
  taskId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudyGoal {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  progress: number; // 0-100
  tasks: string[]; // task IDs
  userId: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
