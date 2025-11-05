import { Box, Typography } from "@mui/material";

import { useFavorites } from "../../hooks/useFavorites";
import { BookmarkBorder } from "@mui/icons-material";
import FavoriteItem from "./FavoriteItem";

const FavoriteList = () => {
  const { favorites } = useFavorites();

  return (
    <Box sx={{ p: 4 }}>
      {favorites.length === 0 ? (
        <Box sx={{ textAlign: "center" }}>
          <BookmarkBorder sx={{ fontSize: 48, color: "#bbb", mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No favorites yet
          </Typography>
        </Box>
      ) : (
        favorites.map((favorite, i) => (
          <FavoriteItem
            key={favorite.bbl}
            favorite={favorite}
            openReviews={i === 0}
          />
        ))
      )}
    </Box>
  );
};

export default FavoriteList;
