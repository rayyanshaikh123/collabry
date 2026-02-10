import { apiClient } from '../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://colab-back.onrender.com/api';

export interface GamificationStats {
  xp: number;
  level: number;
  xpToNextLevel: number;
  levelProgress: number;
  streak: {
    current: number;
    longest: number;
    lastStudyDate: Date | null;
  };
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt: Date;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    progress: number;
    target: number;
    completed: boolean;
    completedAt?: Date;
  }>;
  stats: {
    totalStudyTime: number;
    tasksCompleted: number;
    plansCreated: number;
    notesCreated: number;
    quizzesCompleted: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar: string | null;
  xp: number;
  level: number;
  streak: number;
  tasksCompleted: number;
  badges: number;
  isCurrentUser?: boolean;
}

class GamificationService {
  async getUserStats(): Promise<GamificationStats | null> {
    try {
      const response = await apiClient.get<GamificationStats>('/gamification/stats');
      return response.data ?? null;
    } catch (error: any) {
      console.error('[Gamification] Error fetching stats:', error.message);
      return null;
    }
  }

  async getLeaderboard(type: 'xp' | 'level' | 'streak' | 'tasks' = 'xp', limit = 10): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get<LeaderboardEntry[]>('/gamification/leaderboard', {
        params: { type, limit },
      });
      return response.data ?? [];
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error.message);
      return [];
    }
  }

  async getFriendLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get<LeaderboardEntry[]>('/gamification/leaderboard/friends');
      return response.data ?? [];
    } catch (error: any) {
      console.error('Error fetching friend leaderboard:', error.message);
      return [];
    }
  }

  async getPersonalProgress(): Promise<{
    current: {
      xp: number;
      streak: number;
      tasksCompleted: number;
      studyHours: number;
    };
    previous: {
      xp: number;
      streak: number;
      tasksCompleted: number;
      studyHours: number;
    } | null;
    hasHistory: boolean;
  } | null> {
    try {
      const response = await apiClient.get('/gamification/personal-progress');
      return response.data ?? null;
    } catch (error: any) {
      console.error('Error fetching personal progress:', error.message);
      return null;
    }
  }
}

export const gamificationService = new GamificationService();
