import { Typography, Paper, Rating, Box } from "@mui/material";
import ReviewComments from "../ReviewComments";
import type { BuildingData, CommunityReview } from "../../api";
import ReviewDeleteButton from "./ReviewDeleteButton";
import ReviewUpdateButton from "./ReviewUpdateButton";
import UserLabel from "../UserLabel";
import DateLabel from "../DateLabel";

const Review = ({
  bbl,
  review,
  readonly,
  onStateChangesCallback,
}: {
  bbl: BuildingData["bbl"];
  review: CommunityReview;
  readonly?: boolean;
  onStateChangesCallback(): void;
}) => {
  return (
    <Paper key={review.id} sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1">{review.title}</Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 1, whiteSpace: "pre-line" }}
      >
        {review.body}
      </Typography>

      <Box>
        <Rating sx={{ pt: 1 }} size="small" value={review.rating} readOnly />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <UserLabel username={review.username} />
          <DateLabel date={review.updated_at} />
        </Box>

        {!readonly && (
          <Box>
            <ReviewUpdateButton
              bbl={bbl}
              review={review}
              onSuccess={onStateChangesCallback}
            />
            <ReviewDeleteButton
              reviewId={review.id}
              onSuccess={onStateChangesCallback}
            />
          </Box>
        )}
      </Box>

      {!readonly && (
        <Paper sx={{ p: 1, mt: 2 }}>
          <ReviewComments reviewId={review.id} />
        </Paper>
      )}
    </Paper>
  );
};

export default Review;
