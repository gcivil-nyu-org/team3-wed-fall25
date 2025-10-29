import { useEffect, useState } from "react";
import { fetchFavorites, type CommunityFavorite } from "../api";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Array<CommunityFavorite>>([]);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    fetchFavorites().then((res) => setFavorites(res));
  }, [timestamp]);

  return { favorites, refresh };
};
