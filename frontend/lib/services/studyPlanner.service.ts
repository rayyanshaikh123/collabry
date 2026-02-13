/**
 * Study Planner API Service
 * Handles all HTTP requests for study plans and tasks
 */

import { apiClient } from '@/lib/api';

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subject?: string;
  topics: string[];
  startDate: string;
  endDate: string;
  dailyStudyHours: number;
  preferredTimeSlots: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  planType: 'exam' | 'course' | 'skill' | 'custom';
  generatedByAI: boolean;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  missedTasks: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudyTask {
  id: string;
  planId: string;
  userId: string;
  title: string;
  description?: string;
  topic?: string;
  resources?: Resource[];
  scheduledDate: string;
  scheduledTime?: string;
  duration: number; // minutes
  priority: 'low' | 'medium' | 'high' | 'urgent';
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'rescheduled';
  completedAt?: string;
  actualDuration?: number;
  completionNotes?: string;
  difficultyRating?: number;
  understandingLevel?: number;
  order: number;
  isOverdue?: boolean;
  isToday?: boolean;
  planMeta?: { title: string; subject?: string };
  timeSlotStart?: string; // ISO timestamp for scheduled block start
  timeSlotEnd?: string;   // ISO timestamp for scheduled block end
}

export interface Resource {
  title: string;
  url?: string;
  type: 'video' | 'article' | 'pdf' | 'quiz' | 'practice' | 'other';
}

export interface CreatePlanData {
  title: string;
  description?: string;
  subject?: string;
  topics: string[];
  startDate: string;
  endDate: string;
  dailyStudyHours?: number;
  preferredTimeSlots?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  planType?: 'exam' | 'course' | 'skill' | 'custom';
  examDate?: string;
  currentKnowledge?: string;
  goals?: string;
}

export interface CreateTaskData {
  planId: string;
  title: string;
  description?: string;
  topic?: string;
  scheduledDate: string;
  scheduledTime?: string;
  duration?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  difficulty?: 'easy' | 'medium' | 'hard';
  resources?: Resource[];
}

export interface AIGeneratedPlan {
  title: string;
  description: string;
  tasks: Array<{
    title: string;
    description: string;
    topic: string;
    scheduledDate: string;
    duration: number;
    priority: string;
    difficulty: string;
    order: number;
    resources: Resource[];
  }>;
  estimatedCompletionDays: number;
  totalTasks: number;
  recommendations: string[];
  warnings?: string[];  // Complexity/timeline warnings from AI
}

export interface PlanAnalytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  skippedTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyHours: number;
  averageTaskDuration: number;
}

export interface UserAnalytics {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalTasks: number;
  completedTasks: number;
  todayTasks: number;
  todayCompleted: number;
  weekTasks: number;
  weekCompleted: number;
  totalStudyHours: number;
  longestStreak: number;
  currentStreak: number;
}

class StudyPlannerService {
  private baseURL = '/study-planner';
  private aiURL = '/ai';

  // ============================================================================
  // STUDY PLANS
  // ============================================================================

  async getPlans(filters?: { status?: string; planType?: string }): Promise<StudyPlan[]> {
    try {
      const response = await apiClient.get(this.baseURL + '/plans', { params: filters });
      const plans = response.data.data || response.data || [];
      // Ensure all plans have id field (transform _id to id if needed)
      return plans.map((plan: any) => ({
        ...plan,
        id: plan.id || plan._id,
      }));
    } catch (error) {
      console.error('Failed to fetch plans - ERROR:', error);
      return [];
    }
  }

  async getPlanById(planId: string): Promise<StudyPlan> {
    const response = await apiClient.get(`${this.baseURL}/plans/${planId}`);
    return response.data.data;
  }

  async createPlan(data: CreatePlanData): Promise<StudyPlan> {
    try {
      // Sanitize plan data to meet backend validation limits
      const sanitizedData = {
        ...data,
        title: data.title?.substring(0, 200) || 'Untitled Plan',
        description: data.description?.substring(0, 1000),
      };
      
      const response = await apiClient.post(this.baseURL + '/plans', sanitizedData);
      // Backend returns { success, data: plan } but apiClient already unwraps to just the plan
      const planData = response.data.data || response.data;
      
      if (!planData || !planData.id) {
        console.error('Invalid plan data. Response:', response);
        throw new Error('Invalid response from server - no plan ID');
      }
      
      return planData;
    } catch (error: any) {
      console.error('Failed to create plan:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create plan');
    }
  }

