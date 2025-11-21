import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
} from "@mui/material";
import { AdminPanelSettings, Lock } from "@mui/icons-material";
import { COLORS } from "../constants";
import { loginUser } from "../api/auth/authApi";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Use JWT authentication - send username as email (EmailBackend supports both)
      const response = await loginUser({
        email: username, // Send username as email field
        password: password,
      });

      // Store JWT tokens
      if (response.data.access && response.data.refresh) {
        sessionStorage.setItem("access_token", response.data.access);
        sessionStorage.setItem("refresh_token", response.data.refresh);
        sessionStorage.setItem("admin_authenticated", "true");
        sessionStorage.setItem("admin_username", username);

        // Redirect to admin dashboard
        navigate("/admin/dashboard");
      } else {
        setError("Invalid response from server");
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const errorMessage =
        err.response?.data?.error_message ||
        err.response?.data?.non_field_errors?.[0] ||
        err.message ||
        "Invalid username or password";
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)",
        pt: { xs: 10, md: 0 },
      }}
    >
      <Container maxWidth="sm">
        <Paper
          sx={{
            p: 4,
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <AdminPanelSettings
              sx={{
                fontSize: 64,
                color: COLORS.PRIMARY,
                mb: 2,
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Admin Login
            </Typography>
            <Typography variant="body2" sx={{ color: "#4A5568" }}>
              Access the admin dashboard
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              autoFocus
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              startIcon={<Lock />}
              sx={{
                backgroundColor: COLORS.PRIMARY,
                color: "white",
                fontWeight: 600,
                fontSize: "1.1rem",
                py: 1.5,
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
                "&:hover": {
                  backgroundColor: COLORS.PRIMARY_HOVER,
                  boxShadow: "0 6px 16px rgba(255, 107, 53, 0.4)",
                },
                "&:disabled": {
                  backgroundColor: "rgba(255, 107, 53, 0.5)",
                },
              }}
            >
              {loading ? "Logging In..." : "Login"}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

