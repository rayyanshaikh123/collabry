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
  /** Academic timetable: locked blocks per weekday (scheduler respects these) */
  weeklyTimetableBlocks?: WeeklyTimetableBlock[];
}

/**
 * StudyTask - LEGACY MODEL (DEPRECATED)
 * Use StudySession for new implementations
 */
export interface StudyTask {
  id: string;
  planId: string;
  userId: string;
  title: string;
  description?: string;
  topic?: string;
  resources?: Resource[];
  // DEPRECATED FIELDS (use timeSlotStart/timeSlotEnd instead)
  scheduledDate?: string; // ⚠️ DEPRECATED - ambiguous timing
  scheduledTime?: string; // ⚠️ DEPRECATED
  duration?: number;      // ⚠️ DEPRECATED - derived from time slots
  // NEW TIME-SLOT FIELDS (PRIMARY)
  timeSlotStart: string;  // ✅ ISO timestamp for precise start
  timeSlotEnd: string;    // ✅ ISO timestamp for precise end
  // Unification fields (Aliases for compatibility with StudySession)
  startTime?: string;
  endTime?: string;
  subject?: string;

  priority: 'low' | 'medium' | 'high' | 'urgent';
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped' | 'rescheduled';
  completedAt?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  completionNotes?: string;
  difficultyRating?: number;
  understandingLevel?: number;
  order: number;
  isOverdue?: boolean;
  isToday?: boolean;
  planMeta?: { title: string; subject?: string };
}

/**
 * StudySession - TIME-SLOT BASED MODEL (CURRENT)
 * This is the source of truth for calendar scheduling
 */
export interface StudySession {
  id: string;
  userId: string;
  planId: string;
  taskId?: string; // Optional link to task
  title: string;
  description?: string;
  topic?: string;
  // TIME-SLOT BOUNDS (REQUIRED)
  startTime: string;  // ISO 8601 timestamp
  endTime: string;    // ISO 8601 timestamp
  // Session metadata
  type: 'deep_work' | 'practice' | 'review' | 'exam_prep' | 'project' | 'lecture' | 'break';
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deepWork: boolean;
  estimatedEffort?: number; // 1-10
  // Status
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'missed' | 'rescheduled';
  completedAt?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  completionNotes?: string;
  // Assessment
  difficultyRating?: number; // 1-5
  understandingLevel?: number; // 1-5
  focusQuality?: number; // 1-5
  // Resources
  resources?: Resource[];
  // AI metadata
  generatedByAI?: boolean;
  aiConfidence?: number;
  slotQuality?: number;
}

export interface Resource {
  title: string;
  url?: string;
  type: 'video' | 'article' | 'pdf' | 'quiz' | 'practice' | 'other';
}

