import { List, ListItem, ListItemText, Typography, Button, Box } from "@mui/material";

export interface Review {
  id: string;
  author: string;
  content: string;
  date: string;
  flagged?: boolean;
}

export interface ReviewListProps {
  reviews: Review[];
  onRespond?: (id: string) => void;
  onFlag?: (id: string) => void;
}

export function ReviewList({ reviews, onRespond, onFlag }: ReviewListProps) {
  if (!reviews.length) return <Typography>No reviews yet.</Typography>;
  return (
    <List>
      {reviews.map((review) => (
        <ListItem key={review.id} alignItems="flex-start" sx={{ borderBottom: "1px solid #eee" }}>
          <ListItemText
            primary={<Box sx={{ fontWeight: 600 }}>{review.author} <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>({review.date})</span></Box>}
            secondary={review.content}
          />
          {onRespond && (
            <Button size="small" onClick={() => onRespond(review.id)} sx={{ mr: 1 }}>Respond</Button>
          )}
          {onFlag && (
            <Button size="small" color={review.flagged ? "secondary" : "warning"} onClick={() => onFlag(review.id)}>
              {review.flagged ? "Flagged" : "Flag"}
            </Button>
          )}
        </ListItem>
      ))}
    </List>
  );
}
