import { Box, Button, TextField, Typography, Container, Alert } from "@mui/material";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { loginUser } from "../api/auth";

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setMessage(null);

    try {
      console.log("Attempting login with:", { username, password });
      const response = await loginUser({
        username: username,
        password: password
      });
      
      console.log("Login response:", response);
      console.log("Response data:", response.data);
      
      // Store JWT tokens - handle the custom response format
      const responseData = response.data?.data || response.data;
      const accessToken = responseData?.access || responseData?.access_token || responseData?.token;
      const refreshToken = responseData?.refresh || responseData?.refresh_token;
      
      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        console.log("Login successful, JWT token:", accessToken);
        
        // Redirect to home page after successful login
        setTimeout(() => {
          console.log("Redirecting to home page...");
          navigate('/');
        }, 1500);
      } else {
        console.log("No access token in response:", response.data);
        console.log("Available keys in response:", Object.keys(response.data || {}));
        setMessage({ type: 'error', text: `Login failed: No access token received. Response: ${JSON.stringify(response.data)}` });
      }
      
    } catch (error: any) {
      console.error("Login error:", error);
      console.error("Error response:", error.response);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error_message || error.response?.data?.detail || 'Login failed. Please check your credentials.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main" }}>
              Housing Transparency
            </Typography>
          </Link>
        </Box>

        <Box sx={{ p: 4, border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Typography variant="h4" component="h1" sx={{ textAlign: "center", mb: 3 }}>
            Log In
          </Typography>
          
          {message && (
            <Alert severity={message.type} sx={{ mb: 3 }}>
              {message.text}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
            />

            <Button 
              type="submit" 
              variant="contained" 
              size="large" 
              fullWidth
              disabled={loading}
            >
              {loading ? "Logging In..." : "Log In"}
            </Button>
          </Box>

          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{" "}
              <Link to="/signup" style={{ color: "inherit", textDecoration: "underline" }}>
                Sign up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
