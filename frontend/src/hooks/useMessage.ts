import { useEffect, useState } from "react";
import {
  fetchInboxs,
  fetchInboxMessages,
  type CommunityInbox,
  type CommunityMessage,
} from "../api";

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
        setMessages(validMessages);
      })
      .catch((error) => {
        console.error("Error fetching inboxs:", error);
        setMessages([]);
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
        .then((res) => setMessages(res))
        .catch((error) => {
          console.error("Error fetching messages:", error);
          setMessages(null);
        });
    }
  }, [peer_id, timestamp]);

  return { messages, refresh };
};
