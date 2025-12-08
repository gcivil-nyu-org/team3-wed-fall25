import { Box, Typography } from "@mui/material";
import { useReview } from "../../hooks/useReview";
import { useAuth } from "../../hooks";
import Review from "./Review";
import ReviewCreateButton from "./ReviewCreateButton";
import type { BuildingData } from "../../api";

const Reviews = ({
  bbl,
  hideTitle,
  readonly,
}: {
  bbl: BuildingData["bbl"];
  hideTitle?: boolean;
  readonly?: boolean;
}) => {
  const { user } = useAuth();
  const { reviews, refresh: refreshReviews } = useReview(bbl || "");

  return bbl ? (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {!hideTitle && (
          <Typography variant="h6" gutterBottom>
            Reviews {reviews.length}
          </Typography>
        )}

        {!readonly && user && (
          <ReviewCreateButton bbl={bbl} onSuccess={refreshReviews} />
        )}
      </Box>

      {reviews.map((review) => (
        <Review
          key={review.id}
          bbl={bbl}
          review={review}
          readonly={readonly}
          onStateChangesCallback={refreshReviews}
        />
      ))}
    </Box>
  ) : (
    <></>
  );
};

export default Reviews;
