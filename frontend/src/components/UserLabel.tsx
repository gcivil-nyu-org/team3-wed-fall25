import { PersonOutline } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";

const UserLabel = ({ username }: { username: string }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
      }}
    >
      <PersonOutline color="action" sx={{ fontSize: 16 }} />
      <Typography variant="caption" color="text.secondary">
        {username}
      </Typography>
    </Box>
  );
};

export default UserLabel;
