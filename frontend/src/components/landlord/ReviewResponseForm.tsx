import { Box, Button, TextField } from "@mui/material";
import { useState } from "react";

export interface ReviewResponseFormProps {
  onSubmit: (response: string) => void;
  loading?: boolean;
}

export function ReviewResponseForm({ onSubmit, loading }: ReviewResponseFormProps) {
  const [value, setValue] = useState("");
  return (
    <Box component="form" onSubmit={e => { e.preventDefault(); onSubmit(value); setValue(""); }} sx={{ display: "flex", gap: 2, mt: 2 }}>
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
