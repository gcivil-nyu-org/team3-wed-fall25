import { Box, Chip, Typography, Badge } from "@mui/material";
import { type CommunityMessage } from "../../api/community";

const MessageItem = ({
  message,
  direction,
}: {
  message: CommunityMessage;
  direction: "in" | "out";
}) => {
  const isIn = direction === "in";
  const createdAt = new Date(message.created_at);
  const isUnread = isIn && !message.read_at;

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
          maxWidth: "70%",
        }}
      >
        {isIn && message.sender_username && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {message.sender_username}
          </Typography>
        )}
        <Badge
          color="error"
          variant="dot"
          invisible={!isUnread}
          sx={{ "& .MuiBadge-badge": { right: -8, top: -8 } }}
        >
          <Chip
            label={message.body}
            color={isIn ? "primary" : "default"}
            sx={{ width: "fit-content", maxWidth: "100%" }}
          />
        </Badge>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}
          </Typography>
          {!isIn && message.read_at && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
              ✓ Read
            </Typography>
          )}
        </Box>
        {message.bbl && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
            Related to BBL: {message.bbl}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default MessageItem;
