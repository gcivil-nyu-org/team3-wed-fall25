import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
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
      {validMessages.map(({ peer, last_message }) => (
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
            }}
          >
            <ListItemText primary={peer.username || `User ${peer.id}`} />
            <Typography variant="caption" color="text.secondary">
              {last_message?.body ?? "No messages yet"}
            </Typography>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
};

export default ReceiverList;
