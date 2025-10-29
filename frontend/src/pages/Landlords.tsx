import { Box, Container, Typography, Paper, Stack, TextField, MenuItem } from "@mui/material";
import { useState } from "react";
import { useAuth } from "../hooks";

export default function LandlordsPage() {
  const { user } = useAuth();
  const [area, setArea] = useState("");
  const [propertyType, setPropertyType] = useState("");

  const isLoggedIn = Boolean(user);

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 10, md: 12 }, pb: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>Landlords</Typography>
      <Typography variant="body1" sx={{ color: "#4A5568", mb: 3 }}>
        Browse registered landlords and tenant experiences. Use filters to refine by area and property type.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            label="Area (ZIP or Neighborhood)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g., 11201 or Upper West Side"
            fullWidth
          />
          <TextField
            label="Property Type"
            select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="rent_stabilized">Rent Stabilized</MenuItem>
            <MenuItem value="condo">Condo</MenuItem>
            <MenuItem value="co_op">Co-op</MenuItem>
            <MenuItem value="multi_family">Multi-family</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          {isLoggedIn
            ? "No data available yet"
            : "Please sign in to view landlord details"}
        </Typography>
        {isLoggedIn && (
          <Typography variant="body2" color="text.secondary">
            When a landlord registers, key information will appear here for tenants to verify, such as
            organization name, HPD registration number, contact phone, and property type.
          </Typography>
        )}
      </Paper>
    </Container>
  );
}


