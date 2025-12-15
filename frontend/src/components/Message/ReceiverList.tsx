import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Box,
  // Badge,
  Divider,
  Chip,
} from "@mui/material";
import { useInboxs } from "../../hooks/useMessage";
import { useEffect, useState } from "react";
import { type CommunityInbox } from "../../api";
import { fetchUsers } from "../../api/auth/authApi";
import type { User } from "../../types";

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
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Helper to get user display name
  const getUserDisplayName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username || user.email || `User ${user.id}`;
  };

  // Helper to get user role label
  const getUserRoleLabel = (user: User) => {
    if (user.role === "landlord") {
      return "Landlord";
    }
    return "Tenant";
  };

  // Fetch all users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const users = await fetchUsers();
        setAllUsers(users);
      } catch (error) {
        console.error("Error fetching users:", error);
        setAllUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (messages.length > 0 && messages[0]?.peer?.id && selectedPeerId === 0) {
      onSelect(messages[0].peer.id);
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
  }, [timestamp]);

  const validMessages = messages.filter((inbox) => inbox?.peer?.id);

  // Get peer IDs from existing conversations
  const conversationPeerIds = new Set(
    validMessages.map((inbox) => inbox.peer.id)
  );

  // Separate users into: those with conversations and those without
  const usersWithConversations = allUsers.filter((user) =>
    conversationPeerIds.has(user.id)
  );
  const usersWithoutConversations = allUsers.filter(
    (user) => !conversationPeerIds.has(user.id)
  );

  // Sort users: tenants first, then landlords
  const sortUsers = (users: User[]) => {
    return [...users].sort((a, b) => {
      // First by role (tenants before landlords)
      if (a.role !== b.role) {
        return a.role === "tenant" ? -1 : 1;
      }
      // Then by name
      const nameA = getUserDisplayName(a).toLowerCase();
      const nameB = getUserDisplayName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  const sortedUsersWithConversations = sortUsers(usersWithConversations);
  const sortedUsersWithoutConversations = sortUsers(usersWithoutConversations);

  return (
    <Box sx={{ maxHeight: "70vh", overflow: "auto" }}>
      {/* Existing Conversations */}
      {validMessages.length > 0 && (
        <>
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Conversations
            </Typography>
          </Box>
          <List>
            {validMessages.map(
              ({ peer, last_message, is_unread: _is_unread }) => {
                const lastMessageDate = last_message?.created_at
                  ? new Date(last_message.created_at)
                  : null;
                const user = allUsers.find((u) => u.id === peer.id);

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
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          width: "100%",
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography variant="subtitle2">
                                {user
                                  ? getUserDisplayName(user)
                                  : peer.username ||
                                    peer.email ||
                                    `User ${peer.id}`}
                              </Typography>
                              {user && (
                                <Chip
                                  label={getUserRoleLabel(user)}
                                  size="small"
                                  sx={{ height: 20, fontSize: "0.7rem" }}
                                />
                              )}
                              {/* {is_unread && <Badge color="error" variant="dot" />} */}
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
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.7rem" }}
                            >
                              {lastMessageDate.toLocaleDateString()}{" "}
                              {lastMessageDate.toLocaleTimeString()}
                            </Typography>
                          )}
                        </>
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              }
            )}
          </List>
          <Divider sx={{ my: 1 }} />
        </>
      )}

      {/* All Users */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ fontWeight: 600 }}
        >
          {validMessages.length > 0 ? "All Users" : "Start a Conversation"}
        </Typography>
      </Box>
      {loadingUsers ? (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Loading users...
          </Typography>
        </Box>
      ) : usersWithoutConversations.length === 0 &&
        usersWithConversations.length === 0 ? (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No users available
          </Typography>
        </Box>
      ) : (
        <List>
          {/* Show users with conversations first (if not already shown above) */}
          {sortedUsersWithConversations
            .filter(
              (user) => !validMessages.some((msg) => msg.peer.id === user.id)
            )
            .map((user) => (
              <ListItem
                key={user.id}
                disablePadding
                onClick={() => onSelect(user.id)}
              >
                <ListItemButton
                  selected={selectedPeerId === user.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="subtitle2">
                          {getUserDisplayName(user)}
                        </Typography>
                        <Chip
                          label={getUserRoleLabel(user)}
                          size="small"
                          sx={{ height: 20, fontSize: "0.7rem" }}
                        />
                      </Box>
                    }
                    secondary={user.email}
                  />
                </ListItemButton>
              </ListItem>
            ))}

          {/* Show users without conversations */}
          {sortedUsersWithoutConversations.map((user) => (
            <ListItem
              key={user.id}
              disablePadding
              onClick={() => onSelect(user.id)}
            >
              <ListItemButton
                selected={selectedPeerId === user.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle2">
                        {getUserDisplayName(user)}
                      </Typography>
                      <Chip
                        label={getUserRoleLabel(user)}
                        size="small"
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    </Box>
                  }
                  secondary={user.email}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default ReceiverList;
