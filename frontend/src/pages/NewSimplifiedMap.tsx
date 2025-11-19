import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  Alert,
  CircularProgress,
  Container,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Info,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import TrueHeatmap from "../components/TrueHeatmap";
import { fetchHeatmapData, type HeatmapPoint } from "../api/index.js";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapState {
  filters: {
    violations: boolean;
    evictions: boolean;
    complaints: boolean;
    borough: string;
  };
}

const DEFAULT_STATE: MapState = {
  filters: {
    violations: true,
    evictions: false,
    complaints: false,
    borough: "All Boroughs",
  },
};

// Filter Bar Component
const FilterBar: React.FC<{
  state: MapState;
  onUpdate: (updates: Partial<MapState>) => void;
}> = ({ state, onUpdate }) => {
  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: "#2D3748" }}>
        Data Type
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant={state.filters.violations ? "contained" : "outlined"}
          size="small"
          onClick={() => onUpdate({
            filters: { ...state.filters, violations: true, evictions: false, complaints: false }
          })}
          sx={{
            flex: 1,
            backgroundColor: state.filters.violations ? "#FF6B35" : "transparent",
            color: state.filters.violations ? "white" : "#4A5568",
            borderColor: "#E2E8F0",
            "&:hover": {
              backgroundColor: state.filters.violations ? "#E55A2B" : "#F7FAFC",
            },
          }}
        >
          Violations
        </Button>
        <Button
          variant={state.filters.evictions ? "contained" : "outlined"}
          size="small"
          onClick={() => onUpdate({
            filters: { ...state.filters, violations: false, evictions: true, complaints: false }
          })}
          sx={{
            flex: 1,
            backgroundColor: state.filters.evictions ? "#FF6B35" : "transparent",
            color: state.filters.evictions ? "white" : "#4A5568",
            borderColor: "#E2E8F0",
            "&:hover": {
              backgroundColor: state.filters.evictions ? "#E55A2B" : "#F7FAFC",
            },
          }}
        >
          Evictions
        </Button>
        <Button
          variant={state.filters.complaints ? "contained" : "outlined"}
          size="small"
          onClick={() => onUpdate({
            filters: { ...state.filters, violations: false, evictions: false, complaints: true }
          })}
          sx={{
            flex: 1,
            backgroundColor: state.filters.complaints ? "#FF6B35" : "transparent",
            color: state.filters.complaints ? "white" : "#4A5568",
            borderColor: "#E2E8F0",
            "&:hover": {
              backgroundColor: state.filters.complaints ? "#E55A2B" : "#F7FAFC",
            },
          }}
        >
          Complaints
        </Button>
      </Stack>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "#2D3748" }}>
        Borough
      </Typography>
      <Select
        fullWidth
        size="small"
        value={state.filters.borough}
        onChange={(e) => onUpdate({
          filters: { ...state.filters, borough: e.target.value }
        })}
        sx={{ mb: 2 }}
      >
        <MenuItem value="All Boroughs">All Boroughs</MenuItem>
        <MenuItem value="MANHATTAN">Manhattan</MenuItem>
        <MenuItem value="BROOKLYN">Brooklyn</MenuItem>
        <MenuItem value="QUEENS">Queens</MenuItem>
        <MenuItem value="BRONX">Bronx</MenuItem>
        <MenuItem value="STATEN ISLAND">Staten Island</MenuItem>
      </Select>
    </Paper>
  );
};

// Simple Legend Component
const SimpleLegend: React.FC<{ dataType: string }> = ({ dataType }) => {
  return (
    <Paper
      sx={{
        position: "absolute",
        bottom: 20,
        left: 20,
        width: 240,
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.98)",
        borderRadius: 2,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
        border: "1px solid rgba(255, 107, 53, 0.2)",
        p: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Info sx={{ color: "#FF6B35", fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#2D3748" }}>
          Color Scale
        </Typography>
      </Box>

      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "rgba(59, 82, 139, 0.7)",
              border: "2px solid rgba(59, 82, 139, 1)",
              boxShadow: "0 2px 4px rgba(59, 82, 139, 0.3)",
            }}
          />
          <Typography variant="caption" sx={{ color: "#4A5568", fontSize: "11px" }}>
            Low - Few issues (20%)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "rgba(33, 144, 140, 0.7)",
              border: "2px solid rgba(33, 144, 140, 1)",
              boxShadow: "0 2px 4px rgba(33, 144, 140, 0.3)",
            }}
          />
          <Typography variant="caption" sx={{ color: "#4A5568", fontSize: "11px" }}>
            Medium - Moderate (20%)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "rgba(92, 200, 99, 0.75)",
              border: "2px solid rgba(92, 200, 99, 1)",
              boxShadow: "0 2px 4px rgba(92, 200, 99, 0.3)",
            }}
          />
          <Typography variant="caption" sx={{ color: "#4A5568", fontSize: "11px" }}>
            High - Significant (20%)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "rgba(253, 231, 37, 0.8)",
              border: "2px solid rgba(253, 231, 37, 1)",
              boxShadow: "0 2px 4px rgba(253, 231, 37, 0.3)",
            }}
          />
          <Typography variant="caption" sx={{ color: "#4A5568", fontSize: "11px" }}>
            Very High (20%)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 127, 0, 0.85)",
              border: "2px solid rgba(255, 127, 0, 1)",
              boxShadow: "0 2px 4px rgba(255, 127, 0, 0.4)",
            }}
          />
          <Typography variant="caption" sx={{ color: "#4A5568", fontSize: "11px" }}>
            Critical (20%)
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #E2E8F0" }}>
        <Typography variant="caption" sx={{ color: "#6B7280", fontSize: "10px" }}>
          Showing: <strong>{dataType.toUpperCase()}</strong>
        </Typography>
      </Box>
    </Paper>
  );
};

