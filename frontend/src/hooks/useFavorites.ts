import { useEffect, useState } from "react";
import { fetchFavorites, type CommunityFavorite } from "../api";

// Mock data fallback for development/demo purposes
const mockFavorites: CommunityFavorite[] = [
  {
    id: 1,
    bbl: "1000010001",
    user_id: 1,
    note: "Great building with good maintenance",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    registration: {
      bbl: "1000010001",
      bin: 1000001,
      boro_id: 1,
      boro: "Manhattan",
      block: 1,
      lot: 1,
      house_number: "123",
      street_name: "Main St",
      zip: "10001",
      community_board: 1,
      last_registration_date: "2024-01-01",
      registration_end_date: "2025-01-01",
      registration_id: 1,
      building_id: 1,
    } as any,
  },
  {
    id: 2,
    bbl: "2000020002",
    user_id: 1,
    created_at: "2024-01-10T14:30:00Z",
    updated_at: "2024-01-10T14:30:00Z",
    registration: {
      bbl: "2000020002",
      bin: 2000002,
      boro_id: 2,
      boro: "Brooklyn",
      block: 2,
      lot: 2,
      house_number: "456",
      street_name: "Park Ave",
      zip: "11201",
      community_board: 2,
      last_registration_date: "2024-01-01",
      registration_end_date: "2025-01-01",
      registration_id: 2,
      building_id: 2,
    } as any,
  },
];

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
        // Show mock data if no real data available
        setFavorites(favoritesArray.length > 0 ? favoritesArray : mockFavorites);
      })
      .catch((error) => {
        console.warn("Error fetching favorites, using mock data:", error);
        // Fallback to mock data on error
        setFavorites(mockFavorites);
      });
  }, [timestamp]);

  return { favorites, refresh };
};
