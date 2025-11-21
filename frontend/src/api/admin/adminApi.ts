// Admin API functions

import axiosInstance from '../axiosInstance';

// Types
export interface AdminStats {
  totalUsers: number;
  totalReviews: number;
  pendingReports: number;
  buildingsTracked: number;
}

export interface ModerationQueueItem {
  id: number;
  type: string;
  content: string;
  author: string;
  reportedBy: number;
  createdAt: string;
  status: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  admin: string;
  target: string;
  timestamp: string;
  details?: any;
}

export interface WeeklyStats {
  reviewsApproved: number;
  reviewsRemoved: number;
  usersBanned: number;
  reportsResolved: number;
}

export interface PlatformHealth {
  apiStatus: string;
  dbStatus: string;
  emailService: string;
  storageUsage: number;
}

// API Functions
export const fetchAdminStats = async (): Promise<AdminStats> => {
  try {
    const response = await axiosInstance.get<AdminStats>('/admin/stats/');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

export const fetchModerationQueue = async (): Promise<ModerationQueueItem[]> => {
  try {
    const response = await axiosInstance.get<ModerationQueueItem[]>('/admin/moderation-queue/');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching moderation queue:', error);
    throw error;
  }
};

export const approveReview = async (reviewId: number): Promise<void> => {
  try {
    await axiosInstance.post(`/admin/reviews/${reviewId}/approve/`);
  } catch (error: any) {
    console.error('Error approving review:', error);
    throw error;
  }
};

export const removeReview = async (reviewId: number): Promise<void> => {
  try {
    await axiosInstance.post(`/admin/reviews/${reviewId}/remove/`);
  } catch (error: any) {
    console.error('Error removing review:', error);
    throw error;
  }
};

export const fetchActivityLogs = async (): Promise<ActivityLog[]> => {
  try {
    const response = await axiosInstance.get<ActivityLog[]>('/admin/activity-logs/');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching activity logs:', error);
    throw error;
  }
};

export const fetchWeeklyStats = async (): Promise<WeeklyStats> => {
  try {
    const response = await axiosInstance.get<WeeklyStats>('/admin/weekly-stats/');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching weekly stats:', error);
    throw error;
  }
};

export const fetchPlatformHealth = async (): Promise<PlatformHealth> => {
  try {
    const response = await axiosInstance.get<PlatformHealth>('/admin/health/');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching platform health:', error);
    throw error;
  }
};

