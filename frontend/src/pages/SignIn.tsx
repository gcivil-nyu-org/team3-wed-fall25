import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Box, Button, Typography, Alert } from "@mui/material";
import { AuthLayout, FormField } from "../components/auth";
import { useAuth } from "../hooks";
import { COLORS } from "../constants";
import type { LoginCredentials } from "../types";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showResendOption, setShowResendOption] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, logout } = useAuth();

  useEffect(() => {
    // Clear any existing sessions when coming to sign in page
    logout();
  }, []);

  useEffect(() => {
    // Check if we should show resend option (from email verification failure)
    if (location.state?.showResendOption) {
      setShowResendOption(true);
      setMessage({
        type: 'error',
        text: 'Please verify your email before signing in. Check your inbox for a verification link.'
      });
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setMessage(null);

    try {
      const credentials: LoginCredentials = {
        email: email,
        password: password
      };
      
      const result = await login(credentials);
      
      if (result.success) {
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        
        // Wait a bit for user state to be updated, then redirect based on role
        setTimeout(async () => {
          // Use the auth hook's user state which should be updated by now
          // Or fetch profile to ensure we have the latest user data
          try {
            const { fetchProfile } = await import('../api');
            const profileResponse = await fetchProfile();
            const userData = profileResponse.data?.data || profileResponse.data;
            
            if (userData?.role === 'landlord') {
              navigate('/landlord/dashboard', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          } catch (err) {
            // Fallback: use result.user if available, otherwise default to dashboard
            const userData = result.user;
            if (userData?.role === 'landlord') {
              navigate('/landlord/dashboard', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }
        }, 500);
      } else {
        // Check if it's an email verification error
        if (result.authError?.detail?.includes('email') || result.error?.includes('verify')) {
          setShowResendOption(true);
          setMessage({ 
            type: 'error', 
            text: 'Please verify your email before signing in. Check your inbox for a verification link.' 
          });
        } else {
          setMessage({ 
            type: 'error', 
            text: result.error || 'Login failed. Please check your credentials.' 
          });
        }
      }
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Login failed. Please try again.' 
      });
    }
  };

  const handleResendVerification = () => {
    navigate('/signup', { 
      state: { 
        showResendMessage: true,
        email: email
      } 
    });
  };

  return (
    <AuthLayout title="Welcome Back">
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
        <FormField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <FormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {showResendOption && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="body2" sx={{ color: '#4A5568', mb: 2 }}>
              Didn't receive the verification email?
            </Typography>
            <Button 
              variant="outlined" 
              onClick={handleResendVerification}
              sx={{
                borderColor: COLORS.PRIMARY,
                color: COLORS.PRIMARY,
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 2,
                "&:hover": {
                  borderColor: COLORS.PRIMARY_HOVER,
                  backgroundColor: "rgba(255, 107, 53, 0.04)",
                },
              }}
            >
              Resend Verification Email
            </Button>
          </Box>
        )}

        <Button 
          type="submit" 
          variant="contained" 
          size="large" 
          fullWidth
          disabled={loading}
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
              color: COLORS.PRIMARY, 
              textDecoration: "none", 
              fontWeight: 600
            }}
          >
            Sign up
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  );
}