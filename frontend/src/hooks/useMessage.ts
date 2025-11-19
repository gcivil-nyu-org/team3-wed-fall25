import { useEffect, useState } from "react";
import {
  fetchInboxs,
  type CommunityInbox,
} from "../api";
import {
  fetchInboxMessages,
  type CommunityMessageThread,
} from "../api/community";

// Mock data fallback for development/demo purposes
const mockInboxs: CommunityInbox[] = [
  {
    peer: {
      id: 1,
      username: "tenant1",
      email: "tenant1@example.com",
    },
    last_message: {
      id: 1,
      sender_id: 1,
      receiver_id: 2,
      body: "Hi, I have a question about the building maintenance.",
      bbl: "1000010001",
      read_at: "",
      created_at: "2024-01-15T10:00:00Z",
    },
    is_unread: true,
  },
  {
    peer: {
      id: 2,
      username: "landlord1",
      email: "landlord1@example.com",
    },
    last_message: {
      id: 2,
      sender_id: 2,
      receiver_id: 1,
      body: "Thanks for your message. I'll look into it.",
      bbl: "",
      read_at: "2024-01-15T11:00:00Z",
      created_at: "2024-01-15T10:30:00Z",
    },
    is_unread: false,
  },
];

const mockMessageThread: CommunityMessageThread = {
  peer: {
    id: 1,
    username: "tenant1",
    email: "tenant1@example.com",
  },
  messages: [
    {
      id: 1,
      sender_id: 1,
      receiver_id: 2,
      body: "Hi, I have a question about the building maintenance.",
      bbl: "1000010001",
      read_at: "",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
      sender_username: "tenant1",
    },
    {
      id: 2,
      sender_id: 2,
      receiver_id: 1,
      body: "Thanks for your message. I'll look into it.",
      bbl: "",
      read_at: "2024-01-15T11:00:00Z",
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z",
      sender_username: "landlord1",
    },
  ],
};

export const useInboxs = () => {
  const [messages, setMessages] = useState<Array<CommunityInbox>>([]);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    fetchInboxs()
      .then((res) => {
        // Filter out any invalid entries
        const validMessages = Array.isArray(res)
          ? res.filter((inbox) => inbox && inbox.peer && inbox.peer.id)
          : [];
        // Show mock data if no real data available
        setMessages(validMessages.length > 0 ? validMessages : mockInboxs);
      })
      .catch((error) => {
        console.warn("Error fetching inboxs, using mock data:", error);
        // Fallback to mock data
        setMessages(mockInboxs);
      });
  }, [timestamp]);

  return { messages, refresh };
};

export const useMessages = (peer_id: CommunityInbox["peer"]["id"]) => {
  const [messages, setMessages] = useState<CommunityMessageThread | null>(null);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    if (peer_id && peer_id !== 0) {
      fetchInboxMessages(peer_id)
        .then((res) => {
          // Show mock data if no real data available
          if (res && res.messages && res.messages.length > 0) {
            setMessages(res);
          } else {
            // Use mock data for any peer_id when no real data
            setMessages(mockMessageThread);
          }
        })
        .catch((error) => {
          console.warn("Error fetching messages, using mock data:", error);
          // Fallback to mock data
          setMessages(mockMessageThread);
        });
    }
  }, [peer_id, timestamp]);

  return { messages, refresh };
};
