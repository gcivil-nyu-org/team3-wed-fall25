import { BookmarkBorderOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { addFavorite, type BuildingData } from "../api";

const AddFavoritesButton = ({
  bbl,
  onSuccess,
}: {
  bbl: BuildingData["bbl"];
  onSuccess(): void;
}) => {
  const handleClick = async () => {
    await addFavorite(bbl);

    onSuccess();
  };

  return (
    <IconButton size="small" onClick={handleClick}>
      <BookmarkBorderOutlined />
    </IconButton>
  );
};

export default AddFavoritesButton;
