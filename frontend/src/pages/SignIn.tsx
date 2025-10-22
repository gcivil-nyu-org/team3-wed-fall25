import { Box, Button, TextField, Typography, Container, Alert, Paper } from "@mui/material";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { loginUser } from "../api/auth";
import BusinessIcon from "@mui/icons-material/Business";

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
    <Box 
      sx={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        p: 4,
        background: "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)"
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
              <BusinessIcon sx={{ fontSize: 32, color: "#FF6B35" }} />
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: "#2D3748",
                  fontFamily: '"Montserrat", "Roboto", sans-serif'
                }}
              >
                Housing Transparency
              </Typography>
            </Box>
          </Link>
        </Box>

        <Paper 
          sx={{ 
            p: 4, 
            borderRadius: 4,
            boxShadow: "0 16px 48px rgba(255, 107, 53, 0.1)",
            border: "1px solid rgba(255, 107, 53, 0.1)",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)"
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              textAlign: "center", 
              mb: 3,
              fontWeight: 700,
              color: "#2D3748",
              fontFamily: '"Montserrat", "Roboto", sans-serif'
            }}
          >
            Welcome Back
          </Typography>
          
          {message && (
            <Alert 
              severity={message.type} 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                "& .MuiAlert-message": {
                  fontSize: "0.9rem"
                }
              }}
            >
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
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: "rgba(255, 107, 53, 0.2)",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(255, 107, 53, 0.4)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#FF6B35",
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#FF6B35",
                },
              }}
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  "& fieldset": {
                    borderColor: "rgba(255, 107, 53, 0.2)",
                  },
                  "&:hover fieldset": {
                    borderColor: "rgba(255, 107, 53, 0.4)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#FF6B35",
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#FF6B35",
                },
              }}
            />

            <Button 
              type="submit" 
              variant="contained" 
              size="large" 
              fullWidth
              disabled={loading}
              sx={{
                backgroundColor: "#FF6B35",
                color: "white",
                fontWeight: 600,
                fontSize: "1.1rem",
                py: 1.5,
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
                "&:hover": {
                  backgroundColor: "#E55A2B",
                  boxShadow: "0 6px 16px rgba(255, 107, 53, 0.4)",
                },
                "&:disabled": {
                  backgroundColor: "rgba(255, 107, 53, 0.5)",
                },
              }}
            >
              {loading ? "Logging In..." : "Log In"}
            </Button>
          </Box>

          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: "#4A5568",
                fontSize: "0.9rem"
              }}
            >
              Don't have an account?{" "}
              <Link 
                to="/signup" 
                style={{ 
                  color: "#FF6B35", 
                  textDecoration: "none", 
                  fontWeight: 600
                }}
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
