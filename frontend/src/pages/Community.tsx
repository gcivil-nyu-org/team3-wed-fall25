import React from "react";
import { Box, Container, Typography, Paper, Tabs, Tab } from "@mui/material";
import {
  Bookmark,
  BookmarkBorder,
  Star,
  StarBorder,
} from "@mui/icons-material";
import { useProfile } from "../hooks/useProfile";
import FavoriteList from "../components/Favorite/FavoriteList";
import MyReviewList from "../components/Reviews/MyReviewList";

const Community: React.FC = () => {
  const { user } = useProfile();
  const [tab, setTab] = React.useState(0);

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
          Community Hub
        </Typography>
        <Typography
          variant="h6"
          sx={{
            mb: 3,
            color: "#4A5568",
            lineHeight: 1.6,
            fontWeight: 400,
          }}
        >
          Save buildings, write reviews, and connect with others.
        </Typography>

        <Paper>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Bookmark sx={{ fontSize: 14 }} />
                    My Favorites
                  </Box>
                }
              />
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Star sx={{ fontSize: 14 }} />
                    My Reviews
                  </Box>
                }
              />
            </Tabs>
          </Box>

          {/* Favorites */}
          {tab === 0 && (
            <Box>
              {user ? (
                <FavoriteList />
              ) : (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <BookmarkBorder sx={{ fontSize: 48, color: "#bbb", mb: 1 }} />
                  <Typography variant="h6" color="text.secondary">
                    Please sign in to view favorites
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Reviews */}
          {tab === 1 && (
            <Box>
              {user ? (
                <Box sx={{ p: 4 }}>
                  <MyReviewList />
                </Box>
              ) : (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <StarBorder sx={{ fontSize: 48, color: "#bbb", mb: 1 }} />
                  <Typography variant="h6" color="text.secondary">
                    Please log in to view reviews.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Community;
