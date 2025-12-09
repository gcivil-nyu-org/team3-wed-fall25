import axiosInstance from "../axiosInstance";

export interface AdminStats {
  totalUsers: number;
  totalReviews: number;
  pendingReports: number;
  buildingsTracked: number;
}

export interface ModerationItem {
  id: number;
  type: string;
  content: string;
  author: string;
  reportedBy: number;
  createdAt: string;
  status: string;
  reviewId?: number;
  bbl?: string;
  title?: string;
  fullContent?: string;
}

export interface WeeklyStats {
  reviewsApproved: number;
  reviewsRemoved: number;
  usersBanned: number;
  reportsResolved: number;
}

export const fetchAdminStats = async (): Promise<AdminStats> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const response = await axiosInstance.get<AdminStats>("/admin/stats/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    throw error;
  }
};

export const fetchFlaggedReviews = async (): Promise<ModerationItem[]> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const response = await axiosInstance.get<{ moderationQueue: ModerationItem[] }>(
      "/admin/flagged-reviews/",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.moderationQueue || [];
  } catch (error) {
    console.error("Error fetching flagged reviews:", error);
    throw error;
  }
};

export const approveReview = async (reviewId: number): Promise<void> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    await axiosInstance.post(
      "/admin/reviews/approve/",
      { review_id: reviewId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
    console.error("Error approving review:", error);
    throw error;
  }
};

export const removeReview = async (reviewId: number): Promise<void> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    await axiosInstance.post(
      "/admin/reviews/remove/",
      { review_id: reviewId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
    console.error("Error removing review:", error);
    throw error;
  }
};

export const banUser = async (userId: number, action: "ban" | "unban" = "ban"): Promise<void> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    await axiosInstance.post(
      "/admin/users/ban/",
      { user_id: userId, action },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error) {
    console.error("Error banning user:", error);
    throw error;
  }
};

export const fetchWeeklyStats = async (): Promise<WeeklyStats> => {
  try {
    const token = sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
    const response = await axiosInstance.get<WeeklyStats>("/admin/weekly-stats/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching weekly stats:", error);
    throw error;
  }
};

