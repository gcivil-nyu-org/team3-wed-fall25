import { Card, CardContent, Typography, Box, Chip } from "@mui/material";

export interface PropertyCardProps {
  address: string;
  occupancyStatus: string;
  financialPerformance: string;
  tenantTurnover: string;
  violationsCount?: number;
  evictionsCount?: number;
}

export function PropertyCard({ address, occupancyStatus, financialPerformance, tenantTurnover, violationsCount = 0, evictionsCount = 0 }: PropertyCardProps) {
  return (
    <Card sx={{ minWidth: 300, mb: 2 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700}>{address}</Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
          <Chip label={`Occupancy: ${occupancyStatus}`} color={occupancyStatus === "Occupied" ? "success" : "warning"} />
          <Chip label={`Financial: ${financialPerformance}`} color="info" />
          <Chip label={`Turnover: ${tenantTurnover}`} color="default" />
          <Chip label={`Violations: ${violationsCount}`} color={violationsCount > 0 ? "error" : "success"} />
          <Chip label={`Evictions: ${evictionsCount}`} color={evictionsCount > 0 ? "error" : "success"} />
        </Box>
      </CardContent>
    </Card>
  );
}