export interface WeeklyTimetableBlock {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label?: string;
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
  /** Academic timetable: locked blocks per weekday (scheduler respects these) */
  weeklyTimetableBlocks?: WeeklyTimetableBlock[];
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

// ============================================================================
// TYPE GUARDS & RESPONSE VALIDATION (Production Safety)
// ============================================================================

/**
 * Validates auto-schedule API response structure

/**
 * Validates auto-schedule API response structure.
 * Accepts both wrapped ({ success: true, data: ... }) and unwrapped ({ tasksScheduled: ... }) formats.
 */
function isValidScheduleResponse(response: any): boolean {
  if (!response || typeof response !== 'object') return false;

  // Check strict format first
  if (response.success === true && response.data && typeof response.data.tasksScheduled === 'number') {
    return true;
  }

  // Check unwrapped format (payload only)
  if (typeof response.tasksScheduled === 'number') {
    return true;
  }

  return false;
}

/**
 * Validates recover-missed API response structure.
 * Accepts both wrapped and unwrapped formats.
 */
function isValidRecoverResponse(response: any): boolean {
  if (!response || typeof response !== 'object') return false;

  // Check strict format
  if (response.success === true && response.data && typeof response.data.rescheduled === 'number') {
    return true;
  }

  // Check unwrapped format
  if (typeof response.rescheduled === 'number') {
    return true;
  }

  return false;
}

/**
 * Safe extractor for schedule response
 */
function extractScheduleData(response: any) {
  // If response has tasksScheduled directly, it's already the payload
  if (response && typeof response.tasksScheduled === 'number') {
    return {
      success: true,
      message: 'Scheduled successfully',
      data: response
    };
  }

  // If response is nested inside .data (Axios sometimes returns data directly)
  const actualData = response?.data || response;

  if (isValidScheduleResponse(actualData)) {
    // If it's the wrapped format, return as is
    if (actualData.success && actualData.data) {
      return actualData;
    }
    // If it's unwrapped but valid, wrap it
    if (typeof actualData.tasksScheduled === 'number') {
      return {
        success: true,
        message: 'Scheduled successfully',
        data: actualData
      };
    }
  }

  console.error('[StudyPlannerService] Invalid schedule response:', response);
  return {
    success: false,
    message: 'Invalid response from server',
    data: {
      tasksScheduled: 0,
      conflictsDetected: 0,
      executionTimeMs: 0,
      totalSlots: 0,
    },
  };
}

/**
 * Safe extractor for recover response
 */
function extractRecoverData(response: any) {
  // Direct payload check
  if (response && typeof response.rescheduled === 'number') {
    return {
      success: true,
      message: 'Recovered successfully',
      data: response
    };
  }

  const actualData = response?.data || response;

  if (isValidRecoverResponse(actualData)) {
    if (actualData.success && actualData.data) {
      return actualData;
    }
    if (typeof actualData.rescheduled === 'number') {
      return {
        success: true,
        message: 'Recovered successfully',
        data: actualData
      };
    }
  }

  console.error('[StudyPlannerService] Invalid recover response:', response);
  return {
    success: false,
    message: 'Invalid response from server',
    data: { rescheduled: 0, totalMissed: 0 },
  };
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

      console.log('📤 CREATE PLAN REQUEST:', sanitizedData);
      const response = await apiClient.post(this.baseURL + '/plans', sanitizedData);
      console.log('📥 CREATE PLAN RESPONSE:', response);

      // Safe extraction - handle multiple response shapes
      const planData = response?.data?.data?.plan  // { success, data: { plan } }
        || response?.data?.data                    // { success, data: plan }
        || response?.data?.plan                    // { plan }
        || response?.data;                         // Direct plan object

      if (!planData || !planData.id) {
        console.error('❌ INVALID PLAN RESPONSE SHAPE:', response);
        throw new Error('Backend returned empty or invalid plan object');
      }

      console.log('✅ PARSED PLAN:', planData);
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
    try {
      const response = await apiClient.get(this.baseURL + '/tasks', { params: filters });
      return response?.data?.data || response?.data || [];
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  }

  async getPlanTasks(planId: string, filters?: {
    status?: string;
    date?: string;
    priority?: string;
  }): Promise<StudyTask[]> {
    try {
      const response = await apiClient.get(
        `${this.baseURL}/plans/${planId}/tasks`,
        { params: filters }
      );
      return response?.data?.data || response?.data || [];
    } catch (error) {
      console.error('Failed to fetch plan tasks:', error);
      return [];
    }
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
  // AI GENERATION - V2 TIME-SLOT BASED SCHEDULER
  // ============================================================================

  /**
   * Save manual or AI-generated events
   */
  async saveStudyEvents(planId: string, sessions: any[]): Promise<any[]> {
    try {
      if (!sessions || sessions.length === 0) return [];
      console.log(`[StudyPlannerService] Saving ${sessions.length} events for plan ${planId}`);
      const response = await apiClient.post(`${this.baseURL}/plans/${planId}/events`, { sessions });
      return response.data.data;
    } catch (error: any) {
      console.error('[StudyPlannerService] Failed to save events:', error);
      throw new Error(error.response?.data?.message || 'Failed to save events');
    }
  }

  /**
   * Generate AI study plan using V2 time-slot based scheduler
   * Returns SESSIONS with startTime/endTime, NOT tasks with date+duration
   */
  async generatePlan(data: CreatePlanData): Promise<AIGeneratedPlan> {
    try {
      // Map frontend difficulty to AI engine enum
      const difficultyMap: Record<string, string> = {
        'beginner': 'easy',
        'intermediate': 'medium',
        'advanced': 'hard',
        'easy': 'easy',
        'medium': 'medium',
        'hard': 'hard',
      };

      const mappedDifficulty = difficultyMap[data.difficulty || 'intermediate'] || 'medium';

      // Prepare request payload
      const requestPayload = {
        planId: 'temp-' + Date.now(),
        subject: data.subject || data.title || 'Study Session',
        topics: data.topics,
        startDate: data.startDate,
        endDate: data.endDate,
        dailyStudyHours: data.dailyStudyHours || 2,
        examDate: data.examDate,
        difficulty: mappedDifficulty,
        preferredTimeSlots: data.preferredTimeSlots || ['morning', 'afternoon'],
        weeklyTimetableBlocks: data.weeklyTimetableBlocks || [],
        preferences: {
          preferredTimes: data.preferredTimeSlots || ['morning', 'afternoon'],
          maxSessionDuration: 120,
          breakFrequency: 50,
          focusType: 'deep_work',
          sleepSchedule: { start: '23:00', end: '07:00' }
        }
      };

      console.log('📤 V2 SCHEDULER REQUEST:', requestPayload);

      // Call V2 smart scheduler endpoint (via backend proxy)
      const response = await apiClient.post(this.baseURL + '/generate-v2', requestPayload);

      if (response?.data?.success === false) {
        throw new Error(response.data?.message || response.data?.error || 'Schedule generation failed');
      }

      const v2Data = response?.data?.data?.sessions != null
        ? response.data.data
        : response?.data?.sessions != null
          ? response.data
          : null;

      if (!v2Data || !Array.isArray(v2Data.sessions)) {
        throw new Error(response?.data?.message || 'Backend returned invalid plan structure - no sessions found');
      }

      console.log(`✅ Parsed ${v2Data.sessions.length} sessions from V2 scheduler`);
      const generatedPlan = {
        title: data.title || `${data.subject} Study Plan`,
        description: data.description || `AI-generated plan for ${data.subject}`,
        tasks: v2Data.sessions.map((session: any, index: number) => ({
          title: session.title,
          description: session.description || '',
          topic: session.topic || data.subject || '',
          scheduledDate: session.startTime, // DEPRECATED - use timeSlotStart
          duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000), // DEPRECATED
          timeSlotStart: session.startTime, // ✅ NEW: Precise start time
          timeSlotEnd: session.endTime,     // ✅ NEW: Precise end time
          priority: session.priority || 'medium',
          difficulty: session.difficulty || 'medium',
          order: index + 1,
          resources: session.resources || [],
        })),
        estimatedCompletionDays: Math.ceil(
          (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)
        ),
        totalTasks: v2Data.sessions.length,
        recommendations: v2Data.recommendations || [],
        warnings: v2Data.warnings || [],
      };

      console.log('✅ GENERATED PLAN:', generatedPlan);
      return generatedPlan;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Schedule generation failed';
      if (error?.response?.status === 401) throw new Error('Session expired. Please log in again.');
      console.warn('V2 scheduler failed, falling back to legacy endpoint:', msg);
      try {
        const response = await apiClient.post(this.aiURL + '/generate-study-plan', data);
        const legacy = response?.data?.data ?? response?.data ?? response;
        if (!legacy?.tasks?.length) throw new Error('Legacy plan returned no tasks');
        // Convert legacy tasks (scheduledDate + duration) to time-slot shape so UI always consumes events
        const tasks = legacy.tasks.map((t: any, index: number) => {
          const start = new Date(t.scheduledDate || data.startDate);
          const dur = Math.max(15, Math.min(480, Number(t.duration) || 60));
          const end = new Date(start.getTime() + dur * 60 * 1000);
          return {
            title: t.title,
            description: t.description || '',
            topic: t.topic || data.subject || '',
            scheduledDate: t.scheduledDate,
            duration: dur,
            timeSlotStart: start.toISOString(),
            timeSlotEnd: end.toISOString(),
            priority: t.priority || 'medium',
            difficulty: t.difficulty || 'medium',
            order: t.order ?? index + 1,
            resources: t.resources || [],
          };
        });
        return {
          title: legacy.title || data.title || `${data.subject} Study Plan`,
          description: legacy.description || '',
          tasks,
          estimatedCompletionDays: legacy.estimatedCompletionDays || Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)),
          totalTasks: tasks.length,
          recommendations: legacy.recommendations || [],
          warnings: legacy.warnings || [],
        };
      } catch (legacyErr: any) {
        throw new Error(legacyErr?.response?.data?.message || legacyErr?.message || msg);
      }
    }
  }



  /** Today's execution plan: events for today (time-slot based). */
  async getTodayEvents(): Promise<StudySession[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);
      return this.getEventsRange(today, nextDay.toISOString().split('T')[0]);
    } catch {
      return [];
    }
  }

  /** Get events for a specific date range */
  async getEventsRange(startDate: string, endDate: string): Promise<StudySession[]> {
    try {
      const response = await apiClient.get(this.baseURL + '/study-events/range', {
        params: { startDate, endDate },
      });
      const list = response?.data?.data ?? response?.data ?? [];
      return Array.isArray(list) ? list.map((e: any) => ({ ...e, id: e.id || e._id })) : [];
    } catch (error) {
      console.error('Failed to get events range', error);
      return [];
    }
  }

  /** Update an event */
  async updateEvent(eventId: string, data: any): Promise<StudySession> {
    const response = await apiClient.put(`${this.baseURL}/events/${eventId}`, data);
    return response.data;
  }

  /** Delete an event */
  async deleteEvent(eventId: string): Promise<void> {
    await apiClient.delete(`${this.baseURL}/events/${eventId}`);
  }

  /** Calendar events for a plan (by date). */
  async getPlanCalendar(planId: string): Promise<{ byDate: Record<string, any[]>; total: number }> {
    try {
      const response = await apiClient.get(`${this.baseURL}/study-plans/${planId}/calendar`);
      return { byDate: response?.data?.byDate ?? {}, total: response?.data?.total ?? 0 };
    } catch {
      return { byDate: {}, total: 0 };
    }
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
    try {
      const response = await apiClient.post(`${this.baseURL}/plans/${planId}/auto-schedule`);
      return extractScheduleData(response.data || response);
    } catch (error: any) {
      console.error('[StudyPlannerService] autoSchedulePlan failed:', error);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Scheduling failed',
        data: { tasksScheduled: 0, conflictsDetected: 0, executionTimeMs: 0, totalSlots: 0 },
      };
    }
  }

  async recoverMissed(planId: string): Promise<{
    success: boolean;
    message: string;
    data: { rescheduled: number; totalMissed: number };
  }> {
    try {
      const response = await apiClient.post(`${this.baseURL}/plans/${planId}/recover-missed`);
      return extractRecoverData(response.data || response);
    } catch (error: any) {
      console.error('[StudyPlannerService] recoverMissed failed:', error);
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || 'Recovery failed',
        data: { rescheduled: 0, totalMissed: 0 },
      };
    }
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
