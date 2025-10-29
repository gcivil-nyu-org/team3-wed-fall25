import { Box, Typography } from "@mui/material";
import type { CommunityReviewComment } from "../../api";
import ReviewCommentDeleteButton from "./ReviewCommentDeleteButton";
import UserLabel from "../UserLabel";
import DateLabel from "../DateLabel";

const ReviewComment = ({
  comment,
  onStateChangesCallback,
}: {
  comment: CommunityReviewComment;
  onStateChangesCallback(): void;
}) => (
  <Box key={comment.id}>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ mt: 1, whiteSpace: "pre-line" }}
    >
      {comment.body}
    </Typography>

    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
      <UserLabel username={comment.username} />
      <DateLabel date={comment.updated_at} />

      <ReviewCommentDeleteButton
        commentId={comment.id}
        onSuccess={onStateChangesCallback}
      />
    </Box>
  </Box>
);

export default ReviewComment;
