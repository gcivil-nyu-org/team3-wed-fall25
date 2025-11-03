import { Box } from "@mui/material";
import Review from "./Review";
import { useMyReview } from "../../hooks/useReview";

const MyReviewList = () => {
  const { reviews } = useMyReview();

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
        }}
      ></Box>

      {reviews.map((review) => (
        <Review
          key={review.id}
          bbl={""}
          review={review}
          readonly
          onStateChangesCallback={() => {}}
        />
      ))}
    </Box>
  );
};

export default MyReviewList;
