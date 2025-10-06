import { Box, Button, TextField, Typography, Container, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { Link } from "react-router";
import { useState } from "react";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"tenant" | "landlord">("tenant");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Signup attempt:", { name, email, password, role });
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
          
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Full Name"
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
            >
              Create Account
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
