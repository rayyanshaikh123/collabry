'use client';

import React, { useState } from 'react';
import { Card, Button, Badge, Input } from '../components/UIElements';
import Calendar from '../components/Calendar';
import { ICONS } from '../constants';
import { PlannerSidebar } from '../components/planner/PlannerSidebar';
import { EditSessionModal } from '../components/modals/EditSessionModal';
import { TasksList } from '../components/planner/TasksList';
import { StrategyPanel } from '../components/planner/StrategyPanel';
import {
  usePlans,
  useTodayTasks,
  useTodayEvents,
  useUpcomingTasks,
  useOverdueTasks,
  usePlanTasks,
  useCompleteTask,
  useRescheduleTask,
  useDeleteTask,
  useUpdateTask,
  useGeneratePlan,
  useCreatePlan,
  useCreateBulkTasks,
  useRecoverMissed,
  useStudyEventsRange,
  useUpdateEvent,
  useDeleteEvent,
  useTasks,
} from '@/hooks/useStudyPlanner';
import { StudyPlan, StudyTask, CreatePlanData, AIGeneratedPlan, studyPlannerService } from '@/lib/services/studyPlanner.service';
import AlertModal from '../components/AlertModal';
import { useAlert } from '@/hooks/useAlert';
import { useAuthStore } from '@/lib/stores/auth.store';

// Helper: format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '';
  return timeStr;
};

// Priority colors
const priorityColors = {
  low: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
  medium: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  high: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  urgent: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30',
};

