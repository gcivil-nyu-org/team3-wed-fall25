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
      .then((res) => {
        // Ensure res is an array
        const data = Array.isArray(res) ? res : (res?.data || []);
        setReviews(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err);
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
      .then((res) => {
        // Ensure res is an array
        const data = Array.isArray(res) ? res : (res?.data || []);
        setReviews(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err);
        setReviews([]);
      })
      .finally(() => setLoading(false));
  }, [timestamp]);

  return { reviews, loading, error, refresh };
};
