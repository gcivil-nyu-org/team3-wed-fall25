// Community API functions

import axiosInstance from '../axiosInstance';
import { API_ENDPOINTS } from '../../constants';

// Community types matching backend serializers
export type CommunityReview = {
  id: number;
  user_id: number;
  username?: string;
  email?: string;
  bbl: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type CommunityFavorite = {
  id: number;
  user_id: number;
  bbl: string;
  note?: string;
  created_at: string;
  updated_at: string;
  registration?: {
    house_number?: string;
    street_name?: string;
    boro?: string;
    zip?: string;
    [key: string]: any;
  } | null;
};

export type CommunityReviewComment = {
  id: number;
  review_id: number;
  user_id: number;
  username?: string;
  email?: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type CommunityMessage = {
  id: number;
  sender_id: number;
  sender_username?: string;
  sender_email?: string;
  receiver_id: number;
  receiver_username?: string;
  receiver_email?: string;
  bbl?: string;
  body: string;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityInbox = {
  peer: {
    id: number;
    username?: string;
    email?: string;
  };
  last_message?: CommunityMessage;
  unread_count?: number;
};

export type CommunityMessageThread = {
  peer: CommunityInbox['peer'];
  messages: CommunityMessage[];
};

// Small helper to unwrap OkJSONRenderer { result, data } payloads
const unwrap = <T,>(response: any): T => {
  const data = response?.data?.data ?? response?.data ?? response;
  return data as T;
};

// =========================================================
// REVIEWS API FUNCTIONS
// =========================================================

export const fetchReviews = async (bbl: string): Promise<CommunityReview[]> => {
  try {
    const response = await axiosInstance.get<any>(
      `${API_ENDPOINTS.COMMUNITY.REVIEWS}?bbl=${bbl}`
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }
};

export const fetchMyReviews = async (): Promise<CommunityReview[]> => {
  try {
    const response = await axiosInstance.get<any>(
      `${API_ENDPOINTS.COMMUNITY.REVIEWS}mine/`
    );
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching my reviews:', error);
    throw error;
  }
};

export const createReview = async (
  bbl: string,
  title: string,
  body: string,
  rating: number
): Promise<CommunityReview> => {
  try {
    const response = await axiosInstance.post<CommunityReview>(
      API_ENDPOINTS.COMMUNITY.REVIEWS,
      {
        bbl,
        title,
        body,
        rating,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
};

export const updateReview = async (
  reviewId: number | string,
  title: string,
  body: string,
  rating: number
): Promise<CommunityReview> => {
  try {
    const response = await axiosInstance.put<CommunityReview>(
      `${API_ENDPOINTS.COMMUNITY.REVIEWS}${reviewId}/`,
      {
        title,
        body,
        rating,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
};

export const deleteReview = async (reviewId: number | string): Promise<void> => {
  try {
    await axiosInstance.delete(`${API_ENDPOINTS.COMMUNITY.REVIEWS}${reviewId}/`);
  } catch (error) {
    console.error('Error deleting review:', error);
    throw error;
  }
};

// =========================================================
// REVIEW COMMENTS API FUNCTIONS
// =========================================================

export const fetchReviewComments = async (
  reviewId: number | string
): Promise<CommunityReviewComment[]> => {
  try {
    const response = await axiosInstance.get<CommunityReviewComment[]>(
      `${API_ENDPOINTS.COMMUNITY.REVIEW_COMMENTS}?review_id=${reviewId}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching review comments:', error);
    throw error;
  }
};

export const createReviewComment = async (
  reviewId: number | string,
  comment: string
): Promise<CommunityReviewComment> => {
  try {
    const response = await axiosInstance.post<CommunityReviewComment>(
      API_ENDPOINTS.COMMUNITY.REVIEW_COMMENTS,
      {
        review_id: reviewId,
        body: comment, // Backend expects 'body' field
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating review comment:', error);
    throw error;
  }
};

export const deleteReviewComment = async (commentId: number | string): Promise<void> => {
  try {
    await axiosInstance.delete(`${API_ENDPOINTS.COMMUNITY.REVIEW_COMMENTS}${commentId}/`);
  } catch (error) {
    console.error('Error deleting review comment:', error);
    throw error;
  }
};

// =========================================================
// FAVORITES API FUNCTIONS
// =========================================================

export const fetchFavorites = async (): Promise<CommunityFavorite[]> => {
  try {
    const response = await axiosInstance.get<any>(
      API_ENDPOINTS.COMMUNITY.FAVORITES
    );
    const data = unwrap<any>(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching favorites:', error);
    throw error;
  }
};

export const addFavorite = async (
  bbl: string,
  note?: string
): Promise<CommunityFavorite> => {
  try {
    const response = await axiosInstance.post<CommunityFavorite>(
      API_ENDPOINTS.COMMUNITY.FAVORITES,
      {
        bbl,
        note,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error adding favorite:', error);
    throw error;
  }
};

export const removeFavorite = async (favoriteId: number | string): Promise<void> => {
  try {
    await axiosInstance.delete(`${API_ENDPOINTS.COMMUNITY.FAVORITES}${favoriteId}/`);
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
};

// =========================================================
// MESSAGES API FUNCTIONS
// =========================================================

export const fetchInboxs = async (): Promise<CommunityInbox[]> => {
  try {
    const response = await axiosInstance.get<any>(
      API_ENDPOINTS.COMMUNITY.MESSAGES_INBOX
    );
    const data = unwrap<any>(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching inbox threads:', error);
    throw error;
  }
};

export const fetchInboxMessages = async (
  peerId: number | string
): Promise<CommunityMessageThread> => {
  try {
    const response = await axiosInstance.get<any>(
      `${API_ENDPOINTS.COMMUNITY.MESSAGES_INBOX}?peer_id=${peerId}`
    );
    const data = unwrap<any>(response);

    if (data && Array.isArray(data.messages)) {
      return data as CommunityMessageThread;
    }

    if (Array.isArray(data)) {
      return {
        peer: { id: Number(peerId) },
        messages: data as CommunityMessage[],
      };
    }

    return {
      peer: { id: Number(peerId) },
      messages: [],
    };
  } catch (error) {
    console.error('Error fetching inbox messages:', error);
    throw error;
  }
};

export const fetchOutboxMessages = async (): Promise<CommunityMessage[]> => {
  try {
    const response = await axiosInstance.get<CommunityMessage[]>(
      API_ENDPOINTS.COMMUNITY.MESSAGES_OUTBOX
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching outbox messages:', error);
    throw error;
  }
};

export const sendMessage = async (
  receiverId: number | string,
  body: string,
  bbl?: string
): Promise<CommunityMessage> => {
  try {
    const response = await axiosInstance.post<CommunityMessage>(
      API_ENDPOINTS.COMMUNITY.MESSAGES_SEND,
      {
        receiver_id: receiverId,
        body,
        bbl: bbl || null,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const markMessageAsRead = async (messageId: number | string): Promise<void> => {
  try {
    await axiosInstance.put(
      `${API_ENDPOINTS.COMMUNITY.MESSAGES_MARK_READ}/${messageId}/read/`
    );
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

export const deleteMessage = async (messageId: number | string): Promise<void> => {
  try {
    await axiosInstance.delete(
      `${API_ENDPOINTS.COMMUNITY.MESSAGES_DELETE}/${messageId}/`
    );
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

