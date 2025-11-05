import { Box, Typography } from "@mui/material";
import Review from "./Review";
import { useMyReview } from "../../hooks/useReview";

const MyReviewList = () => {
  const { reviews } = useMyReview();

  // Safety check: ensure reviews is always an array
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
        }}
      ></Box>

      {safeReviews.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No reviews yet
          </Typography>
        </Box>
      ) : (
        safeReviews.map((review) => (
          <Review
            key={review.id}
            bbl={""}
            review={review}
            readonly
            onStateChangesCallback={() => {}}
          />
        ))
      )}
    </Box>
  );
};

export default MyReviewList;
