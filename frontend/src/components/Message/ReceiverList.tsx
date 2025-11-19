import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  Badge,
} from "@mui/material";
import { useInboxs } from "../../hooks/useMessage";
import { useEffect } from "react";
import { type CommunityInbox } from "../../api";

const ReceiverList = ({
  selectedPeerId,
  timestamp,
  onSelect,
}: {
  selectedPeerId: CommunityInbox["peer"]["id"];
  timestamp: number;
  onSelect: (peerId: CommunityInbox["peer"]["id"]) => void;
}) => {
  const { messages, refresh } = useInboxs();

  useEffect(() => {
    if (messages.length > 0 && messages[0]?.peer?.id && selectedPeerId === 0) {
      onSelect(messages[0].peer.id);
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
  }, [timestamp]);

  const validMessages = messages.filter((inbox) => inbox?.peer?.id);

  if (validMessages.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No conversations yet
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {validMessages.map(({ peer, last_message, is_unread }) => {
        const lastMessageDate = last_message?.created_at
          ? new Date(last_message.created_at)
          : null;

        return (
          <ListItem
            key={peer.id}
            disablePadding
            onClick={() => onSelect(peer.id)}
          >
            <ListItemButton
              selected={selectedPeerId === peer.id}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                position: "relative",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle2">
                        {peer.username || peer.email || `User ${peer.id}`}
                      </Typography>
                      {is_unread && (
                        <Badge color="error" variant="dot" />
                      )}
                    </Box>
                  }
                />
              </Box>
              {last_message && (
                <>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "100%",
                    }}
                  >
                    {last_message.body}
                  </Typography>
                  {lastMessageDate && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                      {lastMessageDate.toLocaleDateString()} {lastMessageDate.toLocaleTimeString()}
                    </Typography>
                  )}
                </>
              )}
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};

export default ReceiverList;
