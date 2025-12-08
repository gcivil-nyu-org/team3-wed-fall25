import { List, ListItem, ListItemText, Typography, Button, Box, Paper } from "@mui/material";

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
        <ListItem key={review.id} alignItems="flex-start" sx={{ borderBottom: "1px solid #eee", flexDirection: "column", alignItems: "flex-start" }}>
          {/* Review Content */}
          <Box sx={{ width: '100%', mb: 1 }}>
            <ListItemText
              primary={
                <Box sx={{ fontWeight: 600 }}>
                  {review.author} 
                  <span style={{ fontWeight: 400, color: '#888', fontSize: 12, marginLeft: 8 }}>
                    ({review.date})
                  </span>
                </Box>
              }
              secondary={review.content}
            />
            <Box sx={{ mt: 1 }}>
              {onRespond && (
                <Button 
                  size="small" 
                  onClick={() => onRespond(review.id)} 
                  sx={{ mr: 1 }}
                  // disabled={review.comments.length > 0} // Disable if already responded
                >
                  {review.comments ? "Respond" : "Respond"}
                </Button>
              )}
              {onFlag && (
                <Button 
                  size="small" 
                  color={review.flagged ? "secondary" : "warning"} 
                  onClick={() => onFlag(review.id)}
                >
                  {review.flagged ? "Flagged" : "Flag"}
                </Button>
              )}
            </Box>
          </Box>

          {/* Comments/Responses */}
          {review.comments.length > 0 && (
            <Box sx={{ width: '100%', pl: 2, borderLeft: '3px solid', borderColor: 'primary.main', mt: 1 }}>
              {review.comments.map((comment) => (
                <Paper 
                  key={comment.id} 
                  sx={{ 
                    p: 1.5, 
                    mb: 1, 
                    backgroundColor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'grey.200'
                  }}
                >
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {comment.body}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Response on {comment.created_at}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </ListItem>
      ))}
    </List>
  );
}