  async updatePlan(planId: string, data: Partial<CreatePlanData>): Promise<StudyPlan> {
    // Sanitize plan data to meet backend validation limits
    const sanitizedData: Partial<CreatePlanData> = { ...data };
    if (data.title !== undefined) {
      sanitizedData.title = data.title.substring(0, 200);
    }
    if (data.description !== undefined) {
      sanitizedData.description = data.description.substring(0, 1000);
    }
    
    const response = await apiClient.put(`${this.baseURL}/plans/${planId}`, sanitizedData);
    return response.data.data;
  }

  async deletePlan(planId: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/plans/${planId}`);
  }

  async getPlanAnalytics(planId: string): Promise<PlanAnalytics> {
    const response = await apiClient.get(`${this.baseURL}/plans/${planId}/analytics`);
    return response.data.data;
  }

  async getUserAnalytics(): Promise<UserAnalytics> {
    const response = await apiClient.get(this.baseURL + '/analytics');
    return response.data.data;
  }

  // ============================================================================
  // STUDY TASKS
  // ============================================================================

  async getTasks(filters?: {
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StudyTask[]> {
    const response = await apiClient.get(this.baseURL + '/tasks', { params: filters });
    return response.data.data;
  }

  async getPlanTasks(planId: string, filters?: {
    status?: string;
    date?: string;
    priority?: string;
  }): Promise<StudyTask[]> {
    const response = await apiClient.get(
      `${this.baseURL}/plans/${planId}/tasks`,
      { params: filters }
    );
    return response.data.data;
  }

  async getTodayTasks(): Promise<StudyTask[]> {
    try {
      const response = await apiClient.get(this.baseURL + '/tasks/today');
      const tasks = response.data || [];
      // Ensure all tasks have id field
      return tasks.map((task: any) => ({
        ...task,
        id: task.id || task._id,
      }));
    } catch (error) {
      console.error('Failed to fetch today tasks:', error);
      return [];
    }
  }

  async getUpcomingTasks(days: number = 7): Promise<StudyTask[]> {
    try {
      const response = await apiClient.get(this.baseURL + '/tasks/upcoming', {
        params: { days },
      });
      const tasks = response.data || [];
      // Ensure all tasks have id field
      return tasks.map((task: any) => ({
        ...task,
        id: task.id || task._id,
      }));
    } catch (error) {
      console.error('Failed to fetch upcoming tasks:', error);
      return [];
    }
  }

  async getOverdueTasks(): Promise<StudyTask[]> {
    try {
      const response = await apiClient.get(this.baseURL + '/tasks/overdue');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch overdue tasks:', error);
      return [];
    }
  }

  async getTaskById(taskId: string): Promise<StudyTask> {
    const response = await apiClient.get(`${this.baseURL}/tasks/${taskId}`);
    return response.data.data;
  }

  async createTask(data: CreateTaskData): Promise<StudyTask> {
    // Sanitize task data to meet backend validation limits
    const sanitizedData = {
      ...data,
      title: data.title?.substring(0, 200) || 'Untitled Task',
      description: data.description?.substring(0, 1000),
    };
    
    const response = await apiClient.post(this.baseURL + '/tasks', sanitizedData);
    return response.data.data;
  }

  async createBulkTasks(planId: string, tasks: CreateTaskData[]): Promise<StudyTask[]> {
    try {
      // Sanitize tasks to meet backend validation limits
      const sanitizedTasks = tasks.map(task => ({
        ...task,
        // Truncate title to 200 chars (backend limit)
        title: task.title?.substring(0, 200) || 'Untitled Task',
        // Truncate description to 1000 chars (backend limit)
        description: task.description?.substring(0, 1000),
      }));

      const response = await apiClient.post(this.baseURL + '/tasks/bulk', {
        planId,
        tasks: sanitizedTasks,
      });
      
      const tasksData = response.data.data || response.data;
      
      if (!tasksData || !Array.isArray(tasksData)) {
        console.error('Invalid tasks data. Response:', response);
        throw new Error('Invalid response from server - no tasks array');
      }
      
      return tasksData;
    } catch (error: any) {
      console.error('Failed to create bulk tasks:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create tasks');
    }
  }

  async updateTask(taskId: string, data: Partial<CreateTaskData>): Promise<StudyTask> {
    // Sanitize task data to meet backend validation limits
    const sanitizedData: Partial<CreateTaskData> = { ...data };
    if (data.title !== undefined) {
      sanitizedData.title = data.title.substring(0, 200);
    }
    if (data.description !== undefined) {
      sanitizedData.description = data.description.substring(0, 1000);
    }
    
    const response = await apiClient.put(`${this.baseURL}/tasks/${taskId}`, sanitizedData);
    return response.data.data;
  }

  async completeTask(
    taskId: string,
    data?: {
      notes?: string;
      actualDuration?: number;
      difficultyRating?: number;
      understandingLevel?: number;
    }
  ): Promise<StudyTask> {
    const response = await apiClient.post(`${this.baseURL}/tasks/${taskId}/complete`, data || {});
    return response.data.data;
  }

  async rescheduleTask(
    taskId: string,
    newDate: string,
    reason?: string
  ): Promise<StudyTask> {
    const response = await apiClient.post(`${this.baseURL}/tasks/${taskId}/reschedule`, {
      newDate,
      reason,
    });
    return response.data.data;
  }

  async deleteTask(taskId: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/tasks/${taskId}`);
  }

  // ============================================================================
  // AI GENERATION
  // ============================================================================

  async generatePlan(data: CreatePlanData): Promise<AIGeneratedPlan> {
    const response = await apiClient.post(this.aiURL + '/generate-study-plan', data);
    return response.data;
  }

  // ============================================================================
  // STRATEGY SYSTEM (Phase 3)
  // ============================================================================

  async getAvailableStrategies(): Promise<Array<{
    name: string;
    description: string;
    characteristics: Record<string, any>;
    useCases: string[];
  }>> {
    const response = await apiClient.get(this.baseURL + '/strategies');
    return response.data.data;
  }

  async getRecommendedMode(planId: string): Promise<{
    recommendedMode: string;
    confidence: number;
    reasoning: string[];
    metrics: Record<string, any>;
    triggers?: string[];
  }> {
    try {
      console.log('[StudyPlannerService] Calling GET', `${this.baseURL}/plans/${planId}/recommended-mode`);
      const response = await apiClient.get(`${this.baseURL}/plans/${planId}/recommended-mode`);
      console.log('[StudyPlannerService] Response:', response);
      
      if (!response) {
        throw new Error('Empty response from server');
      }
      
      if (!response.success) {
        throw new Error(response.message || 'API request failed');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('[StudyPlannerService] getRecommendedMode error:', error);
      console.error('[StudyPlannerService] Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  async getAllRecommendedModes(): Promise<Array<{
    planId: string;
    planTitle: string;
    recommendedMode: string;
    confidence: number;
    reasoning: string[];
  }>> {
    const response = await apiClient.get(this.baseURL + '/plans/recommended-modes/all');
    return response.data;
  }

  async executeStrategy(
    planId: string,
    mode: 'balanced' | 'adaptive' | 'emergency'
  ): Promise<{
    success: boolean;
    message: string;
    details: Record<string, any>;
    warnings?: string[];
  }> {
    const response = await apiClient.post(`${this.baseURL}/plans/${planId}/execute-strategy`, { mode });
    return response.data;
  }

  async autoExecuteStrategy(planId: string): Promise<{
    success: boolean;
    message: string;
    details: Record<string, any>;
    warnings?: string[];
  }> {
    const response = await apiClient.post(`${this.baseURL}/plans/${planId}/auto-strategy`);
    return response.data;
  }

  async autoSchedulePlan(planId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      tasksScheduled: number;
      conflictsDetected: number;
      executionTimeMs: number;
      totalSlots: number;
    };
  }> {
    const response = await apiClient.post(`${this.baseURL}/plans/${planId}/auto-schedule`);
    return response.data;
  }

  async getExamStrategy(planId: string): Promise<{
    enabled: boolean;
    examDate?: string;
    daysUntilExam?: number;
    currentPhase?: string | null;
    intensityMultiplier?: number;
    taskDensityPerDay?: number;
    phaseDescription?: string;
    recommendations?: string[];
  } | null> {
    try {
      console.log('[StudyPlannerService] Calling GET', `${this.baseURL}/plans/${planId}/exam-strategy`);
      const response = await apiClient.get(`${this.baseURL}/plans/${planId}/exam-strategy`);
      console.log('[StudyPlannerService] Exam strategy response:', response);
      
      if (!response) {
        return null;
      }
      
      return response.data;
    } catch (error) {
      console.warn('No exam strategy available for plan:', planId);
      return null;
    }
  }

  async enableExamMode(planId: string, examDate: string, examMode: boolean = true): Promise<{
    success: boolean;
    message: string;
    data: {
      planId: string;
      examDate: string;
      currentPhase: string;
      config: any;
    };
  }> {
    const response = await apiClient.patch(`${this.baseURL}/plans/${planId}/exam-mode`, {
      examDate,
      examMode
    });
    return response as any;
  }

  async getBehaviorProfile(): Promise<{
    productivityPeakHours: string[];
    consistencyScore: number;
    averageDailyMinutes: number;
    preferredSessionLength: number;
    completionRate: number;
    rescheduleFrequency: number;
  } | null> {
    try {
      const response = await apiClient.get(this.baseURL + '/behavior-profile');
      return response.data.data;
    } catch (error) {
      console.warn('No behavior profile available');
      return null;
    }
  }
}

export const studyPlannerService = new StudyPlannerService();
