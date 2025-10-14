import { Box, Typography, Grid, Paper, Divider } from "@mui/material";
import { PropertyCard } from "../components/landlord/PropertyCard";
import { ComplianceAlert } from "../components/landlord/ComplianceAlert";
import { ReviewList } from "../components/landlord/ReviewList";
import type { Review } from "../components/landlord/ReviewList";
import { ReviewResponseForm } from "../components/landlord/ReviewResponseForm";
import { useState } from "react";

// Example mock data
const properties = [
  {
    address: "123 Main St, Brooklyn, NY",
    occupancyStatus: "Occupied",
    financialPerformance: "Good",
    tenantTurnover: "Low"
  },
  {
    address: "456 Park Ave, Manhattan, NY",
    occupancyStatus: "Vacant",
    financialPerformance: "Average",
    tenantTurnover: "High"
  }
];

const violations = [
  { message: "Open violation: Broken fire escape", resolved: false },
  { message: "Open violation: Missing smoke detectors", resolved: false }
];

const initialReviews: Review[] = [
  { id: "1", author: "Jane D.", content: "Great landlord, quick to fix issues!", date: "2025-09-01" },
  { id: "2", author: "John S.", content: "Had some problems with heating last winter.", date: "2025-08-15" }
];

export default function LandlordDashboard() {
  const [reviews, setReviews] = useState(initialReviews);
  const [respondingTo, setRespondingTo] = useState<string|null>(null);

  const handleRespond = (id: string) => setRespondingTo(id);
  const handleFlag = (id: string) => setReviews(r => r.map(rv => rv.id === id ? { ...rv, flagged: true } : rv));
  const handleSubmitResponse = (response: string) => {
    setRespondingTo(null);
    // backend call to submit response to review
    // temporarily not enabled 
    // serving static data
    alert("Response sent: " + response);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" fontWeight={700} mb={3}>My Properties</Typography>
      <Grid container spacing={2}>
        {properties.map((prop, idx) => (
          <Grid item xs={12} md={6} key={idx}>
            <PropertyCard {...prop} />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" fontWeight={600} mb={2}>Compliance & Violations</Typography>
      {violations.map((v, idx) => (
        <ComplianceAlert key={idx} message={v.message} resolved={v.resolved} />
      ))}

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" fontWeight={600} mb={2}>Tenant Reviews</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <ReviewList reviews={reviews} onRespond={handleRespond} onFlag={handleFlag} />
        {respondingTo && (
          <ReviewResponseForm onSubmit={handleSubmitResponse} />
        )}
      </Paper>
    </Box>
  );
}
