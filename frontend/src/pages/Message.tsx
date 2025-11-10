import React, { useEffect, useRef, useState } from "react";
import { Box, Container, Typography, Paper, Grid } from "@mui/material";
import { ReceiverList, MessageList } from "../components/Message";
import MessageForm from "../components/Message/MessageForm";
import type { CommunityInbox } from "../api";

const Message: React.FC = () => {
  const [selectedPeerId, setSelectedPeerId] =
    useState<CommunityInbox["peer"]["id"]>(0);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => {
      const el = bottomRef.current;
      if (el) {
        el.scrollTo({
          top: el.scrollHeight + 500,
          behavior: "smooth",
        });
      }
    }, 1000);
  }, [timestamp]);

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 10, md: 12 }, pb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Message
      </Typography>
      {/* <Typography variant="body1" sx={{ color: "#4A5568", mb: 3 }}>
        Save buildings, write reviews, and connect with others.
      </Typography> */}

      <Paper>
        <Grid container spacing={2} gap={4}>
          <Grid size={4}>
            <Box>
              <ReceiverList
                selectedPeerId={selectedPeerId}
                timestamp={timestamp}
                onSelect={(peerId) => setSelectedPeerId(peerId)}
              />
            </Box>
          </Grid>

          <Grid sx={{ flexGrow: 1 }}>
            {selectedPeerId !== 0 && (
              <>
                <Box ref={bottomRef} sx={{ maxHeight: 500, overflow: "auto" }}>
                  <MessageList peerId={selectedPeerId} timestamp={timestamp} />
                </Box>

                <Box>
                  <MessageForm
                    peerId={selectedPeerId}
                    onSuccess={() => {
                      setTimestamp(Date.now());
                    }}
                  />
                </Box>
              </>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default Message;
