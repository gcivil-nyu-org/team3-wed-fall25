import { Box, Button, TextField, Typography, Container, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Alert, Paper } from "@mui/material";
import { Link } from "react-router";
import { useState } from "react";
import { registerUser } from "../api/auth";
import BusinessIcon from "@mui/icons-material/Business";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"tenant" | "landlord">("tenant");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await registerUser({
        username: name,
        email: email,
        password: password
      });
      
      setMessage({ type: 'success', text: 'Account created successfully! You can now sign in.' });
      console.log("Registration successful:", response.data);
      console.log("Full response:", response);
      
      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      
    } catch (error: any) {
      console.error("Registration error:", error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error_message || 'Registration failed. Please try again.' 
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
            Join Our Community
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
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

            <FormControl component="fieldset">
              <FormLabel 
                component="legend" 
                sx={{ 
                  color: "#2D3748",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  mb: 1
                }}
              >
                I am a
              </FormLabel>
              <RadioGroup
                value={role}
                onChange={(e) => setRole(e.target.value as "tenant" | "landlord")}
                row
                sx={{ gap: 2 }}
              >
                <FormControlLabel 
                  value="tenant" 
                  control={
                    <Radio 
                      sx={{
                        color: "#FF6B35",
                        "&.Mui-checked": {
                          color: "#FF6B35",
                        },
                      }}
                    />
                  } 
                  label="Tenant" 
                  sx={{
                    "& .MuiFormControlLabel-label": {
                      color: "#4A5568",
                      fontSize: "0.9rem",
                    }
                  }}
                />
                <FormControlLabel 
                  value="landlord" 
                  control={
                    <Radio 
                      sx={{
                        color: "#FF6B35",
                        "&.Mui-checked": {
                          color: "#FF6B35",
                        },
                      }}
                    />
                  } 
                  label="Landlord" 
                  sx={{
                    "& .MuiFormControlLabel-label": {
                      color: "#4A5568",
                      fontSize: "0.9rem",
                    }
                  }}
                />
              </RadioGroup>
            </FormControl>

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
              {loading ? "Creating Account..." : "Create Account"}
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
              Already have an account?{" "}
              <Link 
                to="/signin" 
                style={{ 
                  color: "#FF6B35", 
                  textDecoration: "none", 
                  fontWeight: 600
                }}
              >
                Log in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
