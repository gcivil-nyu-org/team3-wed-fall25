import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks";

export default function TenantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Box
      // sx={{ pt: { xs: 10, md: 12 }, pb: 6 }}
      sx={{
        minHeight: "100vh",
        // background:
        //   "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)",
        py: 4,
        px: { xs: 2, sm: 3 },
        pt: { xs: 8, sm: 10 },
      }}
    >
      <Container maxWidth="xl">
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            color: "#2D3748",
            fontFamily: '"Montserrat", "Roboto", sans-serif',
            fontSize: { xs: "2rem", md: "3rem" },
          }}
        >
          Welcome{user?.first_name ? `, ${user.first_name}` : ""}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            mb: 3,
            color: "#4A5568",
            lineHeight: 1.6,
            fontWeight: 400,
          }}
        >
          Here's a quick start to explore buildings, leave reviews, and manage
          favorites.
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Paper sx={{ p: 3, flex: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Search Buildings
            </Typography>
            <Typography variant="body2" sx={{ color: "#4A5568", mb: 2 }}>
              Find a building by address or BBL to view detailed records.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/search")}>
              Go to Search
            </Button>
          </Paper>

          <Paper sx={{ p: 3, flex: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              My Favorites
            </Typography>
            <Typography variant="body2" sx={{ color: "#4A5568", mb: 2 }}>
              Quickly access buildings you've saved.
            </Typography>
            <Button variant="outlined" onClick={() => navigate("/community")}>
              View Favorites
            </Button>
          </Paper>

          <Paper sx={{ p: 3, flex: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Community Reviews
            </Typography>
            <Typography variant="body2" sx={{ color: "#4A5568", mb: 2 }}>
              Read and write reviews to help the community.
            </Typography>
            <Button variant="outlined" onClick={() => navigate("/community")}>
              Open Community
            </Button>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
