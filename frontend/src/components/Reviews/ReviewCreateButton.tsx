import { Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { type BuildingData } from "../../api";
import { useState } from "react";
import ReviewForm from "./ReviewForm";

const ReviewCreateButton = ({
  bbl,
  onSuccess,
}: {
  bbl: BuildingData["bbl"];
  onSuccess(): void;
}) => {
  const [showDialog, setShowDialog] = useState<boolean>(false);

  const handleCloseDialog = () => setShowDialog(false);
  const handleOpenDialog = () => setShowDialog(true);

  return (
    <>
      <Button variant="outlined" size="small" onClick={handleOpenDialog}>
        Write a review
      </Button>

      <Dialog open={showDialog} onClose={handleCloseDialog}>
        <DialogTitle>Write a review</DialogTitle>
        <DialogContent>
          <ReviewForm
            bbl={bbl}
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

export default ReviewCreateButton;
