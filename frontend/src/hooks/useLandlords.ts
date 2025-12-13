import { useEffect, useState } from "react";
import { fetchLandlords, type LandlordDTO } from "../api/landlord";
import type { BuildingData } from "../types";

export const useLandlords = (bbl: BuildingData["bbl"]) => {
  const [landlords, setLandlords] = useState<Array<LandlordDTO>>([]);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  const refresh = () => setTimestamp(Date.now());

  useEffect(() => {
    fetchLandlords(bbl)
      .then((res) => {
        // Filter out any invalid entries
        // const validMessages = Array.isArray(res)
        //   ? res.filter((inbox) => inbox && inbox.peer && inbox.peer.id)
        //   : [];
        // // Return actual user data only, empty array if no conversations
        // setLandlords(validMessages);
        setLandlords(res);
      })
      .catch((error) => {
        console.error("Error fetching inboxs:", error);
        // Return empty array instead of mock data
        setLandlords([]);
      });
  }, [timestamp]);

  return { landlords, refresh };
};
