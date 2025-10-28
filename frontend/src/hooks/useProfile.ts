// Legacy profile hook - consider using useAuth instead

import { useEffect, useState } from "react";
import { fetchProfile } from "../api";
import type { User } from "../types";

export const useProfile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = sessionStorage.getItem("access_token");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetchProfile();
        const data = (response as any)?.data?.data ?? (response as any)?.data ?? null;
        setUser(data);
      } catch (err) {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
        setUser(null);
        setError(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { user, loading, error };
};
