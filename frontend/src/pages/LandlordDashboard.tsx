import { Box, Typography, Grid, Paper, Divider, CircularProgress, Alert } from "@mui/material";
import { PropertyCard } from "../components/landlord/PropertyCard";
import { ComplianceAlert } from "../components/landlord/ComplianceAlert";
import { ReviewList } from "../components/landlord/ReviewList";
import type { Review } from "../components/landlord/ReviewList";
import { ReviewResponseForm } from "../components/landlord/ReviewResponseForm";
import { useState, useEffect } from "react";
import * as landlordApi from "../api/landlord";

// Example mock data
// Fallback mock data used if API is unreachable
const mockProperties = [
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

const mockViolations = [
  { message: "Open violation: Broken fire escape", resolved: false },
  { message: "Open violation: Missing smoke detectors", resolved: false }
];

const mockReviews: Review[] = [
  { id: "1", author: "Jane D.", content: "Great landlord, quick to fix issues!", date: "2025-09-01" },
  { id: "2", author: "John S.", content: "Had some problems with heating last winter.", date: "2025-08-15" }
];

export default function LandlordDashboard() {
  const [properties, setProperties] = useState<any[] | null>(null);
  const [violations, setViolations] = useState<any[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Replace with actual landlordId - for now use demo id
        const landlordId = "101";
        const [propsResp, violsResp, revsResp] = await Promise.all([
          landlordApi.fetchProperties(landlordId),
          landlordApi.fetchViolations(landlordId),
          landlordApi.fetchReviews(landlordId),
        ]);
        if (!mounted) return;
        setProperties(propsResp.map(p => ({
          address: p.address,
          occupancyStatus: p.occupancy_status,
          financialPerformance: p.financial_performance,
          tenantTurnover: p.tenant_turnover,
          violationsCount: p.violations_count ?? 0,
          evictionsCount: p.evictions_count ?? 0,
        })));
        setViolations(violsResp.map(v => ({ message: v.message, resolved: v.resolved })));
        setReviews(revsResp.map(r => ({ id: r.id, author: r.author, content: r.content, date: r.date, flagged: r.flagged })));
      } catch (e) {
        console.warn("Landlord API unavailable, falling back to mock data", e);
        if (!mounted) return;
        setProperties(mockProperties as any);
        setViolations(mockViolations as any);
        setReviews(mockReviews as any);
        setError("Unable to load live landlord data; using mock data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleRespond = (id: string) => setRespondingTo(id);
  const handleFlag = (id: string) => setReviews(r => r ? r.map(rv => rv.id === id ? { ...rv, flagged: true } : rv) : r);
  const handleSubmitResponse = (response: string) => {
    setRespondingTo(null);
    // Should send to Postgres API here
    // TODO: implement API call
    alert("Response sent: " + response);
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography variant="h4" fontWeight={700} mb={3}>My Properties</Typography>
      <Grid container spacing={2}>
        {(properties || []).map((prop, idx) => (
          // cast props to any to avoid stringent Grid typing in this project setup
          <Grid {...({ item: true, xs: 12, md: 6, key: idx } as any)}>
            <PropertyCard {...prop} />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" fontWeight={600} mb={2}>Compliance & Violations</Typography>
      {(violations || []).map((v, idx) => (
        <ComplianceAlert key={idx} message={v.message} resolved={v.resolved} />
      ))}

      <Divider sx={{ my: 4 }} />

      <Typography variant="h5" fontWeight={600} mb={2}>Tenant Reviews</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <ReviewList reviews={reviews || []} onRespond={handleRespond} onFlag={handleFlag} />
        {respondingTo && (
          <ReviewResponseForm onSubmit={handleSubmitResponse} />
        )}
      </Paper>
    </Box>
  );
}
