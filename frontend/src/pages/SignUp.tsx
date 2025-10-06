import { Box, Button, TextField, Typography, Container, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Alert } from "@mui/material";
import { Link } from "react-router";
import { useState } from "react";
import { registerUser } from "../api/auth";

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
            Create Account
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />

            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
            />

            <FormControl component="fieldset">
              <FormLabel component="legend">I am a</FormLabel>
              <RadioGroup
                value={role}
                onChange={(e) => setRole(e.target.value as "tenant" | "landlord")}
                row
              >
                <FormControlLabel 
                  value="tenant" 
                  control={<Radio />} 
                  label="Tenant" 
                />
                <FormControlLabel 
                  value="landlord" 
                  control={<Radio />} 
                  label="Landlord" 
                />
              </RadioGroup>
            </FormControl>

            <Button 
              type="submit" 
              variant="contained" 
              size="large" 
              fullWidth
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </Box>

          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{" "}
              <Link to="/signin" style={{ color: "inherit", textDecoration: "underline" }}>
                Log in
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
