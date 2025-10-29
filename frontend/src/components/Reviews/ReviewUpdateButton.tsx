import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { type BuildingData, type CommunityReview } from "../../api";
import { Edit } from "@mui/icons-material";
import { useState } from "react";
import ReviewForm from "./ReviewForm";

const ReviewUpdateButton = ({
  bbl,
  review,
  onSuccess,
}: {
  bbl: BuildingData["bbl"];
  review: CommunityReview;
  onSuccess(): void;
}) => {
  const [showDialog, setShowDialog] = useState<boolean>(false);

  const handleCloseDialog = () => setShowDialog(false);
  const handleOpenDialog = () => setShowDialog(true);

  return (
    <>
      <IconButton onClick={handleOpenDialog}>
        <Edit sx={{ fontSize: 16 }} />
      </IconButton>

      <Dialog open={showDialog} onClose={handleCloseDialog}>
        <DialogTitle>Update a review</DialogTitle>
        <DialogContent>
          <ReviewForm
            bbl={bbl}
            review={review}
            onSuccess={() => {
              onSuccess();
              handleCloseDialog();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReviewUpdateButton;
