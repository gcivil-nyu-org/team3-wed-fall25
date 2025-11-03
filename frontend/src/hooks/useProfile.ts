import { useEffect, useState } from "react";
import { fetchProfile } from "../api";

export const useProfile = () => {
  const [user, setUser] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setLoading(false);
          return;
        }

        const profile = await fetchProfile();
        setUser(profile);
      } catch (err) {
        // If profile fetch fails, clear the token and user state
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
