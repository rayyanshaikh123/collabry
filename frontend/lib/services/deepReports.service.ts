/**
 * Deep Reports Service
 * Handles admin analytics / deep reports API calls
 */

import { apiClient } from '@/lib/api';

export interface SignupTrendItem {
  date: string;
  count: number;
}

export interface DAUTrendItem {
  date: string;
  activeUsers: number;
}

export interface AIUsageTrendItem {
  date: string;
  totalTokens: number;
  totalQuestions: number;
  uniqueUsers: number;
}

export interface BoardCreationTrendItem {
  date: string;
  count: number;
}

export interface RevenueTrendItem {
  date: string;
  revenue: number;
  count: number;
}

export interface TopUser {
  name: string;
  email: string;
  [key: string]: unknown;
}

export interface UserGrowthReport {
  signupTrend: SignupTrendItem[];
  roleDistribution: { role: string; count: number }[];
  tierDistribution: { tier: string; count: number }[];
  summary: {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    recentLogins: number;
  };
}

export interface EngagementReport {
  dauTrend: DAUTrendItem[];
  topByStudyTime: TopUser[];
  topByXP: TopUser[];
  focusStats: {
    totalSessions: number;
    completedSessions: number;
    totalMinutes: number;
    avgDistractions: number;
  };
  planStats: {
    totalPlans: number;
    aiGenerated: number;
    avgCompletion: number;
    completedPlans: number;
  };
}

export interface AIUsageReport {
  dailyTrend: AIUsageTrendItem[];
  byQuestionType: { type: string; count: number; totalTokens: number }[];
  byModel: { model: string; count: number; totalTokens: number }[];
  topConsumers: TopUser[];
  summary: {
    totalTokens: number;
    totalQuestions: number;
    uniqueUsers: number;
  };
}

export interface BoardsReport {
  creationTrend: BoardCreationTrendItem[];
  collabMetrics: {
    totalBoards: number;
    avgMembers: number;
    avgElements: number;
    soloBoards: number;
    collabBoards: number;
    publicBoards: number;
    archivedBoards: number;
  };
  topCreators: TopUser[];
  popularTags: { tag: string; count: number }[];
}

export interface RevenueReport {
  revenueTrend: RevenueTrendItem[];
  subDistribution: { plan: string; count: number }[];
  byMethod: { method: string; count: number; total: number }[];
  summary: {
    totalRevenue: number;
    totalPayments: number;
    avgPayment: number;
    totalDiscount: number;
    activeSubscriptions: number;
  };
}

export const deepReportsService = {
  async getUserGrowth(days = 30): Promise<UserGrowthReport> {
    const res = await apiClient.get(`/admin/deep-reports/user-growth?days=${days}`);
    return res.data.data;
  },

  async getEngagement(days = 30): Promise<EngagementReport> {
    const res = await apiClient.get(`/admin/deep-reports/engagement?days=${days}`);
    return res.data.data;
  },

  async getAIUsage(days = 30): Promise<AIUsageReport> {
    const res = await apiClient.get(`/admin/deep-reports/ai-usage?days=${days}`);
    return res.data.data;
  },

  async getBoards(days = 30): Promise<BoardsReport> {
    const res = await apiClient.get(`/admin/deep-reports/boards?days=${days}`);
    return res.data.data;
  },

  async getRevenue(days = 30): Promise<RevenueReport> {
    const res = await apiClient.get(`/admin/deep-reports/revenue?days=${days}`);
    return res.data.data;
  },
};

export default deepReportsService;
