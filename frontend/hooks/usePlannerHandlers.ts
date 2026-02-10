import { useState } from 'react';
import {
  useCompleteTask,
  useRescheduleTask,
  useDeleteTask,
  useUpdateTask,
  useGeneratePlan,
  useCreatePlan,
  useCreateBulkTasks,
} from '@/hooks/useStudyPlanner';
import { CreatePlanData, AIGeneratedPlan } from '@/lib/services/studyPlanner.service';

interface PlannerHandlersResult {
  // AI Plan handlers
  handleGenerateAIPlan: (aiForm: CreatePlanData, showAlert: (alert: any) => void) => Promise<AIGeneratedPlan | null>;
  handleSaveAIPlan: (
    editableAIPlan: AIGeneratedPlan | null,
    aiForm: CreatePlanData,
    showAlert: (alert: any) => void,
    onSuccess: () => void
  ) => Promise<void>;

  // Manual Plan handlers
  handleSaveManualPlan: (
    manualForm: any,
    showAlert: (alert: any) => void,
    onSuccess: () => void
  ) => Promise<void>;

  // Task handlers
  handleCompleteTask: (taskId: string, notes: string) => Promise<void>;
  handleRescheduleTask: (taskId: string, newDate: string) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleUpdateTask: (taskId: string, updates: any) => Promise<void>;

  // Loading states
  isGenerating: boolean;
  isSaving: boolean;
}

export function usePlannerHandlers(): PlannerHandlersResult {
  const completeTask = useCompleteTask();
  const rescheduleTask = useRescheduleTask();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const generatePlan = useGeneratePlan();
  const createPlan = useCreatePlan();
  const createBulkTasks = useCreateBulkTasks();

  const handleGenerateAIPlan = async (
    aiForm: CreatePlanData,
    showAlert: (alert: any) => void
  ): Promise<AIGeneratedPlan | null> => {
    if (!aiForm.subject || aiForm.topics.length === 0) {
      showAlert({ message: 'Please enter subject and topics', type: 'error' });
      return null;
    }

    const startDate = new Date(aiForm.startDate);
    const endDate = new Date(aiForm.endDate);
    if (endDate <= startDate) {
      showAlert({ message: 'End date must be after start date', type: 'error' });
      return null;
    }

    try {
      const requestData = {
        ...aiForm,
        preferredTimeSlots: aiForm.preferredTimeSlots || ['evening'],
        title: aiForm.title || aiForm.subject,
      };
      const generated = await generatePlan.mutateAsync(requestData);
      return generated;
    } catch (error: any) {
      console.error('Failed to generate plan:', error);
      showAlert({ 
        message: error?.response?.data?.message || error?.message || 'Failed to generate plan.', 
        type: 'error' 
      });
      return null;
    }
  };

  const handleSaveAIPlan = async (
    editableAIPlan: AIGeneratedPlan | null,
    aiForm: CreatePlanData,
    showAlert: (alert: any) => void,
    onSuccess: () => void
  ): Promise<void> => {
    if (!editableAIPlan) {
      showAlert({ message: 'No AI plan to save', type: 'error' });
      return;
    }

    if (!editableAIPlan.tasks || editableAIPlan.tasks.length === 0) {
      showAlert({ message: 'Cannot save plan with no tasks', type: 'error' });
      return;
    }

    try {
      const plan = await createPlan.mutateAsync({
        ...aiForm,
        title: editableAIPlan.title,
        description: editableAIPlan.description,
      });

      if (!plan || !plan.id) {
        throw new Error('Plan created but no ID returned');
      }

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

      const createdTasks = await createBulkTasks.mutateAsync({
        planId: plan.id,
        tasks: tasksToCreate as any,
      });

      showAlert({ 
        message: `✅ Plan "${plan.title}" created with ${createdTasks.length} tasks!`, 
        type: 'success' 
      });
      
      onSuccess();
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Failed to save plan:', error);
      showAlert({ message: `❌ ${error?.message || 'Failed to save plan'}`, type: 'error' });
    }
  };

  const handleSaveManualPlan = async (
    manualForm: any,
    showAlert: (alert: any) => void,
    onSuccess: () => void
  ): Promise<void> => {
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

      const tasksToCreate = manualForm.tasks.map((task: any) => ({
        planId: plan.id,
        ...task,
        difficulty: manualForm.difficulty,
        resources: [],
      }));

      const createdTasks = await createBulkTasks.mutateAsync({
        planId: plan.id,
        tasks: tasksToCreate as any,
      });

      showAlert({ 
        message: `✅ Plan "${plan.title}" created with ${createdTasks.length} tasks!`, 
        type: 'success' 
      });
      
      onSuccess();
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Failed to save manual plan:', error);
      showAlert({ message: `❌ ${error?.message || 'Failed to save plan'}`, type: 'error' });
    }
  };

  const handleCompleteTask = async (taskId: string, notes: string) => {
    try {
      await completeTask.mutateAsync({
        taskId,
        data: { notes, actualDuration: 60 },
      });
    } catch (error) {
      console.error('Failed to complete task', error);
      throw error;
    }
  };

  const handleRescheduleTask = async (taskId: string, newDate: string) => {
    try {
      await rescheduleTask.mutateAsync({ taskId, newDate });
    } catch (error) {
      console.error('Failed to reschedule task', error);
      throw error;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask.mutateAsync(taskId);
    } catch (error) {
      console.error('Failed to delete task', error);
      throw error;
    }
  };

  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      await updateTask.mutateAsync({ taskId, data: updates });
    } catch (error) {
      console.error('Failed to update task', error);
      throw error;
    }
  };

  return {
    handleGenerateAIPlan,
    handleSaveAIPlan,
    handleSaveManualPlan,
    handleCompleteTask,
    handleRescheduleTask,
    handleDeleteTask,
    handleUpdateTask,
    isGenerating: generatePlan.isPending,
    isSaving: createPlan.isPending || createBulkTasks.isPending,
  };
}
