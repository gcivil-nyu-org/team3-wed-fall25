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
        const favoritesArray = Array.isArray(data) ? data : [];
        // Return actual user data only, empty array if no favorites
        setFavorites(favoritesArray);
      })
      .catch((error) => {
        console.error("Error fetching favorites:", error);
        // Return empty array instead of mock data on error
        setFavorites([]);
      });
  }, [timestamp]);

  return { favorites, refresh };
};
