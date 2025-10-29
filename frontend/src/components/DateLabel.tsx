import { HistoryToggleOffOutlined } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";

const DateLabel = ({ date }: { date: string }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
      }}
    >
      <HistoryToggleOffOutlined color="action" sx={{ fontSize: 16 }} />
      <Typography variant="caption" color="text.secondary">
        {new Date(date).toLocaleDateString()}
      </Typography>
    </Box>
  );
};

export default DateLabel;
