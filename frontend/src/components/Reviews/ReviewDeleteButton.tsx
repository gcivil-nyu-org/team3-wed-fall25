import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { deleteReview, type CommunityReview } from "../../api";
import { Delete } from "@mui/icons-material";
import { useState } from "react";
import type { AxiosError } from "axios";

const ReviewDeleteButton = ({
  reviewId,
  onSuccess,
}: {
  reviewId: CommunityReview["id"];
  onSuccess(): void;
}) => {
  const [showDialog, setShowDialog] = useState<boolean>(false);

  const handleCloseDialog = () => setShowDialog(false);
  const handleOpenDialog = () => setShowDialog(true);

  const handleDelete = async () => {
    try {
      await deleteReview(reviewId);

      onSuccess();
      handleCloseDialog();
    } catch (e) {
      alert((e as AxiosError).message);
    }
  };

  return (
    <>
      <IconButton aria-label="delete" onClick={handleOpenDialog}>
        <Delete sx={{ fontSize: 16 }} />
      </IconButton>

      <Dialog open={showDialog} onClose={handleCloseDialog}>
        <DialogTitle>Delete review</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete your review?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Disagree</Button>
          <Button onClick={handleDelete} autoFocus>
            Agree
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReviewDeleteButton;
