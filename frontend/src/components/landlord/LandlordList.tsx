import { List, ListItem, Typography, Paper } from "@mui/material";
import type { BuildingData } from "../../types";
import { useLandlords, useProfile } from "../../hooks";
import UserLabel from "../UserLabel";

interface Comment {
  id: string;
  user_id: number;
  body: string;
  created_at: string;
}

export interface Review {
  id: string;
  author: string;
  content: string;
  title?: string;
  rating?: number;
  date: string;
  bbl?: string;
  flagged?: boolean;
  comments: Comment[]; // Add comments to Review interface
}

export interface LandlordListProps {
  bbl: BuildingData["bbl"];
}

export function LandlordList({ bbl }: LandlordListProps) {
  const { user } = useProfile();
  const { landlords } = useLandlords(bbl);

  if (!landlords.length) return <Typography>No bbl.</Typography>;
  return (
    <Paper
      sx={{
        p: 3,
        flex: 1,
        borderRadius: 3,
        boxShadow: "0 4px 16px rgba(255, 107, 53, 0.08)",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(255, 107, 53, 0.1)",
      }}
    >
      <List>
        {landlords.map(({ email, username, user_id }) => (
          <ListItem>
            <UserLabel
              userId={user_id}
              username={username}
              enableActions={user?.id !== user_id}
            />
            <Typography variant="caption">( email: {email} )</Typography>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
