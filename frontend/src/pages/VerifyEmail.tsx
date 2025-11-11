import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Box, Button, Typography, Alert, CircularProgress } from "@mui/material";
import { AuthLayout } from "../components/auth";
import { useAuth } from "../hooks";
import { COLORS } from "../constants";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmailToken } = useAuth();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const result = await verifyEmailToken({ token });
        
        if (result.success) {
          setStatus('success');
          setMessage(result.message || 'Email verified successfully!');
          
          // Redirect to sign-in after 3 seconds
          setTimeout(() => {
            navigate('/signin');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Email verification failed.');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.message || 'Email verification failed.');
      }
    };

    verifyEmail();
  }, [token, verifyEmailToken, navigate]);

  const handleResendEmail = () => {
    navigate('/signin', { state: { showResendOption: true } });
  };

  const handleGoToSignIn = () => {
    navigate('/signin');
  };

  return (
    <AuthLayout title="Email Verification">
      <Box sx={{ textAlign: 'center', py: 4 }}>
        {status === 'verifying' && (
          <>
            <CircularProgress 
              size={60} 
              sx={{ color: COLORS.PRIMARY, mb: 3 }} 
            />
            <Typography variant="h6" sx={{ color: '#4A5568', mb: 2 }}>
              Verifying your email...
            </Typography>
            <Typography variant="body2" sx={{ color: '#718096' }}>
              Please wait while we verify your email address.
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                "& .MuiAlert-message": {
                  fontSize: "0.9rem"
                }
              }}
            >
              {message}
            </Alert>
            <Typography variant="body2" sx={{ color: '#718096', mb: 3 }}>
              Redirecting you to the sign-in page...
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleGoToSignIn}
              sx={{
                backgroundColor: COLORS.PRIMARY,
                color: "white",
                fontWeight: 600,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                "&:hover": {
                  backgroundColor: COLORS.PRIMARY_HOVER,
                },
              }}
            >
              Go to Sign In
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                borderRadius: 2,
                "& .MuiAlert-message": {
                  fontSize: "0.9rem"
                }
              }}
            >
              {message}
            </Alert>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button 
                variant="outlined" 
                onClick={handleResendEmail}
                sx={{
                  borderColor: COLORS.PRIMARY,
                  color: COLORS.PRIMARY,
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  "&:hover": {
                    borderColor: COLORS.PRIMARY_HOVER,
                    backgroundColor: "rgba(255, 107, 53, 0.04)",
                  },
                }}
              >
                Resend Email
              </Button>
              <Button 
                variant="contained" 
                onClick={handleGoToSignIn}
                sx={{
                  backgroundColor: COLORS.PRIMARY,
                  color: "white",
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                  "&:hover": {
                    backgroundColor: COLORS.PRIMARY_HOVER,
                  },
                }}
              >
                Go to Sign In
              </Button>
            </Box>
          </>
        )}
      </Box>
    </AuthLayout>
  );
}
