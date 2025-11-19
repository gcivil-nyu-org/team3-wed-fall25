import { useEffect, useState } from "react";
import {
  fetchMyReviews,
  fetchReviews,
  type BuildingData,
  type CommunityReview,
} from "../api";

// Mock data fallback for development/demo purposes
const mockReviews: CommunityReview[] = [
  {
    id: 1,
    bbl: "1000010001",
    user_id: 1,
    title: "Great building!",
    body: "This building has excellent maintenance and responsive management. Highly recommend!",
    rating: 5,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    username: "tenant1",
    email: "tenant1@example.com",
  },
  {
    id: 2,
    bbl: "2000020002",
    user_id: 2,
    title: "Good location",
    body: "The location is convenient, but the heating could be better in winter.",
    rating: 4,
    created_at: "2024-01-10T14:30:00Z",
    updated_at: "2024-01-10T14:30:00Z",
    username: "tenant2",
    email: "tenant2@example.com",
  },
];

export const useReview = (bbl: BuildingData["bbl"]) => {
  const [reviews, setReviews] = useState<Array<CommunityReview>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    fetchReviews(bbl)
      .then((res: any) => {
        // Ensure res is an array
        const data = Array.isArray(res) ? res : (res?.data || []);
        setReviews(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn("Error fetching reviews, using mock data:", err);
        setError(err);
        // Fallback to mock data filtered by BBL
        setReviews(mockReviews.filter((r) => r.bbl === bbl));
      })
      .finally(() => setLoading(false));
  }, [timestamp, bbl]);

  return { reviews, loading, error, refresh };
};

export const useMyReview = () => {
  const [reviews, setReviews] = useState<Array<CommunityReview>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    fetchMyReviews()
      .then((res: any) => {
        // Ensure res is an array
        const data = Array.isArray(res) ? res : (res?.data || []);
        const reviewsArray = Array.isArray(data) ? data : [];
        // Show mock data if no real data available
        setReviews(reviewsArray.length > 0 ? reviewsArray : mockReviews);
      })
      .catch((err) => {
        console.warn("Error fetching my reviews, using mock data:", err);
        setError(err);
        // Fallback to mock data
        setReviews(mockReviews);
      })
      .finally(() => setLoading(false));
  }, [timestamp]);

  return { reviews, loading, error, refresh };
};
