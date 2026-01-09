'use client';

import React, { useState } from 'react';
import { Card, Button, Badge, Input } from '../components/UIElements';
import Calendar from '../components/Calendar';
import { ICONS } from '../constants';
import {
  usePlans,
  useTodayTasks,
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
} from '../src/hooks/useStudyPlanner';
import { StudyPlan, StudyTask, CreatePlanData, AIGeneratedPlan, studyPlannerService } from '../src/services/studyPlanner.service';
import AlertModal from '../components/AlertModal';
import { useAlert } from '../src/hooks/useAlert';

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
  low: 'text-slate-500 bg-slate-100',
  medium: 'text-blue-600 bg-blue-100',
  high: 'text-amber-600 bg-amber-100',
  urgent: 'text-rose-600 bg-rose-100',
};

const Planner: React.FC = () => {
  const { alertState, showAlert, hideAlert } = useAlert();
  const [selectedView, setSelectedView] = useState<'today' | 'upcoming' | 'calendar' | 'plans'>('today');
  const [selectedPlan, setSelectedPlan] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<string | null>(null);
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
      duration: number;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      topic: string;
    }>
  });
  const [taskInput, setTaskInput] = useState({
    title: '',
    description: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    duration: 60,
    priority: 'medium' as const,
    topic: '',
  });

  const handleGenerateAIPlan = async () => {
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

      console.log('Plan created successfully:', plan);

      if (!plan || !plan.id) {
        throw new Error('Plan created but no ID returned');
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
        tasks: tasksToCreate,
      });

      console.log('Tasks created successfully:', createdTasks.length);

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
      });
      
      // Force reload to ensure all data is fresh
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Failed to save plan:', error);
      showAlert({ message: `❌ ${error?.message || 'Failed to save plan'}`, type: 'error' });
    }
  };

  const handleSaveManualPlan = async () => {
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

      if (!plan || !plan.id) {
        throw new Error('Plan created but no ID returned');
      }

      const tasksToCreate = manualForm.tasks.map(task => ({
        planId: plan.id,
        ...task,
        difficulty: manualForm.difficulty,
        resources: [],
      }));

      const createdTasks = await createBulkTasks.mutateAsync({
        planId: plan.id,
        tasks: tasksToCreate,
      });

      showAlert({ message: `✅ Plan "${plan.title}" created with ${createdTasks.length} tasks!`, type: 'success' });
      
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
          <h2 className="text-3xl font-black text-slate-800">Study Planner 📚</h2>
          <p className="text-slate-500 text-sm mt-1">Organize your learning journey with AI-powered planning</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => setShowManualModal(true)}
          >
            <ICONS.Plus size={18} strokeWidth={3} /> Create Manual Plan
          </Button>
          <Button
            variant="primary"
            className="gap-2 shadow-lg shadow-indigo-200"
            onClick={() => setShowAIModal(true)}
          >
            <ICONS.Dashboard size={18} /> Generate AI Plan
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Active Plans</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{plans.length}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center">
              <ICONS.Planner size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Today's Tasks</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{todayTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center">
              <ICONS.Focus size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Upcoming</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{upcomingTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center">
              <ICONS.Dashboard size={24} className="text-white" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Overdue</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{overdueTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center">
              <ICONS.Focus size={24} className="text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Plans */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <h3 className="font-black text-slate-800 text-lg mb-4">My Plans</h3>
            <div className="space-y-2">
              {loadingPlans && <p className="text-sm text-slate-400">Loading plans...</p>}
              {plans.length === 0 && !loadingPlans && (
                <p className="text-sm text-slate-400 text-center py-8">
                  No plans yet.
                  <br />
                  Create your first AI plan! 🚀
                </p>
              )}
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative group w-full text-left p-3 rounded-xl border-2 transition-all ${
                    selectedPlan.includes(plan.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <button
                    onClick={() => {
                      // Toggle selection: add or remove from array
                      if (selectedPlan.includes(plan.id)) {
                        setSelectedPlan(selectedPlan.filter(id => id !== plan.id));
                      } else {
                        setSelectedPlan([...selectedPlan, plan.id]);
                      }
                    }}
                    className="w-full text-left"
                  >
                    <p className="font-bold text-sm text-slate-800">{plan.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{plan.subject}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="indigo" className="text-[10px]">
                        {plan.completionPercentage}%
                      </Badge>
                      <Badge variant="emerald" className="text-[10px]">
                        {plan.completedTasks}/{plan.totalTasks} tasks
                      </Badge>
                    </div>
                  </button>
                  {/* Delete button - shows on hover */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${plan.title}"? This will remove all associated tasks.`)) {
                        try {
                          await studyPlannerService.deletePlan(plan.id);
                          if (selectedPlan.includes(plan.id)) {
                            setSelectedPlan(selectedPlan.filter(id => id !== plan.id));
                          }
                          showAlert({ message: '✅ Plan deleted successfully', type: 'success' });
                          // Force reload to refresh all queries
                          setTimeout(() => window.location.reload(), 500);
                        } catch (error: any) {
                          showAlert({ message: `❌ ${error.message || 'Failed to delete plan'}`, type: 'error' });
                        }
                      }
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-rose-100 hover:bg-rose-200 rounded-lg"
                    title="Delete plan"
                  >
                    <ICONS.Plus size={14} className="text-rose-600 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Main Tasks Area */}
        <div className="lg:col-span-9 space-y-4">
          {/* View Tabs */}
          <Card>
            <div className="flex gap-2">
              <Button
                variant={selectedView === 'today' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView('today')}
              >
                Today
              </Button>
              <Button
                variant={selectedView === 'upcoming' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView('upcoming')}
              >
                Upcoming
              </Button>
              <Button
                variant={selectedView === 'calendar' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedView('calendar')}
              >
                Calendar
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
          {selectedView === 'calendar' ? (
            <Calendar 
              tasks={[...todayTasks, ...upcomingTasks, ...overdueTasks]}
              plans={plans}
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
            />
          ) : (
            <Card>
              <h3 className="font-black text-slate-800 text-lg mb-4">
                {selectedView === 'today' && '📅 Today\'s Tasks'}
                {selectedView === 'upcoming' && '🔮 Upcoming Tasks (7 days)'}
                {selectedView === 'plans' && '📚 All Plans'}
              </h3>

            {loadingToday || loadingUpcoming ? (
              <p className="text-center py-8 text-slate-400">Loading tasks...</p>
            ) : tasksToShow.length === 0 ? (
              <p className="text-center py-12 text-slate-400">
                No tasks for this view.
                <br />
                {selectedView === 'today' && '✨ Enjoy your free day!'}
              </p>
            ) : (
              <div className="space-y-3">
                {tasksToShow.map((task) => (
                  <React.Fragment key={task.id}>
                    {editingTask === task.id ? (
                      // Edit Mode
                      <div className="p-4 rounded-2xl border-2 border-indigo-300 bg-indigo-50">
                      <div className="space-y-3">
                        <Input
                          value={editForm.title || ''}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          placeholder="Task title"
                          className="font-bold"
                        />
                        <Input
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Description"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={editForm.scheduledDate?.split('T')[0] || ''}
                            onChange={(e) => setEditForm({ ...editForm, scheduledDate: e.target.value })}
                          />
                          <select
                            value={editForm.priority || 'medium'}
                            onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                            className="px-3 py-2 rounded-xl border-2 border-slate-200"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={async () => {
                              await updateTask.mutateAsync({
                                taskId: task.id,
                                data: editForm,
                              });
                              setEditingTask(null);
                              setEditForm({});
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTask(null);
                              setEditForm({});
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div
                      className={`p-4 rounded-2xl border-2 transition-all ${
                      task.status === 'completed'
                        ? 'bg-emerald-50 border-emerald-200 opacity-60'
                        : task.isOverdue
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => {
                          if (task.status !== 'completed') {
                            setTaskToComplete(task.id);
                          }
                        }}
                        disabled={task.status === 'completed'}
                        className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          task.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-300 hover:border-indigo-500'
                        }`}
                      >
                        {task.status === 'completed' && (
                          <ICONS.Plus size={16} className="text-white rotate-45" strokeWidth={4} />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-800">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]">
                                {formatDate(task.scheduledDate)}
                              </Badge>
                              {task.scheduledTime && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {formatTime(task.scheduledTime)}
                                </Badge>
                              )}
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${priorityColors[task.priority]}`}>
                                {task.priority}
                              </span>
                              <Badge variant="secondary" className="text-[10px]">
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
                                onClick={() => {
                                  setEditingTask(task.id);
                                  setEditForm(task);
                                }}
                                className="p-2 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="Edit task"
                              >
                                <ICONS.Dashboard size={16} className="text-indigo-600" />
                              </button>
                              <button
                                onClick={() => deleteTask.mutate(task.id)}
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
          )}
        </div>
      </div>

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-800">🤖 Generate AI Study Plan</h3>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setAiGenerated(null);
                  setEditableAIPlan(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ICONS.Plus size={20} className="rotate-45" />
              </button>
            </div>

            {!aiGenerated ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Subject/Course *</label>
                  <Input
                    value={aiForm.subject}
                    onChange={(e) => setAiForm({ ...aiForm, subject: e.target.value })}
                    placeholder="e.g., Data Structures, Machine Learning, Calculus"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Topics to Cover *</label>
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={aiForm.startDate}
                      onChange={(e) => setAiForm({ ...aiForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">End Date</label>
                    <Input
                      type="date"
                      value={aiForm.endDate}
                      onChange={(e) => setAiForm({ ...aiForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Daily Study Hours</label>
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
                    <label className="block text-sm font-bold text-slate-700 mb-2">Difficulty</label>
                    <select
                      value={aiForm.difficulty}
                      onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none"
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
                {/* Editable Plan Info */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Plan Title</label>
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
                <div className="max-h-80 overflow-y-auto space-y-2 border-2 border-slate-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2 sticky top-0 bg-white pb-2">
                    <p className="text-sm font-bold text-slate-700">Edit Tasks</p>
                  </div>
                  {editableAIPlan?.tasks.map((task, i) => (
                    <div key={i} className="text-sm p-3 bg-white border-2 border-slate-100 rounded-lg space-y-2">
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
                          className="p-1 hover:bg-rose-100 rounded"
                          title="Remove task"
                        >
                          <ICONS.Plus size={16} className="text-rose-500 rotate-45" />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <h3 className="text-xl font-black text-slate-800 mb-4">Complete Task 🎉</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">How did it go? (optional)</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Add notes about what you learned..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none resize-none"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-800">📝 Create Manual Plan</h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ICONS.Plus size={20} className="rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Plan Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Plan Title *</label>
                  <Input
                    value={manualForm.title}
                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                    placeholder="e.g., Machine Learning Fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Subject *</label>
                  <Input
                    value={manualForm.subject}
                    onChange={(e) => setManualForm({ ...manualForm, subject: e.target.value })}
                    placeholder="e.g., Computer Science, Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                  <textarea
                    value={manualForm.description}
                    onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    placeholder="Brief description of your study plan"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none resize-none"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={manualForm.startDate}
                      onChange={(e) => setManualForm({ ...manualForm, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">End Date</label>
                    <Input
                      type="date"
                      value={manualForm.endDate}
                      onChange={(e) => setManualForm({ ...manualForm, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Difficulty</label>
                    <select
                      value={manualForm.difficulty}
                      onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Task Input */}
              <div className="border-t-2 border-slate-100 pt-4">
                <h4 className="font-bold text-slate-800 mb-3">Add Tasks</h4>
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
                    <Input
                      type="number"
                      value={taskInput.duration}
                      onChange={(e) => setTaskInput({ ...taskInput, duration: parseInt(e.target.value) })}
                      placeholder="Duration (min)"
                    />
                    <select
                      value={taskInput.priority}
                      onChange={(e) => setTaskInput({ ...taskInput, priority: e.target.value as any })}
                      className="px-3 py-2 rounded-xl border-2 border-slate-200 text-sm"
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
                          duration: 60,
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
                            {formatDate(task.scheduledDate)} • {task.duration}min • {task.priority}
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
    </div>
  );
};

export default Planner;
