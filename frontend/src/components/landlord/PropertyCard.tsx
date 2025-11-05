// src/components/landlord/PropertyCard.tsx
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
} from "@mui/material";
import { Visibility } from "@mui/icons-material";
import { useNavigate } from "react-router";

export interface PropertyCardProps {
  id: string;
  bbl: string;
  address: string;
  occupancy_status: string | null;
  financial_performance: string | null;
  tenant_turnover: string | null;
  violations_count?: number;
  evictions_count?: number;
}

export function PropertyCard({
  id,
  bbl,
  address,
  occupancy_status,
  financial_performance,
  tenant_turnover,
  violations_count = 0,
  evictions_count = 0,
}: PropertyCardProps) {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/landlord/building/${bbl}`); 
  };
  // console.log("PropertyCard render:", { id, bbl, address, evictions_count, violations_count });
  // Format the data for display
  const occupancyDisplay = occupancy_status || "Unknown";
  const financialDisplay = financial_performance || "Unknown";
  const turnoverDisplay = tenant_turnover || "Unknown";

  return (
    <Card sx={{ minWidth: 300, mb: 2, height: "100%" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {address}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          BBL: {bbl}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Chip
            label={`Occupancy: ${occupancyDisplay}`}
            color={occupancyDisplay === "Occupied" ? "success" : "warning"}
            size="small"
          />
          <Chip
            label={`Financial: ${financialDisplay}`}
            color="info"
            size="small"
          />
          <Chip
            label={`Turnover: ${turnoverDisplay}`}
            color="default"
            size="small"
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Chip
            label={`Violations: ${violations_count}`}
            color={violations_count > 0 ? "error" : "success"}
            size="small"
            variant={violations_count > 0 ? "filled" : "outlined"}
          />
          <Chip
            label={`Evictions: ${evictions_count}`}
            color={evictions_count > 0 ? "error" : "success"}
            size="small"
            variant={evictions_count > 0 ? "filled" : "outlined"}
          />
        </Box>

        <Button
          startIcon={<Visibility />}
          variant="outlined"
          onClick={handleViewDetails}
          fullWidth
        >
          View Building Details
        </Button>
      </CardContent>
    </Card>
  );
}