// Main Component
const NewSimplifiedMap: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const navigate = useNavigate();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<MapState>(DEFAULT_STATE);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data - simple approach: always load all NYC data
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Determine data type
        let dataType = "violations";
        if (state.filters.evictions) dataType = "evictions";
        if (state.filters.complaints) dataType = "complaints";


        // Always use full NYC bounds - simple and works
        const bounds = {
          min_lat: 40.4,
          max_lat: 41.0,
          min_lng: -74.5,
          max_lng: -73.5,
        };

        const heatmapResponse = await fetchHeatmapData({
          ...bounds,
          data_type: dataType as "violations" | "evictions" | "complaints",
          borough: state.filters.borough !== "All Boroughs" ? state.filters.borough : undefined,
          limit: 100000, // Get ALL data - no limit, heatmap handles it efficiently with canvas
        });

        const heatmapData = Array.isArray(heatmapResponse?.data) ? heatmapResponse.data : [];

        // Simple validation
        const validatedData = heatmapData
          .filter(point => {
            if (!point || !point.bbl) return false;
            const lat = typeof point.latitude === 'string' ? parseFloat(point.latitude) : point.latitude;
            const lng = typeof point.longitude === 'string' ? parseFloat(point.longitude) : point.longitude;
            return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
          })
          .map(point => ({
            ...point,
            latitude: typeof point.latitude === 'string' ? parseFloat(point.latitude) : point.latitude,
            longitude: typeof point.longitude === 'string' ? parseFloat(point.longitude) : point.longitude,
            intensity: typeof point.intensity === 'string' ? parseFloat(point.intensity) : point.intensity || 0,
            count: typeof point.count === 'string' ? parseInt(point.count) : point.count || 0,
          }));

        // USE ALL DATA - No sampling, no limits
        // leaflet.heat uses canvas rendering which handles large datasets efficiently
        const finalData = validatedData;
        

        setHeatmapData(finalData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setHeatmapData([]);
      } finally {
        setLoading(false);
      }
    };

    debounceTimerRef.current = setTimeout(loadData, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state.filters]);

  const handleStateUpdate = useCallback((updates: Partial<MapState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleBuildingClick = useCallback((bbl: string) => {
    navigate(`/building/${bbl}`);
  }, [navigate]);

  const dataType = state.filters.violations ? "violations" :
                   state.filters.evictions ? "evictions" : "complaints";

  return (
    <Box sx={{
      background: "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)",
      py: 4,
      minHeight: "100vh",
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#1A202C", mb: 1 }}>
            Neighborhood Explorer
          </Typography>
          <Typography variant="body1" sx={{ color: "#4A5568" }}>
            Explore housing data across New York City with an intuitive heatmap visualization
          </Typography>
        </Box>

        {/* Main Content */}
        <Box sx={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 3,
          mb: 4
        }}>
          {/* Left Sidebar */}
          {!isMobile && (
            <Box sx={{ width: 320, flexShrink: 0 }}>
              <FilterBar state={state} onUpdate={handleStateUpdate} />

              {/* Stats */}
              <Card sx={{ borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "#2D3748" }}>
                    Live Statistics
                  </Typography>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: "#3182CE", mb: 0.5 }}>
                      {heatmapData.length.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#718096" }}>
                      Buildings
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Map Area */}
          <Box sx={{ flex: 1, position: "relative", borderRadius: 4, overflow: "hidden", minHeight: "600px" }}>
            <MapContainer
              center={[40.7128, -74.0060]}
              zoom={11}
              minZoom={10}
              maxZoom={18}
              style={{ height: "100%", width: "100%" }}
              zoomControl={true}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <TrueHeatmap
                data={heatmapData}
                dataType={dataType}
                onBuildingClick={handleBuildingClick}
              />
            </MapContainer>

            {/* Legend */}
            <SimpleLegend dataType={dataType} />

            {/* Loading Indicator */}
            {loading && (
              <Paper sx={{
                position: "absolute",
                top: 20,
                right: 20,
                p: 2,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                zIndex: 1000,
              }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Loading data...</Typography>
              </Paper>
            )}

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ position: "absolute", top: 20, right: 20, zIndex: 1000 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default NewSimplifiedMap;

