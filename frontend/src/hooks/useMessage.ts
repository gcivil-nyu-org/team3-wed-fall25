import { useEffect, useState } from "react";
import {
  fetchInboxs,
  type CommunityInbox,
} from "../api";
import {
  fetchInboxMessages,
  type CommunityMessageThread,
} from "../api/community";

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
        // Return actual user data only, empty array if no conversations
        setMessages(validMessages);
      })
      .catch((error) => {
        console.error("Error fetching inboxs:", error);
        // Return empty array instead of mock data
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
        .then((res) => {
          // Return actual messages or empty thread
          if (res && res.messages && res.messages.length > 0) {
            setMessages(res);
          } else {
            // Return empty thread structure if no messages
            setMessages({
              peer: res?.peer || { id: peer_id },
              messages: [],
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching messages:", error);
          // Return empty thread structure on error
          setMessages({
            peer: { id: peer_id },
            messages: [],
          });
        });
    }
  }, [peer_id, timestamp]);

  return { messages, refresh };
};
