import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { deleteReviewComment, type CommunityReviewComment } from "../../api";
import { DeleteOutline } from "@mui/icons-material";
import { useState } from "react";
import type { AxiosError } from "axios";

const ReviewCommentDeleteButton = ({
  commentId,
  onSuccess,
}: {
  commentId: CommunityReviewComment["id"];
  onSuccess(): void;
}) => {
  const [showDialog, setShowDialog] = useState<boolean>(false);

  const handleCloseDialog = () => setShowDialog(false);
  const handleOpenDialog = () => setShowDialog(true);

  const handleDelete = async () => {
    try {
      await deleteReviewComment(commentId);

      onSuccess();
      handleCloseDialog();
    } catch (e) {
      alert((e as AxiosError).message);
    }
  };

  return (
    <>
      <IconButton aria-label="delete" onClick={handleOpenDialog}>
        <DeleteOutline sx={{ fontSize: 16 }} />
      </IconButton>

      <Dialog open={showDialog} onClose={handleCloseDialog}>
        <DialogTitle>Delete comment</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete your comment?
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

export default ReviewCommentDeleteButton;
