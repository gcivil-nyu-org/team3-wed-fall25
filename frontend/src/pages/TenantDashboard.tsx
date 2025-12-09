import { Box, Container, Typography, Button, Paper, Stack, CircularProgress } from "@mui/material";
import { useNavigate, Navigate } from "react-router";
import { useAuth } from "../hooks";
import { useEffect } from "react";

export default function TenantDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect landlords to their dashboard
  useEffect(() => {
    if (!loading && user && user.role === "landlord") {
      navigate("/landlord/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect unauthenticated users
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Redirect landlords (handled by useEffect, but also here as fallback)
  if (user.role === "landlord") {
    return <Navigate to="/landlord/dashboard" replace />;
  }

  return (
    <Box sx={{ pt: { xs: 10, md: 12 }, pb: 6 }}>
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Welcome{user?.first_name ? `, ${user.first_name}` : ""}
        </Typography>
        <Typography variant="body1" sx={{ color: "#4A5568", mb: 4 }}>
          Here's a quick start to explore buildings, leave reviews, and manage favorites.
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Paper sx={{ p: 3, flex: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Search Buildings</Typography>
            <Typography variant="body2" sx={{ color: "#4A5568", mb: 2 }}>
              Find a building by address or BBL to view detailed records.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/search')}>Go to Search</Button>
          </Paper>

          <Paper sx={{ p: 3, flex: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>My Favorites</Typography>
            <Typography variant="body2" sx={{ color: "#4A5568", mb: 2 }}>
              Quickly access buildings you've saved.
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/community')}>View Favorites</Button>
          </Paper>

          <Paper sx={{ p: 3, flex: 1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Community Reviews</Typography>
            <Typography variant="body2" sx={{ color: "#4A5568", mb: 2 }}>
              Read and write reviews to help the community.
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/community')}>Open Community</Button>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}


