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
    <Container maxWidth="lg" sx={{ pt: { xs: 10, md: 12 }, pb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
        Community Hub
      </Typography>
      <Typography variant="body1" sx={{ color: "#4A5568", mb: 3 }}>
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
  );
};

export default Community;
