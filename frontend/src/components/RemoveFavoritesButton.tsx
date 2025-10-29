import { BookmarkOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { removeFavorite, type CommunityFavorite } from "../api";

const RemoveFavoritesButton = ({
  id,
  onSuccess,
}: {
  id: CommunityFavorite["id"];
  onSuccess(): void;
}) => {
  const handleClick = async () => {
    await removeFavorite(id);

    onSuccess();
  };

  return (
    <IconButton size="small" onClick={handleClick}>
      <BookmarkOutlined color="primary" />
    </IconButton>
  );
};

export default RemoveFavoritesButton;
