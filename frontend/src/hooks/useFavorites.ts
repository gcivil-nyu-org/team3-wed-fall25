import { useEffect, useState } from "react";
import { fetchFavorites, type CommunityFavorite } from "../api";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Array<CommunityFavorite>>([]);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    fetchFavorites()
      .then((res: any) => {
        // Ensure res is an array - handle wrapped responses
        const data = Array.isArray(res) ? res : (res?.data || []);
        setFavorites(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error("Error fetching favorites:", error);
        // Set to empty array on error to prevent crashes
        setFavorites([]);
      });
  }, [timestamp]);

  return { favorites, refresh };
};