const Planner: React.FC = () => {
  const { alertState, showAlert, hideAlert } = useAlert();
  const { isAuthenticated, user } = useAuthStore();
  const [selectedView, setSelectedView] = useState<'today' | 'upcoming' | 'calendar' | 'plans' | 'strategy'>('today');
  const [selectedPlan, setSelectedPlan] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<StudyTask | null>(null); // For Calendar/Modal editing
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [aiGenerated, setAiGenerated] = useState<AIGeneratedPlan | null>(null);
  const [editableAIPlan, setEditableAIPlan] = useState<AIGeneratedPlan | null>(null);

  // Fetch data
  const { data: plans = [], isLoading: loadingPlans } = usePlans({ status: 'active' });
  const { data: todayTasks = [], isLoading: loadingToday } = useTodayTasks();
  const { data: todayEvents = [] } = useTodayEvents();
  const { data: upcomingTasks = [], isLoading: loadingUpcoming } = useUpcomingTasks(7);
  const { data: overdueTasks = [] } = useOverdueTasks();

  // Mutations
  const completeTask = useCompleteTask();
  const rescheduleTask = useRescheduleTask();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const generatePlan = useGeneratePlan();
  const createPlan = useCreatePlan();
  const createBulkTasks = useCreateBulkTasks();
  const recoverMissed = useRecoverMissed();
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Fetch Calendar Events
  const calendarStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).toISOString().split('T')[0];
  const calendarEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).toISOString().split('T')[0];
  const { data: monthEvents = [] } = useStudyEventsRange(calendarStart, calendarEnd);
  const { data: monthTasks = [] } = useTasks({ startDate: calendarStart, endDate: calendarEnd });

  // Unified Delete Handler
  const handleDeleteSession = async (task: StudyTask) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    // Heuristic for event vs legacy task
    const isEvent = (task as any).type === 'MANUAL' || !!(task as any).startTime;

    try {
      if (isEvent && task.id) {
        await deleteEvent.mutateAsync(task.id);
      } else if (task.id) {
        await deleteTask.mutateAsync(task.id);
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  // Editing state (already declared above, no need to redeclare)
  const [editForm, setEditForm] = useState<Partial<StudyTask>>({});

  // AI Generation Form State
  const [aiForm, setAiForm] = useState<CreatePlanData>({
    title: '',
    subject: '',
    topics: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
    dailyStudyHours: 2,
    difficulty: 'intermediate' as const,
    planType: 'custom' as const,
    weeklyTimetableBlocks: [],
  });
  const [topicInput, setTopicInput] = useState('');

  // Manual Plan Form State
  const [manualForm, setManualForm] = useState({
    title: '',
    subject: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    difficulty: 'intermediate' as const,
    tasks: [] as Array<{
      title: string;
      description: string;
      scheduledDate: string;
      startTime: string;
      endTime: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      topic: string;
    }>
  });
  const [taskInput, setTaskInput] = useState({
    title: '',
    description: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    priority: 'medium' as const,
    topic: '',
  });

  const handleGenerateAIPlan = async () => {
    // CRITICAL: Check authentication first
    if (!isAuthenticated || !user) {
      showAlert({
        message: '🔒 Please log in to generate AI study plans',
        type: 'error'
      });
      // Optionally redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    if (!aiForm.subject || aiForm.topics.length === 0) {
      showAlert({ message: 'Please enter subject and topics', type: 'error' });
      return;
    }

    // Validate dates
    const startDate = new Date(aiForm.startDate);
    const endDate = new Date(aiForm.endDate);
    if (endDate <= startDate) {
      showAlert({ message: 'End date must be after start date', type: 'error' });
      return;
    }

    try {
      // Ensure all required fields are present with defaults
      const requestData = {
        ...aiForm,
        preferredTimeSlots: aiForm.preferredTimeSlots || ['evening'],
        title: aiForm.title || aiForm.subject, // Use subject as title if not provided
      };
      console.log('Sending AI plan request:', requestData);
      const generated = await generatePlan.mutateAsync(requestData);
      console.log('AI plan generated:', generated);
      setAiGenerated(generated);
      setEditableAIPlan(JSON.parse(JSON.stringify(generated))); // Deep copy for editing
    } catch (error: any) {
      console.error('Failed to generate plan:', error);
      console.error('Error response:', error?.response?.data);
      showAlert({ message: error?.response?.data?.message || error?.message || 'Failed to generate plan. Please try again.', type: 'error' });
    }
  };

  const handleSaveAIPlan = async () => {
    if (!editableAIPlan) {
      showAlert({ message: 'No AI plan to save', type: 'error' });
      return;
    }

    if (!editableAIPlan.tasks || editableAIPlan.tasks.length === 0) {
      showAlert({ message: 'Cannot save plan with no tasks', type: 'error' });
      return;
    }

    try {
      console.log('Creating plan with data:', {
        ...aiForm,
        title: editableAIPlan.title,
        description: editableAIPlan.description,
      });

      // Create the plan first
      const plan = await createPlan.mutateAsync({
        ...aiForm,
        title: editableAIPlan.title,
        description: editableAIPlan.description,
      });

      console.log('✅ Plan created successfully:', plan);

      // CRITICAL: Defensive guard against undefined plan
      if (!plan) {
        console.error('❌ CRITICAL: createPlan returned null/undefined');
        throw new Error('Backend failed to create plan - no data returned');
      }

      if (!plan.id) {
        console.error('❌ CRITICAL: Plan has no ID:', plan);
        throw new Error('Plan created but no ID returned - invalid backend response');
      }

      // Create all tasks in bulk
      const tasksToCreate = editableAIPlan.tasks.map(task => ({
        planId: plan.id,
        title: task.title,
        description: task.description,
        topic: task.topic,
        scheduledDate: task.scheduledDate,
        duration: task.duration,
        priority: task.priority as any,
        difficulty: task.difficulty as any,
        resources: task.resources,
      }));

      console.log(`Creating ${tasksToCreate.length} tasks for plan ${plan.id}`);
      console.log('Task dates:', tasksToCreate.map(t => ({ title: t.title, date: t.scheduledDate })));

      const createdTasks = await createBulkTasks.mutateAsync({
        planId: plan.id,
        tasks: tasksToCreate as any,
      });

      console.log('Tasks created successfully:', createdTasks.length);

      if (editableAIPlan.tasks.some((t: any) => t.timeSlotStart && t.timeSlotEnd)) {
        try {
          const sessions = editableAIPlan.tasks
            .filter((t: any) => t.timeSlotStart && t.timeSlotEnd)
            .map((t: any) => ({
              title: t.title,
              description: t.description,
              topic: t.topic,
              startTime: t.timeSlotStart,
              endTime: t.timeSlotEnd,
              type: 'deep_work',
              difficulty: t.difficulty,
              priority: t.priority,
              deepWork: true,
            }));
          await studyPlannerService.saveStudyEvents(plan.id, sessions);
        } catch (e) {
          console.warn('Could not save calendar events:', e);
        }
      }

      showAlert({ message: `✅ Plan "${plan.title}" created with ${createdTasks.length} tasks!`, type: 'success' });

      // Close modal and reset form
      setShowAIModal(false);
      setAiGenerated(null);
      setEditableAIPlan(null);
      setAiForm({
        title: '',
        subject: '',
        topics: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dailyStudyHours: 2,
        difficulty: 'intermediate',
        planType: 'custom',
        weeklyTimetableBlocks: [],
      });

      // Force reload to ensure all data is fresh
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Failed to save plan:', error);
      showAlert({ message: `❌ ${error?.message || 'Failed to save plan'}`, type: 'error' });
    }
  };

  const handleSaveManualPlan = async () => {
    // CRITICAL: Check authentication first
    if (!isAuthenticated || !user) {
      showAlert({
        message: '🔒 Please log in to create study plans',
        type: 'error'
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    if (!manualForm.title || !manualForm.subject) {
      showAlert({ message: 'Please enter plan title and subject', type: 'error' });
      return;
    }

    if (manualForm.tasks.length === 0) {
      showAlert({ message: 'Please add at least one task', type: 'error' });
      return;
    }

    try {
      const plan = await createPlan.mutateAsync({
        title: manualForm.title,
        subject: manualForm.subject,
        description: manualForm.description,
        startDate: manualForm.startDate,
        endDate: manualForm.endDate,
        difficulty: manualForm.difficulty,
        planType: 'custom',
        topics: [],
        dailyStudyHours: 2,
      });

      console.log('✅ Manual plan created:', plan);

      // CRITICAL: Defensive guard against undefined plan
      if (!plan) {
        console.error('❌ CRITICAL: createPlan returned null/undefined');
        throw new Error('Backend failed to create plan - no data returned');
      }

      if (!plan.id) {
        console.error('❌ CRITICAL: Plan has no ID:', plan);
        throw new Error('Plan created but no ID returned - invalid backend response');
      }

      // Create StudyEvents instead of Tasks
      const eventsToCreate = manualForm.tasks.map(task => {
        const start = new Date(`${task.scheduledDate}T${task.startTime}`);
        const end = new Date(`${task.scheduledDate}T${task.endTime}`);
        return {
          title: task.title,
          description: task.description,
          topic: task.topic,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          priority: task.priority,
          difficulty: manualForm.difficulty,
          type: 'MANUAL',
        };
      });

      console.log(`[ManualPlan] Saving ${eventsToCreate.length} events...`);
      const createdEvents = await studyPlannerService.saveStudyEvents(plan.id, eventsToCreate);

      showAlert({ message: `✅ Plan "${plan.title}" created with ${createdEvents.length} events!`, type: 'success' });

      setShowManualModal(false);
      setManualForm({
        title: '',
        subject: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        difficulty: 'intermediate',
        tasks: [],
      });
      setTaskInput({
        title: '',
        description: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        priority: 'medium',
        topic: '',
      });

      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Failed to save manual plan:', error);
      showAlert({ message: `❌ ${error?.message || 'Failed to save plan'}`, type: 'error' });
    }
  };

  const handleCompleteTask = async () => {
    if (!taskToComplete) return;

    try {
      await completeTask.mutateAsync({
        taskId: taskToComplete,
        data: {
          notes: completionNotes,
          actualDuration: 60, // Could be tracked
        },
      });
      setTaskToComplete(null);
      setCompletionNotes('');
    } catch (error) {
      console.error('Failed to complete task', error);
    }
  };

  // Determine which tasks to show based on selected view and plan
  const tasksToShow = React.useMemo(() => {
    console.log('🔍 Filtering tasks:', {
      selectedView,
      selectedPlans: selectedPlan,
      todayTasksCount: todayTasks.length,
      upcomingTasksCount: upcomingTasks.length,
    });

    if (selectedView === 'today') {
      const filtered = selectedPlan.length > 0
        ? todayTasks.filter(t => {
          const taskPlanId = typeof t.planId === 'object' ? (t.planId as any)?._id || (t.planId as any)?.id : t.planId;
          const match = selectedPlan.includes(taskPlanId);
          if (!match) console.log('Task filtered out:', t.title, 'planId:', taskPlanId, 'vs', selectedPlan);
          return match;
        })
        : todayTasks;
      console.log('📅 Today tasks filtered:', filtered.length);
      return filtered;
    } else if (selectedView === 'upcoming') {
      const filtered = selectedPlan.length > 0
        ? upcomingTasks.filter(t => {
          const taskPlanId = typeof t.planId === 'object' ? (t.planId as any)?._id || (t.planId as any)?.id : t.planId;
          const match = selectedPlan.includes(taskPlanId);
          if (!match) console.log('Task filtered out:', t.title, 'planId:', taskPlanId, 'vs', selectedPlan);
          return match;
        })
        : upcomingTasks;
      console.log('🔜 Upcoming tasks filtered:', filtered.length);
      return filtered;
    } else {
      // Calendar view: filter upcoming tasks by selected plans (if any)
      const filtered = selectedPlan.length > 0
        ? upcomingTasks.filter(t => {
          const taskPlanId = typeof t.planId === 'object' ? (t.planId as any)?._id || (t.planId as any)?.id : t.planId;
          const match = selectedPlan.includes(taskPlanId);
          if (!match) console.log('Calendar task filtered out:', t.title, 'planId:', taskPlanId, 'vs', selectedPlan);
          return match;
        })
        : upcomingTasks;
      console.log('📅 Calendar tasks filtered:', filtered.length);
      return filtered;
    }
  }, [selectedView, selectedPlan, todayTasks, upcomingTasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-200">Study Planner 📚</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Organize your learning journey with AI-powered planning</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="secondary"
            className="gap-2 w-full sm:w-auto"
            onClick={() => setShowManualModal(true)}
          >
            <ICONS.Plus size={18} strokeWidth={3} /> Create Manual Plan
          </Button>
          <Button
            variant="primary"
            className="gap-2 shadow-lg shadow-indigo-200 w-full sm:w-auto"
            onClick={() => setShowAIModal(true)}
          >
            <ICONS.Dashboard size={18} /> Generate AI Plan
          </Button>
        </div>
      </div>

      {/* Authentication Warning Banner */}
      {!isAuthenticated && (
        <Card className="bg-gradient-to-r from-amber-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 border-2 border-amber-300 dark:border-amber-700">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-amber-500 dark:bg-amber-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300">🔒 Authentication Required</h3>
              <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                Please <a href="/login" className="underline font-semibold hover:text-amber-600">log in</a> to create study plans and access AI features. Your session may have expired.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 dark:from-indigo-900/30 to-white dark:to-slate-800 border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Active Plans</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">{plans.length}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-500 dark:bg-indigo-600 rounded-2xl flex items-center justify-center">
              <ICONS.Planner size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 dark:from-emerald-900/30 to-white dark:to-slate-800 border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Today's Tasks</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">{todayTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500 dark:bg-emerald-600 rounded-2xl flex items-center justify-center">
              <ICONS.Focus size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 dark:from-amber-900/30 to-white dark:to-slate-800 border-amber-100 dark:border-amber-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Upcoming</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">{upcomingTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-amber-500 dark:bg-amber-600 rounded-2xl flex items-center justify-center">
              <ICONS.Dashboard size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 dark:from-rose-900/30 to-white dark:to-slate-800 border-rose-100 dark:border-rose-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Overdue</p>
              <p className="text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">{overdueTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-rose-500 dark:bg-rose-600 rounded-2xl flex items-center justify-center">
              <ICONS.Focus size={24} className="text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Sidebar: Plans */}
        <PlannerSidebar
          plans={plans}
          loading={loadingPlans}
          selectedPlan={selectedPlan}
          onPlanToggle={(planId) => {
            if (selectedPlan.includes(planId)) {
              setSelectedPlan(selectedPlan.filter((id) => id !== planId));
            } else {
              setSelectedPlan([...selectedPlan, planId]);
            }
          }}
          onPlanDelete={async (plan) => {
            if (confirm(`Delete "${plan.title}"? This will remove all associated tasks.`)) {
              try {
                await studyPlannerService.deletePlan(plan.id);
                if (selectedPlan.includes(plan.id)) {
                  setSelectedPlan(selectedPlan.filter((id) => id !== plan.id));
                }
                showAlert({ message: '✅ Plan deleted successfully', type: 'success' });
                setTimeout(() => window.location.reload(), 500);
              } catch (error: any) {
                showAlert({ message: `❌ ${error.message || 'Failed to delete plan'}`, type: 'error' });
              }
            }
          }}
          onAutoSchedule={async (plan) => {
            try {
              showAlert({ message: '⏳ Scheduling time blocks...', type: 'info' });
              const result = await studyPlannerService.autoSchedulePlan(plan.id);
              showAlert({
                message: `✅ ${result.message} (${result.data.tasksScheduled} tasks scheduled)`,
                type: 'success'
              });
              setTimeout(() => window.location.reload(), 1000);
            } catch (error: any) {
              showAlert({
                message: `❌ ${error.response?.data?.message || error.message || 'Failed to schedule plan'}`,
                type: 'error'
              });
            }
          }}
          onRecoverMissed={async (plan) => {
            try {
              await recoverMissed.mutateAsync(plan.id);
            } catch {
              // Error already shown by hook
            }
          }}
        />

        {/* Main Tasks Area */}
        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          {/* View Tabs */}
          <Card>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedView === 'today' ? 'primary' : 'ghost'}
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setSelectedView('today')}
              >
                Today
              </Button>
              <Button
                variant={selectedView === 'upcoming' ? 'primary' : 'ghost'}
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setSelectedView('upcoming')}
              >
                Upcoming
              </Button>
              <Button
                variant={selectedView === 'calendar' ? 'primary' : 'ghost'}
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setSelectedView('calendar')}
              >
                Calendar
              </Button>
              <Button
                variant={selectedView === 'strategy' ? 'primary' : 'ghost'}
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setSelectedView('strategy')}
                disabled={selectedPlan.length !== 1}
                title={selectedPlan.length !== 1 ? 'Select exactly one plan to view strategy' : 'View strategy for selected plan'}
              >
                <span className="mr-1">🎯</span> Strategy
              </Button>
            </div>
          </Card>

          {/* Overdue Banner */}
          {overdueTasks.length > 0 && (
            <Card className="bg-rose-50 border-rose-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
                  <ICONS.Focus size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-rose-800">
                    {overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'}
                  </p>
                  <p className="text-xs text-rose-600">Complete them soon to stay on track!</p>
                </div>
              </div>
            </Card>
          )}

          {/* Tasks List */}
          {selectedView === 'strategy' ? (
            selectedPlan.length === 1 ? (
              <StrategyPanel
                planId={selectedPlan[0]}
                tasks={tasksToShow}
                onStrategyExecuted={() => {
                  // Refresh tasks when strategy is executed
                  window.location.reload();
                }}
              />
            ) : (
              <Card className="p-8 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select a Plan to View Strategy
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose exactly one plan from the sidebar to see its scheduling strategy and recommendations.
                </p>
              </Card>
            )
          ) : selectedView === 'calendar' ? (
            <Calendar
              tasks={[...monthTasks, ...(monthEvents as any[])]} // Merge legacy tasks and new events
              plans={plans}
              viewDate={calendarDate}
              onViewDateChange={setCalendarDate}
              onTaskClick={(task) => {
                setEditingTask(task.id);
                setEditForm(task);
              }}
              onPlanClick={(plan) => {
                if (selectedPlan.includes(plan.id)) {
                  setSelectedPlan(selectedPlan.filter(id => id !== plan.id));
                } else {
                  setSelectedPlan([...selectedPlan, plan.id]);
                }
              }}
              onDateClick={(date) => {
                console.log('Date clicked:', date);
              }}
              onDeleteTask={handleDeleteSession}
              onEditTask={(task) => {
                setEditingSession(task);
              }}
              onAddTask={(date) => {
                setShowManualModal(true);
                setManualForm(prev => ({ ...prev, startDate: date.toISOString().split('T')[0] }));
              }}
            />
          ) : (
            <>
              {selectedView === 'today' && todayEvents.length > 0 && (
                <Card className="bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-white dark:to-slate-800 border-indigo-100 dark:border-indigo-800">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">Today&apos;s Execution Plan</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Time-slot schedule — follow the order below.</p>
                  <div className="space-y-2">
                    {([...todayEvents] as any[])
                      .filter((e) => e.status !== 'cancelled' && e.status !== 'completed')
                      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                      .map((ev) => {
                        const start = new Date(ev.startTime);
                        const end = new Date(ev.endTime);
                        const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                        return (
                          <div
                            key={ev.id || ev._id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                          >
                            <span className="text-sm font-mono font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 w-24">{timeStr}</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{ev.title}</span>
                            {ev.topic && <span className="text-xs text-slate-500 dark:text-slate-400">({ev.topic})</span>}
                          </div>
                        );
                      })}
                  </div>
                </Card>
              )}
              <TasksList
                tasks={tasksToShow}
                selectedView={selectedView as any}
                loading={loadingToday || loadingUpcoming}
                editingTaskId={editingTask}
                editForm={editForm}
                onStartEdit={(task) => {
                  setEditingTask(task.id);
                  setEditForm(task);
                }}
                onEditFormChange={(updates) => setEditForm({ ...editForm, ...updates })}
                onSaveEdit={async (taskId) => {
                  await updateTask.mutateAsync({ taskId, data: editForm });
                  setEditingTask(null);
                  setEditForm({});
                }}
                onCancelEdit={() => {
                  setEditingTask(null);
                  setEditForm({});
                }}
                onRequestComplete={(taskId) => setTaskToComplete(taskId)}
                onDeleteTask={(taskId) => deleteTask.mutate(taskId)}
              />
            </>
          )}
        </div>
      </div>

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">🤖 Generate AI Study Plan</h3>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setAiGenerated(null);
                  setEditableAIPlan(null);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <ICONS.Plus size={20} className="rotate-45" />
              </button>
            </div>

            {!aiGenerated ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Subject/Course *</label>
                  <Input
                    value={aiForm.subject}
                    onChange={(e) => setAiForm({ ...aiForm, subject: e.target.value })}
                    placeholder="e.g., Data Structures, Machine Learning, Calculus"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Topics to Cover *</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        placeholder="Enter a topic and press Add"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && topicInput.trim()) {
                            setAiForm({ ...aiForm, topics: [...aiForm.topics, topicInput.trim()] });
                            setTopicInput('');
                          }
                        }}
                      />
                      <Button
                        onClick={() => {
                          if (topicInput.trim()) {
                            setAiForm({ ...aiForm, topics: [...aiForm.topics, topicInput.trim()] });
                            setTopicInput('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aiForm.topics.map((topic, i) => (
                        <Badge key={i} variant="indigo" className="gap-2">
                          {topic}
                          <button
                            onClick={() => {
                              setAiForm({ ...aiForm, topics: aiForm.topics.filter((_, idx) => idx !== i) });
                            }}
                            className="hover:bg-indigo-600 rounded"
                          >
                            <ICONS.Plus size={12} className="rotate-45" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={aiForm.startDate}
                      onChange={(e) => setAiForm({ ...aiForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">End Date</label>
                    <Input
                      type="date"
                      value={aiForm.endDate}
                      onChange={(e) => setAiForm({ ...aiForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Optional: Weekly timetable blocks (e.g. college, labs) - scheduler will avoid these */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Weekly blocks (optional) — e.g. college, labs
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Add fixed blocks so the scheduler won&apos;t place study sessions in these times.
                  </p>
                  <div className="space-y-2">
                    {(aiForm.weeklyTimetableBlocks || []).map((block, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <select
                          value={block.dayOfWeek}
                          onChange={(e) => {
                            const blocks = [...(aiForm.weeklyTimetableBlocks || [])];
                            blocks[idx] = { ...block, dayOfWeek: Number(e.target.value) };
                            setAiForm({ ...aiForm, weeklyTimetableBlocks: blocks });
                          }}
                          className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
                        >
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                            <option key={d} value={i}>{d}</option>
                          ))}
                        </select>
                        <Input
                          type="time"
                          value={block.startTime}
                          onChange={(e) => {
                            const blocks = [...(aiForm.weeklyTimetableBlocks || [])];
                            blocks[idx] = { ...block, startTime: e.target.value };
                            setAiForm({ ...aiForm, weeklyTimetableBlocks: blocks });
                          }}
                          className="w-28"
                        />
                        <span className="text-slate-400">–</span>
                        <Input
                          type="time"
                          value={block.endTime}
                          onChange={(e) => {
                            const blocks = [...(aiForm.weeklyTimetableBlocks || [])];
                            blocks[idx] = { ...block, endTime: e.target.value };
                            setAiForm({ ...aiForm, weeklyTimetableBlocks: blocks });
                          }}
                          className="w-28"
                        />
                        <Input
                          placeholder="Label (e.g. College)"
                          value={block.label || ''}
                          onChange={(e) => {
                            const blocks = [...(aiForm.weeklyTimetableBlocks || [])];
                            blocks[idx] = { ...block, label: e.target.value };
                            setAiForm({ ...aiForm, weeklyTimetableBlocks: blocks });
                          }}
                          className="flex-1 min-w-[100px]"
                        />
                        <button
                          type="button"
                          onClick={() => setAiForm({ ...aiForm, weeklyTimetableBlocks: (aiForm.weeklyTimetableBlocks || []).filter((_, i) => i !== idx) })}
                          className="p-1 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded"
                        >
                          <ICONS.Plus size={16} className="rotate-45" />
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setAiForm({ ...aiForm, weeklyTimetableBlocks: [...(aiForm.weeklyTimetableBlocks || []), { dayOfWeek: 1, startTime: '09:00', endTime: '11:00', label: 'Block' }] })}
                    >
                      + Add block
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Daily Study Hours</label>
                    <Input
                      type="number"
                      min="0.5"
                      max="12"
                      step="0.5"
                      value={aiForm.dailyStudyHours}
                      onChange={(e) => setAiForm({ ...aiForm, dailyStudyHours: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Difficulty</label>
                    <select
                      value={aiForm.difficulty}
                      onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full gap-2"
                  onClick={handleGenerateAIPlan}
                  disabled={generatePlan.isPending || !aiForm.subject || aiForm.topics.length === 0}
                >
                  {generatePlan.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Generating with AI...
                    </>
                  ) : (
                    '✨ Generate AI Plan'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Complexity Warnings - Show prominently if exist */}
                {aiGenerated?.warnings && aiGenerated.warnings.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-500 dark:bg-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <ICONS.Focus size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-amber-900 dark:text-amber-200 text-base mb-2">⚠️ Important Warnings</p>
                        <ul className="space-y-2">
                          {aiGenerated.warnings.map((warning, i) => (
                            <li key={i} className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                              {warning}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 font-semibold">
                          💡 This plan provides a structured overview. Adjust dates or reduce topics if you need deeper mastery.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Editable Plan Info */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Plan Title</label>
                    <Input
                      value={editableAIPlan?.title || ''}
                      onChange={(e) => setEditableAIPlan(prev => prev ? { ...prev, title: e.target.value } : null)}
                      placeholder="Plan title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <textarea
                      value={editableAIPlan?.description || ''}
                      onChange={(e) => setEditableAIPlan(prev => prev ? { ...prev, description: e.target.value } : null)}
                      placeholder="Plan description"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="indigo">{editableAIPlan?.tasks?.length || 0} tasks</Badge>
                    <Badge variant="emerald">{aiGenerated?.estimatedCompletionDays} days</Badge>
                  </div>
                </div>

                {editableAIPlan && editableAIPlan.tasks.length === 0 && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl text-center">
                    <p className="text-amber-800 font-bold">⚠️ No tasks</p>
                    <p className="text-sm text-amber-600 mt-1">Try clicking Regenerate</p>
                  </div>
                )}

                {/* Editable Tasks List */}
                <div className="max-h-80 overflow-y-auto space-y-2 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2 sticky top-0 bg-white dark:bg-slate-900 pb-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Edit Tasks</p>
                  </div>
                  {editableAIPlan?.tasks.map((task, i) => (
                    <div key={i} className="text-sm p-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-lg space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <Input
                          value={task.title}
                          onChange={(e) => {
                            const newTasks = [...(editableAIPlan?.tasks || [])];
                            newTasks[i] = { ...newTasks[i], title: e.target.value };
                            setEditableAIPlan(prev => prev ? { ...prev, tasks: newTasks } : null);
                          }}
                          className="flex-1 text-sm font-bold"
                          placeholder="Task title"
                        />
                        <button
                          onClick={() => {
                            const newTasks = editableAIPlan?.tasks.filter((_, idx) => idx !== i) || [];
                            setEditableAIPlan(prev => prev ? { ...prev, tasks: newTasks, totalTasks: newTasks.length } : null);
                          }}
                          className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded"
                          title="Remove task"
                        >
                          <ICONS.Plus size={16} className="text-rose-500 dark:text-rose-400 rotate-45" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={task.scheduledDate.split('T')[0]}
                          onChange={(e) => {
                            const newTasks = [...(editableAIPlan?.tasks || [])];
                            newTasks[i] = { ...newTasks[i], scheduledDate: e.target.value };
                            setEditableAIPlan(prev => prev ? { ...prev, tasks: newTasks } : null);
                          }}
                          className="text-xs"
                        />
                        <Input
                          type="number"
                          value={task.duration}
                          onChange={(e) => {
                            const newTasks = [...(editableAIPlan?.tasks || [])];
                            newTasks[i] = { ...newTasks[i], duration: parseInt(e.target.value) };
                            setEditableAIPlan(prev => prev ? { ...prev, tasks: newTasks } : null);
                          }}
                          placeholder="Duration (min)"
                          className="text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setAiGenerated(null); setEditableAIPlan(null); }} className="flex-1">
                    Regenerate
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSaveAIPlan}
                    disabled={createPlan.isPending}
                    className="flex-1 gap-2"
                  >
                    {createPlan.isPending ? 'Saving...' : '💾 Save Plan'}
                  </Button>
                </div>

                {aiGenerated && aiGenerated.recommendations.length > 0 && (
                  <div className="bg-indigo-50 border-2 border-indigo-100 rounded-xl p-4">
                    <p className="font-bold text-indigo-900 text-sm mb-2">💡 AI Recommendations:</p>
                    <ul className="space-y-1">
                      {aiGenerated.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-indigo-700">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Complete Task Modal */}
      {taskToComplete && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-4">Complete Task 🎉</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">How did it go? (optional)</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Add notes about what you learned..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-600 outline-none resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setTaskToComplete(null)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleCompleteTask} className="flex-1">
                  Mark Complete ✅
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Manual Plan Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">📝 Create Manual Plan</h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <ICONS.Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Plan Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Plan Title *</label>
                  <Input
                    value={manualForm.title}
                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                    placeholder="e.g., Machine Learning Fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Subject *</label>
                  <Input
                    value={manualForm.subject}
                    onChange={(e) => setManualForm({ ...manualForm, subject: e.target.value })}
                    placeholder="e.g., Computer Science, Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                  <textarea
                    value={manualForm.description}
                    onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    placeholder="Brief description of your study plan"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-600 outline-none resize-none"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={manualForm.startDate}
                      onChange={(e) => setManualForm({ ...manualForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">End Date</label>
                    <Input
                      type="date"
                      value={manualForm.endDate}
                      onChange={(e) => setManualForm({ ...manualForm, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Difficulty</label>
                    <select
                      value={manualForm.difficulty}
                      onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-600 outline-none"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Task Input */}
              <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Add Tasks</h4>
                <div className="space-y-2 mb-3">
                  <Input
                    value={taskInput.title}
                    onChange={(e) => setTaskInput({ ...taskInput, title: e.target.value })}
                    placeholder="Task title *"
                  />
                  <Input
                    value={taskInput.description}
                    onChange={(e) => setTaskInput({ ...taskInput, description: e.target.value })}
                    placeholder="Task description"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      type="date"
                      value={taskInput.scheduledDate}
                      onChange={(e) => setTaskInput({ ...taskInput, scheduledDate: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="time"
                        value={taskInput.startTime}
                        onChange={(e) => setTaskInput({ ...taskInput, startTime: e.target.value })}
                        className="text-xs"
                      />
                      <Input
                        type="time"
                        value={taskInput.endTime}
                        onChange={(e) => setTaskInput({ ...taskInput, endTime: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <select
                      value={taskInput.priority}
                      onChange={(e) => setTaskInput({ ...taskInput, priority: e.target.value as any })}
                      className="px-3 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <Input
                      value={taskInput.topic}
                      onChange={(e) => setTaskInput({ ...taskInput, topic: e.target.value })}
                      placeholder="Topic"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (taskInput.title.trim()) {
                        setManualForm({
                          ...manualForm,
                          tasks: [...manualForm.tasks, { ...taskInput }]
                        });
                        setTaskInput({
                          title: '',
                          description: '',
                          scheduledDate: new Date().toISOString().split('T')[0],
                          startTime: '09:00',
                          endTime: '10:00',
                          priority: 'medium',
                          topic: '',
                        });
                      }
                    }}
                  >
                    <ICONS.Plus size={16} /> Add Task
                  </Button>
                </div>

                {/* Tasks List */}
                {manualForm.tasks.length > 0 && (
                  <div className="max-h-64 overflow-y-auto space-y-2 border-2 border-slate-100 rounded-xl p-3">
                    <p className="text-sm font-bold text-slate-700 mb-2">{manualForm.tasks.length} Tasks</p>
                    {manualForm.tasks.map((task, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-800">{task.title}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(task.scheduledDate)} • {task.startTime}-{task.endTime} • {task.priority}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setManualForm({
                              ...manualForm,
                              tasks: manualForm.tasks.filter((_, idx) => idx !== i)
                            });
                          }}
                          className="p-1 hover:bg-rose-100 rounded"
                        >
                          <ICONS.Plus size={14} className="text-rose-500 rotate-45" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t-2 border-slate-100">
                <Button
                  variant="secondary"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveManualPlan}
                  disabled={createPlan.isPending || !manualForm.title || !manualForm.subject || manualForm.tasks.length === 0}
                  className="flex-1 gap-2"
                >
                  {createPlan.isPending ? 'Saving...' : '💾 Create Plan'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <AlertModal {...alertState} onClose={hideAlert} />
      {/* Edit Session Modal (Calendar) */}
      {editingSession && (
        <EditSessionModal
          session={editingSession}
          onClose={() => setEditingSession(null)}
          onSave={async (id, updates, isEvent) => {
            console.log('Saving session:', id, updates, isEvent);
            if (isEvent) {
              await updateEvent.mutateAsync({ eventId: id, data: updates });
            } else {
              await updateTask.mutateAsync({ taskId: id, data: updates });
            }
            setEditingSession(null);
          }}
        />
      )}
    </div>
  );
};

export default Planner;
