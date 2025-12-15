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
          // behavior: "smooth",
        });
      }
    }, 500);
  }, [timestamp]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)",
        py: 4,
        px: { xs: 2, sm: 3 },
        pt: { xs: 8, sm: 10 },
      }}
    >
      <Container maxWidth="xl">
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: "#2D3748",
            fontFamily: '"Montserrat", "Roboto", sans-serif',
            fontSize: { xs: "2rem", md: "3rem" },
          }}
        >
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
                  onSelect={(peerId) => {
                    setSelectedPeerId(peerId);

                    setTimestamp(Date.now());
                  }}
                />
              </Box>
            </Grid>

            <Grid sx={{ flexGrow: 1 }}>
              {selectedPeerId !== 0 && (
                <>
                  <Box
                    ref={bottomRef}
                    sx={{ maxHeight: 500, overflow: "auto" }}
                  >
                    <MessageList
                      peerId={selectedPeerId}
                      timestamp={timestamp}
                    />
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
    </Box>
  );
};

export default Message;
