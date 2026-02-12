/**
 * Usage tracking service for AI operations monitoring
 * 
 * Provides methods to fetch:
 * - User-level usage statistics
 * - Admin-level global analytics
 * - Real-time monitoring data
 */
import { apiClient } from '@/lib/api';

// Note: All requests go through the backend API proxy at /api/ai/*
// which forwards to the AI engine at localhost:8000

export interface UsageStats {
  user_id: string;
  period_days: number;
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  total_tokens: number; // legacy — kept for AI engine compat
  total_questions: number; // new: maps to total_operations for question counting
  avg_response_time_ms: number;
  success_rate: number;
  operations_by_type: Record<string, number>;
  daily_usage: Record<string, { operations: number; tokens: number; questions?: number }>;
  most_recent_activity: string | null;
  subscription_limit?: number;
  usage_percentage?: number;
}

export interface GlobalUsage {
  period_days: number;
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  total_tokens: number; // legacy
  total_questions: number; // new
  unique_users: number;
  avg_response_time_ms: number;
  success_rate: number;
  operations_by_type: Record<string, number>;
  tokens_by_type: Record<string, number>;
  operations_by_endpoint: Record<string, number>;
  daily_usage: Record<string, any>;
  top_users: Array<{ user_id: string; operations: number }>;
  timestamp: string;
}

export interface RealtimeStats {
  last_hour: {
    total_operations: number;
    successful_operations: number;
    total_tokens: number;
    active_users: number;
    success_rate: number;
  };
  last_5_minutes: {
    operations: number;
  };
  timestamp: string;
}

export interface HealthCheck {
  status: string;
  version: string;
  components: Record<string, string>;
  usage_stats?: RealtimeStats;
  timestamp: string;
}

class UsageService {
  /**
   * Get usage statistics for the current user
   */
  async getMyUsage(days: number = 30): Promise<UsageStats> {
    const response = await apiClient.get(`/ai/usage/me?days=${days}`);
    // Response is wrapped in { success: true, data: {...} } format
    return (response.data?.data || response.data) as UsageStats;
  }

  /**
   * Get usage statistics for a specific user (admin only)
   */
  async getUserUsage(userId: string, days: number = 30): Promise<UsageStats> {
    const response = await apiClient.get(`/ai/usage/user/${userId}?days=${days}`);
    return (response.data?.data || response.data) as UsageStats;
  }

  /**
   * Get global usage statistics (admin only)
   */
  async getGlobalUsage(days: number = 30): Promise<GlobalUsage> {
    const response = await apiClient.get(`/ai/usage/global?days=${days}`);
    return (response.data?.data || response.data) as GlobalUsage;
  }

  /**
   * Get public usage statistics (no auth required)
   */
  async getPublicStats(days: number = 7): Promise<GlobalUsage> {
    const response = await apiClient.get(`/ai/usage/stats?days=${days}`);
    return (response.data?.data || response.data) as GlobalUsage;
  }

  /**
   * Get real-time statistics (admin only)
   */
  async getRealtimeStats(): Promise<RealtimeStats> {
    const response = await apiClient.get(`/ai/usage/realtime`);
    return (response.data?.data || response.data) as RealtimeStats;
  }

  /**
   * Get health check with usage stats (no auth required)
   */
  async getHealth(): Promise<HealthCheck> {
    const response = await apiClient.get(`/ai/health`);
    return (response.data?.data || response.data) as HealthCheck;
  }

  /**
   * Format daily usage data for charts
   */
  formatDailyUsageForChart(dailyUsage: Record<string, any>): Array<{
    date: string;
    operations: number;
    tokens: number;
  }> {
    return Object.entries(dailyUsage)
      .map(([date, data]) => ({
        date,
        operations: data.operations || 0,
        tokens: data.tokens || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Format operations by type for charts
   */
  formatOperationsByType(operationsByType: Record<string, number>): Array<{
    name: string;
    value: number;
  }> {
    return Object.entries(operationsByType).map(([name, value]) => ({
      name: this.formatOperationName(name),
      value,
    }));
  }

  /**
   * Format operation name for display
   */
  private formatOperationName(opType: string): string {
    const names: Record<string, string> = {
      chat: 'Chat',
      chat_stream: 'Chat (Stream)',
      summarize: 'Summarize',
      summarize_stream: 'Summarize (Stream)',
      qa: 'Q&A',
      qa_stream: 'Q&A (Stream)',
      qa_file: 'Q&A File',
      qa_file_stream: 'Q&A File (Stream)',
      mindmap: 'Mind Map',
      upload: 'Upload',
    };
    return names[opType] || opType;
  }

  /**
   * Calculate usage level color
   */
  getUsageLevelColor(percentage: number): string {
    if (percentage < 50) return 'emerald';
    if (percentage < 80) return 'amber';
    return 'rose';
  }

  /**
   * Format large numbers for display
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }
}

export const usageService = new UsageService();
