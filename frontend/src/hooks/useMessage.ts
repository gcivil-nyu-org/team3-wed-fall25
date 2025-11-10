import { useEffect, useState } from "react";
import {
  fetchInboxs,
  fetchInboxMessages,
  type CommunityInbox,
  type CommunityMessageThread,
} from "../api";

export const useInboxs = () => {
  const [messages, setMessages] = useState<Array<CommunityInbox>>([]);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    fetchInboxs().then((res) => setMessages(res));
  }, [timestamp]);

  return { messages, refresh };
};

export const useMessages = (peer_id: CommunityInbox["peer"]["id"]) => {
  const [messages, setMessages] = useState<CommunityMessageThread>();
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    fetchInboxMessages(peer_id).then((res) => setMessages(res));
  }, [peer_id, timestamp]);

  return { messages, refresh };
};
