import { Box, IconButton, TextareaAutosize } from "@mui/material";
import { createReviewComment, type CommunityReview } from "../../api";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../hooks";

import { InsertCommentOutlined } from "@mui/icons-material";
import type { AxiosError } from "axios";

const ReviewCommentForm = ({
  reviewId,
  onSuccess,
}: {
  reviewId: CommunityReview["id"];
  onSuccess(): void;
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [comment, setComment] = useState<string>("");

  const handleSubmit = async () => {
    // Check if user is authenticated
    if (!user) {
      // Redirect to login page if not authenticated
      navigate("/signin");
      return;
    }

    try {
      await createReviewComment(reviewId, comment);

      onSuccess();
      setComment("");
    } catch (e) {
      alert((e as AxiosError).message);
    }
  };

  return (
    <Box
      sx={{
        p: 1,
        mb: 2,
        display: "flex",
        justifyContent: "space-between",
        gap: 1,
      }}
    >
      <TextareaAutosize
        minRows={2}
        style={{ width: "100%" }}
        onChange={(e) => setComment(e.target.value)}
        value={comment}
      />

      <IconButton aria-label="create" onClick={handleSubmit}>
        <InsertCommentOutlined sx={{ fontSize: 20 }} />
      </IconButton>
    </Box>
  );
};
export default ReviewCommentForm;
