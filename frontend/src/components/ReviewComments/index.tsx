import { Box, Typography } from "@mui/material";
import { useReviewComment } from "../../hooks/useReviewComment";
import type { CommunityReview } from "../../api";
import ReviewCommentForm from "./ReviewCommentForm";
import ReviewComment from "./ReviewComment";

const ReviewComments = ({ reviewId }: { reviewId: CommunityReview["id"] }) => {
  const { comments, refresh: refreshComments } = useReviewComment(reviewId);

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Typography variant="subtitle2" gutterBottom>
          Comments {comments.length}
        </Typography>
      </Box>
      {comments.map((comment) => (
        <ReviewComment
          comment={comment}
          onStateChangesCallback={refreshComments}
        />
      ))}

      <Box sx={{ pt: 2 }}>
        <ReviewCommentForm reviewId={reviewId} onSuccess={refreshComments} />
      </Box>
    </Box>
  );
};

export default ReviewComments;
