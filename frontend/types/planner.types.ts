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

// ============================================================================
// STRATEGY SYSTEM TYPES (Phase 3)
// ============================================================================

export type StrategyMode = 'balanced' | 'adaptive' | 'emergency';
export type ExamPhase = 'preparation' | 'acceleration' | 'intensive' | 'final';

export interface StrategyRecommendation {
  recommendedMode: StrategyMode;
  confidence: number; // 0-100
  reasoning: string[];
  metrics: {
    completionRate: number;
    backlog: number;
    daysToExam?: number;
    consistencyScore: number;
    avgDailyMinutes: number;
    currentStreak: number;
  };
  triggers?: string[];
}

export interface ExamStrategyContext {
  enabled: boolean;
  examDate?: string;
  daysUntilExam?: number;
  currentPhase?: ExamPhase | null;
  intensityMultiplier?: number; // 1.0x to 2.0x
  taskDensityPerDay?: number; // 4 to 8
  phaseDescription?: string;
  recommendations?: string[];
}

export interface BehaviorProfile {
  productivityPeakHours: string[];
  consistencyScore: number;
  averageDailyMinutes: number;
  preferredSessionLength: number;
  completionRate: number;
  rescheduleFrequency: number;
}

export interface StrategyExecutionResult {
  success: boolean;
  message: string;
  details: {
    strategy: StrategyMode;
    executionTime: number;
    tasksProcessed: number;
    tasksScheduled: number;
    changes: string[];
  };
  warnings?: string[];
}
