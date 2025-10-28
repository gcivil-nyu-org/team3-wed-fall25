import { Box, Typography } from "@mui/material";
import { useParams } from "react-router";
import { useReview } from "../../hooks/useReview";
import Review from "./Review";
import ReviewCreateButton from "./ReviewCreateButton";

const Reviews = () => {
  const { bbl } = useParams<{ bbl: string }>();

  const { reviews, refresh: refreshReviews } = useReview(bbl || "");

  return bbl ? (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Reviews {reviews.length}
        </Typography>

        <ReviewCreateButton bbl={bbl} onSuccess={refreshReviews} />
      </Box>

      {reviews.map((review) => (
        <Review
          key={review.id}
          bbl={bbl}
          review={review}
          onStateChangesCallback={refreshReviews}
        />
      ))}
    </Box>
  ) : (
    <></>
  );
};

export default Reviews;
