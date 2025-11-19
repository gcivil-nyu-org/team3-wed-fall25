import { useEffect, useState } from "react";
import {
  fetchMyReviews,
  fetchReviews,
  type BuildingData,
  type CommunityReview,
} from "../api";

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
        setError(null);
      })
      .catch((err) => {
        console.error("Error fetching reviews:", err);
        setError(err);
        // Return empty array instead of mock data
        setReviews([]);
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
        // Return actual user data only, empty array if no reviews
        setReviews(reviewsArray);
        setError(null);
      })
      .catch((err) => {
        console.error("Error fetching my reviews:", err);
        setError(err);
        // Return empty array instead of mock data
        setReviews([]);
      })
      .finally(() => setLoading(false));
  }, [timestamp]);

  return { reviews, loading, error, refresh };
};
