import { useCallback, useEffect, useState } from 'react';
import aiEngineService from '@/lib/services/aiEngine.service';
import { useAuthStore } from '@/lib/stores/auth.store';

export type ScheduledClassStatus = 'scheduled' | 'started' | 'completed' | 'cancelled';

export interface ScheduledClass {
  id: string;
  user_id: string;
  title: string;
  notebook_id: string;
  scheduled_start: string;
  duration_minutes: number;
  status: ScheduledClassStatus;
  source?: string | null;
  room_name?: string | null;
  session_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleClassPayload {
  title: string;
  notebookId?: string;
  source?: string;
  /** Local date in YYYY-MM-DD */
  date: string;
  /** Local time in HH:MM (24h) */
  time: string;
  durationMinutes: number;
}

export interface StartClassCredentials {
  roomName: string;
  token: string;
  wsUrl: string;
  sessionId: string;
}

interface UseScheduledClassesResult {
  classes: ScheduledClass[];
  loading: boolean;
  error: string | null;
  scheduling: boolean;
  scheduleError: string | null;
  joiningClassId: string | null;

  fetchClasses: () => Promise<void>;
  scheduleClass: (payload: ScheduleClassPayload) => Promise<void>;
  startClass: (classId: string) => Promise<StartClassCredentials>;
}

export function useScheduledClasses(): UseScheduledClassesResult {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [joiningClassId, setJoiningClassId] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    // Avoid hitting the API without a valid auth token to prevent 401 spam
    if (!isAuthenticated || !accessToken) {
      setClasses([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await aiEngineService.listVoiceClasses();
      const items: ScheduledClass[] = data?.classes || [];
      setClasses(items);
    } catch (err: any) {
      console.error('Failed to load scheduled classes', err);
      setError(err?.message || 'Failed to load scheduled classes');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  const scheduleClass = useCallback(
    async (payload: ScheduleClassPayload) => {
      try {
        setScheduling(true);
        setScheduleError(null);

        // Convert local date + time to ISO string
        const isoStart = new Date(`${payload.date}T${payload.time}:00`).toISOString();

        const created: ScheduledClass = await aiEngineService.scheduleVoiceClass({
          title: payload.title,
          notebook_id: payload.notebookId || 'general',
          source: payload.source,
          scheduled_start: isoStart,
          duration_minutes: payload.durationMinutes,
        });

        setClasses((prev) => [...prev, created].sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start)));
      } catch (err: any) {
        console.error('Failed to schedule class', err);
        setScheduleError(err?.message || 'Failed to schedule class');
        throw err;
      } finally {
        setScheduling(false);
      }
    },
    [],
  );

  const startClass = useCallback(async (classId: string): Promise<StartClassCredentials> => {
    try {
      setJoiningClassId(classId);
      const resp = await aiEngineService.startScheduledVoiceClass(classId);

      const creds: StartClassCredentials = {
        roomName: resp.room_name,
        token: resp.student_token,
        wsUrl: resp.ws_url,
        sessionId: resp.session_id,
      };

      // Refresh classes in the background to reflect new status
      fetchClasses().catch(() => undefined);

      return creds;
    } catch (err: any) {
      console.error('Failed to start scheduled class', err);
      throw err;
    } finally {
      setJoiningClassId(null);
    }
  }, [fetchClasses]);

  // Initial load
  useEffect(() => {
    fetchClasses().catch(() => undefined);
  }, [fetchClasses]);

  return {
    classes,
    loading,
    error,
    scheduling,
    scheduleError,
    joiningClassId,
    fetchClasses,
    scheduleClass,
    startClass,
  };
}

