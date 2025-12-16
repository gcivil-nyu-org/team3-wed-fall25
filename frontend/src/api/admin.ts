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

/**
 * Get admin authentication headers.
 * Authentication is handled via JWT tokens sent automatically by axiosInstance.
 * The admin_authenticated flag is only used for frontend routing.
 */
function getAdminHeaders(): Record<string, string> {
  // JWT auth is automatically included by axiosInstance interceptors
  // No additional headers needed - backend validates via is_staff/is_superuser
  return {};
}

// API functions
// Note: User app URLs are registered at /api/auth/ in Django config/urls.py
export async function fetchAdminStats(): Promise<AdminStats> {
  const response = await axiosInstance.get("/auth/admin/stats/", {
    headers: getAdminHeaders(),
  });
  return response.data;
}

export async function fetchFlaggedReviews(): Promise<FlaggedReview[]> {
  const response = await axiosInstance.get("/auth/admin/flagged-reviews/", {
    headers: getAdminHeaders(),
  });
  return response.data;
}

export async function fetchAdminReviews(
  limit = 50,
  offset = 0
): Promise<AdminReview[]> {
  const response = await axiosInstance.get("/auth/admin/reviews/", {
    params: { limit, offset },
    headers: getAdminHeaders(),
  });
  return response.data;
}

export async function approveReview(reviewId: number): Promise<void> {
  await axiosInstance.post(
    `/auth/admin/reviews/${reviewId}/approve/`,
    {},
    { headers: getAdminHeaders() }
  );
}

export async function deleteReview(reviewId: number): Promise<void> {
  await axiosInstance.delete(`/auth/admin/reviews/${reviewId}/`, {
    headers: getAdminHeaders(),
  });
}

export async function fetchAdminUsers(
  limit = 50,
  offset = 0,
  role?: string
): Promise<AdminUser[]> {
  const params: Record<string, string | number> = { limit, offset };
  if (role) params.role = role;
  const response = await axiosInstance.get("/auth/admin/users/", {
    params,
    headers: getAdminHeaders(),
  });
  return response.data;
}

export async function fetchPlatformHealth(): Promise<PlatformHealth> {
  const response = await axiosInstance.get("/auth/admin/health/", {
    headers: getAdminHeaders(),
  });
  return response.data;
}

