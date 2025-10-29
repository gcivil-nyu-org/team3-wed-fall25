import {
  Box,
  TextareaAutosize,
  Button,
  TextField,
  Rating,
} from "@mui/material";
import { createReview, updateReview, type CommunityReview } from "../../api";
import type { AxiosError } from "axios";
import { useState } from "react";

const ReviewForm = ({
  bbl,
  review,
  onSuccess,
}: {
  bbl: string;
  review?: CommunityReview;
  onSuccess(): void;
}) => {
  const [title, setTitle] = useState<string>(review?.title || "");
  const [body, setBody] = useState<string>(review?.body || "");
  const [rating, setRating] = useState<number>(
    review?.rating || 0
  );

  const handleSubmit = async () => {
    try {
      review
        ? await updateReview(review.id, title, body, rating)
        : await createReview(bbl, title, body, rating);

      onSuccess();
    } catch (e) {
      alert((e as AxiosError).message);
    }
  };

  return (
    <Box sx={{ p: 1, mb: 2 }}>
      <TextField
        size="small"
        label="Title"
        style={{ width: "100%", background: "white" }}
        sx={{ mb: 1 }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextareaAutosize
        minRows={10}
        style={{ width: "100%" }}
        placeholder="Write a review"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Rating
        value={rating}
        onChange={(_event, newValue) => {
          setRating(newValue || 0);
        }}
      />
      <Box sx={{ textAlign: "right" }}>
        <Button size="small" variant="contained" onClick={handleSubmit}>
          {review ? "Update" : "Write"}
        </Button>
      </Box>
    </Box>
  );
};

export default ReviewForm;
