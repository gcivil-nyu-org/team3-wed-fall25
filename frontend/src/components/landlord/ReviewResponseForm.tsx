import { Box, Button, TextField } from "@mui/material";
import { useState } from "react";

export interface ReviewResponseFormProps {
  onSubmit: (response: string, reviewId: string) => void;
  reviewId: string; // reviewId as a prop
  loading?: boolean;
}

export function ReviewResponseForm({ onSubmit, reviewId, loading }: ReviewResponseFormProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (value.trim()) {
      onSubmit(value, reviewId); 
      setValue("");
    }
  };
  
  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", gap: 2, mt: 2 }}>
      <TextField
        label="Your Response"
        value={value}
        onChange={e => setValue(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        disabled={loading}
      />
      <Button type="submit" variant="contained" disabled={loading || !value.trim()}>
        {loading ? "Sending..." : "Send"}
      </Button>
    </Box>
  );
}