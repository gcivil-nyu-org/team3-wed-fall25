import { Box, Typography } from "@mui/material";
import { useMessages } from "../../hooks/useMessage";
import { type CommunityInbox } from "../../api";
import MessageItem from "./MessageItem";
import { useProfile } from "../../hooks/useProfile";
import { useEffect } from "react";

const MessageList = ({
  peerId,
  timestamp,
}: {
  peerId: CommunityInbox["peer"]["id"];
  timestamp: number;
}) => {
  const { user } = useProfile();
  const { messages, refresh } = useMessages(peerId);

  useEffect(() => {
    refresh();
  }, [timestamp]);

  if (!user) {
    return null;
  }

  if (!messages) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Loading messages...
        </Typography>
      </Box>
    );
  }

  const messageList = messages.messages ?? [];

  if (messageList.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          No messages yet. Start the conversation!
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {messageList.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          direction={message.sender_id === user.id ? "out" : "in"}
        />
      ))}
    </Box>
  );
};

export default MessageList;
