import { ForwardToInbox } from "@mui/icons-material";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
} from "@mui/material";
import { useState } from "react";
import MessageForm from "./MessageForm";
import { useNavigate } from "react-router";

const SendMessageButton = ({ peerId }: { peerId: number }) => {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState<boolean>(false);

  const handleCloseDialog = () => setShowDialog(false);
  const handleOpenDialog = () => setShowDialog(true);
  return (
    <>
      <Box
        onClick={handleOpenDialog}
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <ForwardToInbox fontSize="small" />
        <Typography variant="body2" color="text.secondary">
          Send Message
        </Typography>
      </Box>

      <Dialog open={showDialog} onClose={handleCloseDialog}>
        <DialogTitle>Send message</DialogTitle>
        <DialogContent sx={{ width: 562 }}>
          <MessageForm
            peerId={peerId}
            onSuccess={() => {
              handleCloseDialog();

              if (confirm("Message sent.\n Go to the Messages menu?")) {
                navigate("/message");
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SendMessageButton;
