import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
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
    onSelect(messages.length > 0 ? messages[0].peer.id : 0);
  }, [messages]);

  useEffect(() => {
    refresh();
  }, [timestamp]);

  return (
    <List>
      {messages.map(({ peer, last_message }) => (
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
