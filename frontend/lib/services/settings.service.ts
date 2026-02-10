import { apiClient } from '@/lib/api';

export interface PlatformSettings {
  _id?: string;
  platform: {
    name: string;
    description: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
  };
  email: {
    enabled: boolean;
    service: string;
    from: string;
    templates: {
      welcome: string;
      passwordReset: string;
      boardInvite: string;
    };
  };
  ai: {
    enabled: boolean;
    baseUrl: string;
    timeout: number;
    maxTokens: number;
    rateLimits: {
      perUser: number;
      perHour: number;
    };
  };
  features: {
    studyBoard: boolean;
    voiceChat: boolean;
    studyPlanner: boolean;
    aiTutor: boolean;
    collaborativeNotes: boolean;
  };
  storage: {
    maxFileSize: number;
    maxBoardElements: number;
    maxBoardsPerUser: number;
  };
  security: {
    jwtExpiresIn: string;
    bcryptRounds: number;
    passwordMinLength: number;
    enableTwoFactor: boolean;
  };
  analytics: {
    enabled: boolean;
    trackUserActivity: boolean;
    trackBoardUsage: boolean;
    retentionDays: number;
  };
  updatedBy?: string;
  updatedAt?: string;
}

class SettingsService {
  /**
   * Get platform settings
   */
  async getSettings(): Promise<PlatformSettings> {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  }

  /**
   * Update platform settings
   */
  async updateSettings(settings: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const response = await apiClient.put('/admin/settings', settings);
    return response.data;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Parse file size string to bytes
   */
  parseFileSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+\.?\d*)\s*(bytes|kb|mb|gb)$/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      'bytes': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };
    
    return Math.floor(value * (multipliers[unit] || 1));
  }
}

export const settingsService = new SettingsService();
