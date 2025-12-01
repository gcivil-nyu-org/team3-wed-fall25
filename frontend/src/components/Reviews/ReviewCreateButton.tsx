import { Button, Dialog, DialogContent, DialogTitle } from "@mui/material";
import { type BuildingData } from "../../api";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../hooks";
import ReviewForm from "./ReviewForm";

const ReviewCreateButton = ({
  bbl,
  onSuccess,
}: {
  bbl: BuildingData["bbl"];
  onSuccess(): void;
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState<boolean>(false);

  const handleCloseDialog = () => setShowDialog(false);
  const handleOpenDialog = () => {
    // Check if user is authenticated
    if (!user) {
      // Redirect to login page if not authenticated
      navigate("/signin");
      return;
    }
    setShowDialog(true);
  };

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
