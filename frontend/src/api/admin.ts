/**
 * Admin API service for platform statistics and moderation.
 */

import axiosInstance from "./axiosInstance";

// Types
export interface AdminStats {
  totalUsers: number;
  tenantCount: number;
  landlordCount: number;
  totalReviews: number;
  pendingReports: number;
  buildingsTracked: number;
  totalViolations: number;
  totalEvictions: number;
  totalComplaints: number;
}

export interface FlaggedReview {
  id: number;
  type: string;
  content: string;
  title: string;
  author: string;
  authorId: number;
  bbl: string;
  rating: number | null;
  reportedBy: number;
  createdAt: string;
  status: string;
}

export interface AdminReview {
  id: number;
  userId: number;
  bbl: string;
  title: string;
  body: string;
  rating: number | null;
  author: string;
  address: string;
  createdAt: string;
  flagged: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  isVerified: boolean;
  firstName: string;
  lastName: string;
  dateJoined: string;
  lastLogin: string | null;
}

export interface PlatformHealth {
  apiStatus: string;
  dbStatus: string;
  timestamp: string;
}

// API functions
export async function fetchAdminStats(): Promise<AdminStats> {
  const response = await axiosInstance.get("/api/user/admin/stats/");
  return response.data;
}

export async function fetchFlaggedReviews(): Promise<FlaggedReview[]> {
  const response = await axiosInstance.get("/api/user/admin/flagged-reviews/");
  return response.data;
}

export async function fetchAdminReviews(
  limit = 50,
  offset = 0
): Promise<AdminReview[]> {
  const response = await axiosInstance.get("/api/user/admin/reviews/", {
    params: { limit, offset },
  });
  return response.data;
}

export async function approveReview(reviewId: number): Promise<void> {
  await axiosInstance.post(`/api/user/admin/reviews/${reviewId}/approve/`);
}

export async function deleteReview(reviewId: number): Promise<void> {
  await axiosInstance.delete(`/api/user/admin/reviews/${reviewId}/`);
}

export async function fetchAdminUsers(
  limit = 50,
  offset = 0,
  role?: string
): Promise<AdminUser[]> {
  const params: Record<string, string | number> = { limit, offset };
  if (role) params.role = role;
  const response = await axiosInstance.get("/api/user/admin/users/", {
    params,
  });
  return response.data;
}

export async function fetchPlatformHealth(): Promise<PlatformHealth> {
  const response = await axiosInstance.get("/api/user/admin/health/");
  return response.data;
}

