import { Box } from "@mui/material";
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

  return (
    !!user && (
      <Box>
        {(messages?.messages ?? []).map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            direction={message.sender_id === user.id ? "out" : "in"}
          />
        ))}
      </Box>
    )
  );
};

export default MessageList;
