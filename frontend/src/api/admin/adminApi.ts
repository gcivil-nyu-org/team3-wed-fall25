// Admin API functions

import axiosInstance from '../axiosInstance';

// Admin types
export type AdminStats = {
  totalUsers: number;
  totalReviews: number;
  pendingReports: number;
  buildingsTracked: number;
};

export type ModerationQueueItem = {
  id: number;
  type: 'review' | 'user';
  content: string;
  author: string;
  reportedBy: number;
  createdAt: string;
  status: 'pending';
  reviewId?: number;
  bbl?: string;
};

export type ActivityLog = {
  id: number;
  action: string;
  admin: string;
  target: string;
  timestamp: string;
  details?: Record<string, unknown>;
};

export type WeeklyStats = {
  reviewsApproved: number;
  reviewsRemoved: number;
  usersBanned: number;
  reportsResolved: number;
};

export type PlatformHealth = {
  apiStatus: 'healthy' | 'warning' | 'error';
  dbStatus: 'healthy' | 'warning' | 'error';
  emailService: 'healthy' | 'warning' | 'error';
  storageUsage: number;
};

// =========================================================
// STATISTICS API FUNCTIONS
// =========================================================

export const fetchAdminStats = async (): Promise<AdminStats> => {
  try {
    const response = await axiosInstance.get<AdminStats>('/admin/stats/');
    return response.data;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

// =========================================================
// MODERATION QUEUE API FUNCTIONS
// =========================================================

export const fetchModerationQueue = async (): Promise<ModerationQueueItem[]> => {
  try {
    const response = await axiosInstance.get<ModerationQueueItem[]>('/admin/moderation-queue/');
    return response.data || [];
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    throw error;
  }
};

export const approveReview = async (reviewId: number): Promise<void> => {
  try {
    await axiosInstance.post(`/admin/reviews/${reviewId}/approve/`);
  } catch (error) {
    console.error('Error approving review:', error);
    throw error;
  }
};

export const removeReview = async (reviewId: number): Promise<void> => {
  try {
    await axiosInstance.post(`/admin/reviews/${reviewId}/remove/`);
  } catch (error) {
    console.error('Error removing review:', error);
    throw error;
  }
};

// =========================================================
// ACTIVITY LOGS API FUNCTIONS
// =========================================================

export const fetchActivityLogs = async (limit: number = 50): Promise<ActivityLog[]> => {
  try {
    const response = await axiosInstance.get<ActivityLog[]>('/admin/activity-logs/', {
      params: { limit },
    });
    return response.data || [];
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    throw error;
  }
};

// =========================================================
// WEEKLY STATS API FUNCTIONS
// =========================================================

export const fetchWeeklyStats = async (): Promise<WeeklyStats> => {
  try {
    const response = await axiosInstance.get<WeeklyStats>('/admin/weekly-stats/');
    return response.data;
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    throw error;
  }
};

// =========================================================
// PLATFORM HEALTH API FUNCTIONS
// =========================================================

export const fetchPlatformHealth = async (): Promise<PlatformHealth> => {
  try {
    const response = await axiosInstance.get<PlatformHealth>('/admin/health/');
    return response.data;
  } catch (error) {
    console.error('Error fetching platform health:', error);
    throw error;
  }
};

