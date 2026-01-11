import axios from 'axios';

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
  private getAuthHeaders() {
    // Get token from Zustand persist storage (same as aiEngine.service.ts and sessions.service.ts)
    const authStorage = localStorage.getItem('auth-storage');
    let token = '';
    
    console.log('[Gamification] Auth storage:', authStorage ? 'Found' : 'Not found');
    
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        token = state?.accessToken || '';
        console.log('[Gamification] Token extracted:', token ? `${token.substring(0, 20)}...` : 'None');
      } catch (e) {
        console.error('[Gamification] Failed to parse auth storage:', e);
      }
    } else {
      console.warn('[Gamification] No auth-storage in localStorage');
    }
    
    console.log('[Gamification] API URL:', API_URL);
    
    return {
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  async getUserStats(): Promise<GamificationStats | null> {
    try {
      const response = await axios.get(`${API_URL}/gamification/stats`, {
        headers: this.getAuthHeaders(),
      });
      console.log('[Gamification] Stats fetched successfully:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('[Gamification] Error fetching stats:');
      console.error('  Status:', error.response?.status);
      console.error('  Data:', error.response?.data);
      console.error('  Message:', error.message);
      console.error('  Full error:', error);
      // Return null instead of throwing to prevent dashboard crash
      return null;
    }
  }

  async getLeaderboard(type: 'xp' | 'level' | 'streak' | 'tasks' = 'xp', limit = 10): Promise<LeaderboardEntry[]> {
    try {
      const response = await axios.get(`${API_URL}/gamification/leaderboard`, {
        params: { type, limit },
        headers: this.getAuthHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error.response?.data || error.message);
      return [];
    }
  }

  async getFriendLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const response = await axios.get(`${API_URL}/gamification/leaderboard/friends`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching friend leaderboard:', error.response?.data || error.message);
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
      const response = await axios.get(`${API_URL}/gamification/personal-progress`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching personal progress:', error.response?.data || error.message);
      return null;
    }
  }
}

export const gamificationService = new GamificationService();
