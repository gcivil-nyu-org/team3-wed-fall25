// Main API exports - clean imports for all API functions

export * from './auth';
export * from './building';
export * from './neighborhood';

// Re-export BuildingData from types for backward compatibility
export type { BuildingData } from '../types';

// Community API exports
// TODO: Refactor into a separate community module (similar to auth/building/neighborhood)
import axiosInstance from './axiosInstance';
import type { BuildingData as BuildingDataType } from '../types';

export interface CommunityFavorite extends Pick<BuildingDataType, "registration"> {
  id: number;
  user_id: number;
  bbl: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityReview {
  id: number;
  user_id: number;
  bbl: string;
  rating?: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  email: string;
  username: string;
}

export interface CommunityReviewComment {
  id: number;
  review_id: number;
  user_id: number;
  body: string;
  created_at: string;
  updated_at: string;
  email: string;
  username: string;
}

export interface CommunityInbox {
  peer: {
    id: number;
    username: string;
    email: string;
  };
  last_message: {
    id: number;
    body: string;
    sender_id: number;
    receiver_id: number;
    bbl: string | null;
    created_at: string;
    read_at: string;
  };
  is_unread: boolean;
}

export interface CommunityMessageItem {
  id: number;
  sender_id: number;
  sender_username: string;
  sender_email: string;
  receiver_id: number;
  receiver_username: string;
  receiver_email: string;
  bbl: string;
  body: string;
  read_at: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityMessage {
  peer_id: number;
  bbl: string | null;
  messages: Array<CommunityMessageItem>;
  paging: {
    next_since_id: number;
    prev_before_id: number;
    has_more_before: boolean;
    has_more_after: boolean;
  };
}

// Community API Functions
export const fetchFavorites = async (): Promise<CommunityFavorite[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityFavorite[];
    }>("/community/favorites/", {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching favorites:", error);
    throw error;
  }
};

export const addFavorite = async (
  bbl: string,
  note?: string
): Promise<CommunityFavorite> => {
  try {
    const response = await axiosInstance.post<{
      result: boolean;
      data: CommunityFavorite;
    }>(
      "/community/favorites/",
      {
        bbl,
        note,
      },
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error adding favorite:", error);
    throw error;
  }
};

export const removeFavorite = async (favoriteId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/community/favorites/${favoriteId}/`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      },
    });
  } catch (error) {
    console.error("Error removing favorite:", error);
    throw error;
  }
};

export const fetchReviews = async (bbl: string): Promise<CommunityReview[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityReview[];
    }>(`/community/reviews/?bbl=${bbl}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
};

export const fetchMyReviews = async (): Promise<CommunityReview[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityReview[];
    }>(`/community/reviews/mine/`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
};

export const createReview = async (
  bbl: string,
  title: string,
  body: string,
  rating?: number
): Promise<CommunityReview> => {
  try {
    const response = await axiosInstance.post<{
      result: boolean;
      data: CommunityReview;
    }>(
      "/community/reviews/",
      {
        bbl,
        title,
        body,
        rating,
      },
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error creating review:", error);
    throw error;
  }
};

export const updateReview = async (
  reviewId: number,
  title?: string,
  body?: string,
  rating?: number
): Promise<CommunityReview> => {
  try {
    const response = await axiosInstance.put<{
      result: boolean;
      data: CommunityReview;
    }>(
      `/community/reviews/${reviewId}/`,
      {
        title,
        body,
        rating,
      },
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error updating review:", error);
    throw error;
  }
};

export const deleteReview = async (
  reviewId: number
): Promise<{ detail: string }> => {
  try {
    const response = await axiosInstance.delete<{
      result: boolean;
      data: { detail: string };
    }>(`/community/reviews/${reviewId}/`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
};

export const fetchReviewComments = async (
  reviewId: number
): Promise<CommunityReviewComment[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityReviewComment[];
    }>(`/community/review-comments/?review_id=${reviewId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching review comments:", error);
    throw error;
  }
};

export const createReviewComment = async (
  reviewId: number,
  body: string
): Promise<CommunityReviewComment> => {
  try {
    const response = await axiosInstance.post<{
      result: boolean;
      data: CommunityReviewComment;
    }>(
      "/community/review-comments/",
      {
        review_id: reviewId,
        body,
      },
      {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error creating review comment:", error);
    throw error;
  }
};

export const deleteReviewComment = async (commentId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/community/review-comments/${commentId}/`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("access_token")}`,
      },
    });
  } catch (error) {
    console.error("Error deleting review comment:", error);
    throw error;
  }
};

export const fetchInboxs = async (): Promise<CommunityInbox[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityInbox[];
    }>("/community/messages/threads/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching inbox messages:", error);
    throw error;
  }
};

export const fetchInboxMessages = async (
  peer_id: CommunityInbox["peer"]["id"]
): Promise<CommunityMessage> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityMessage;
    }>(`/community/messages/thread/?peer_id=${peer_id}&limit=50&order=asc`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching inbox messages:", error);
    throw error;
  }
};

export const fetchOutboxMessages = async (): Promise<CommunityMessage[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityMessage[];
    }>("/community/messages/outbox/");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching outbox messages:", error);
    throw error;
  }
};

export const sendMessage = async (
  peer_id: number,
  body: string,
  bbl?: string
): Promise<CommunityMessageItem> => {
  try {
    const response = await axiosInstance.post<{
      result: boolean;
      data: CommunityMessageItem;
    }>(
      "/community/messages/thread/",
      {
        peer_id,
        body,
        bbl,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const markMessageAsRead = async (messageId: number): Promise<void> => {
  try {
    await axiosInstance.put(`/community/messages/${messageId}/read/`);
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/community/messages/${messageId}/`);
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

// Re-export fetchProfile for backward compatibility
export { fetchProfile } from './auth';
