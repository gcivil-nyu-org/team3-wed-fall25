import { useEffect, useState } from "react";
import { fetchProfile } from "../api";

export const useProfile = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile()
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  return { users, loading, error };
};
