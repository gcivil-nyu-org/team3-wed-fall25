import { useEffect, useState } from "react";
import {
  fetchReviewComments,
  type CommunityReview,
  type CommunityReviewComment,
} from "../api";

export const useReviewComment = (reviewId: CommunityReview["id"]) => {
  const [comments, setComments] = useState<Array<CommunityReviewComment>>([]);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    fetchReviewComments(reviewId).then((res) => setComments(res));
  }, [timestamp]);

  return { comments, refresh };
};
