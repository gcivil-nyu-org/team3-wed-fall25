import { Box, Chip, Typography } from "@mui/material";
import { type CommunityMessage } from "../../api/community";

const MessageItem = ({
  message,
  direction,
}: {
  message: CommunityMessage;
  direction: "in" | "out";
}) => {
  const isIn = direction === "in";
  const updatedAt = new Date(message.updated_at);

  return (
    <Box
      sx={{
        p: 1,
        mb: 2,
        display: "flex",
        justifyContent: isIn ? "flex-start" : "flex-end",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          textAlign: isIn ? "left" : "right",
          alignItems: isIn ? "flex-start" : "flex-end",
          gap: 0.5,
        }}
      >
        <Chip
          label={message.body}
          color={isIn ? "primary" : "default"}
          sx={{ alignItems: "left", width: "fit-content" }}
        />
        <Typography variant="caption" color="text.secondary">
          {updatedAt.toLocaleDateString()} {updatedAt.toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default MessageItem;
