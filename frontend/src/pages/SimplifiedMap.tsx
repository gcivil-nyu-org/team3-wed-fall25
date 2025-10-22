import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  IconButton,
  Drawer,
  TextField,
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
  Map as MapIcon,
  BubbleChart,
  FilterList,
  Close,
  Home,
  Warning,
  Info,
  TrendingUp,
} from "@mui/icons-material";
import OptimizedHeatmap from "../components/OptimizedHeatmap";
import HeatmapLegend from "../components/HeatmapLegend";
import { fetchHeatmapData, fetchBoroughSummary, type HeatmapPoint, type BoroughSummary } from "../api/index.js";

// Types
type MapMode = "heat" | "points";
type HeatmapMode = "default" | "risk" | "inequality";
type DatasetToggle = "violations" | "evictions" | "complaints";

interface MapState {
  mode: MapMode;
  heatmapMode: HeatmapMode;
  filters: {
    violations: boolean;
    evictions: boolean;
    complaints: boolean;
    borough: string;
  };
  timeWindows: {
    violationsYears: number;
    evictionsYears: number;
    complaintsYears: number;
  };
  advanced: {
    boroughs: string[];
    riskThreshold: number;
  };
}

// Default state
const DEFAULT_STATE: MapState = {
  mode: "heat",
  heatmapMode: "default",
  filters: {
    violations: true, // Start with violations active
    evictions: false,
    complaints: false,
    borough: "All Boroughs",
  },
  timeWindows: {
    violationsYears: 3,
    evictionsYears: 3,
    complaintsYears: 3,
  },
  advanced: {
    boroughs: [],
    riskThreshold: 0,
  },
};

// Mode Switcher Component
const ModeSwitcher: React.FC<{
  mode: MapMode;
  heatmapMode: HeatmapMode;
  onChange: (mode: MapMode) => void;
  onHeatmapModeChange: (heatmapMode: HeatmapMode) => void;
}> = ({ mode, onChange }) => {
  return (
    <Paper sx={{ 
      display: "flex", 
      borderRadius: 3, 
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(255, 107, 53, 0.1)",
      border: "1px solid rgba(255, 107, 53, 0.1)"
    }}>
      <Button
        variant={mode === "heat" ? "contained" : "text"}
        onClick={() => onChange("heat")}
        sx={{ 
          borderRadius: 0,
          px: 3,
          background: mode === "heat" ? "#FF6B35" : "transparent",
          color: mode === "heat" ? "white" : "#4A5568",
          "&:hover": {
            background: mode === "heat" ? "#E55A2B" : "rgba(255, 107, 53, 0.05)"
          }
        }}
        startIcon={<BubbleChart />}
      >
        Heatmap
      </Button>
      <Button
        variant={mode === "points" ? "contained" : "text"}
        onClick={() => onChange("points")}
        sx={{ 
          borderRadius: 0,
          px: 3,
          background: mode === "points" ? "#FF6B35" : "transparent",
          color: mode === "points" ? "white" : "#4A5568",
          "&:hover": {
            background: mode === "points" ? "#E55A2B" : "rgba(255, 107, 53, 0.05)"
          }
        }}
        startIcon={<MapIcon />}
      >
        Points
      </Button>
    </Paper>
  );
};

// Heatmap Mode Selector Component
const HeatmapModeSelector: React.FC<{
  heatmapMode: HeatmapMode;
  onChange: (heatmapMode: HeatmapMode) => void;
}> = ({ heatmapMode, onChange }) => {
  const modes = [
    { value: "default", label: "Default", icon: <BubbleChart /> },
    { value: "risk", label: "Risk", icon: <Warning /> },
    { value: "inequality", label: "Inequality", icon: <TrendingUp /> },
  ];

  return (
    <Paper sx={{ 
      display: "flex", 
      borderRadius: 3, 
      overflow: "hidden",
      boxShadow: "0 4px 12px rgba(255, 107, 53, 0.1)",
      border: "1px solid rgba(255, 107, 53, 0.1)"
    }}>
      {modes.map(({ value, label, icon }) => (
        <Button
          key={value}
          variant={heatmapMode === value ? "contained" : "text"}
          onClick={() => onChange(value as HeatmapMode)}
          sx={{ 
            borderRadius: 0,
            px: 3,
            background: heatmapMode === value ? "#FF6B35" : "transparent",
            color: heatmapMode === value ? "white" : "#4A5568",
            "&:hover": {
              background: heatmapMode === value ? "#E55A2B" : "rgba(255, 107, 53, 0.05)"
            }
          }}
          startIcon={icon}
        >
          {label}
        </Button>
      ))}
    </Paper>
  );
};

// Filter Bar Component
const FilterBar: React.FC<{
  state: MapState;
  onUpdate: (updates: Partial<MapState>) => void;
  onOpenAdvanced: () => void;
  legendOpen: boolean;
  onToggleLegend: () => void;
}> = ({ state, onUpdate, onOpenAdvanced, legendOpen, onToggleLegend }) => {
  const datasetToggles: { key: DatasetToggle; label: string; icon: React.ReactNode }[] = [
    { key: "violations", label: "Violations", icon: <Warning /> },
    { key: "evictions", label: "Evictions", icon: <Home /> },
    { key: "complaints", label: "Complaints", icon: <Info /> },
  ];

  return (
    <Paper sx={{ 
      p: 3, 
      mb: 3,
      background: "rgba(255,255,255,0.95)",
      backdropFilter: "blur(10px)",
      borderRadius: 4,
      boxShadow: "0 8px 32px rgba(255, 107, 53, 0.1)",
      border: "1px solid rgba(255, 107, 53, 0.1)"
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        {/* Dataset Toggles */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {datasetToggles.map(({ key, label }) => (
            <Chip
              key={key}
              label={label}
              variant={state.filters[key] ? "filled" : "outlined"}
              color={state.filters[key] ? "primary" : "default"}
              onClick={() => onUpdate({
                filters: { ...state.filters, [key]: !state.filters[key] }
              })}
              sx={{ 
                background: state.filters[key] ? "#FF6B35" : "rgba(255,255,255,0.8)",
                color: state.filters[key] ? "white" : "#374151",
                borderColor: state.filters[key] ? "#E55A2B" : "rgba(255, 107, 53, 0.2)",
                fontWeight: 500,
                "&:hover": {
                  background: state.filters[key] ? "#E55A2B" : "rgba(255, 107, 53, 0.1)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(255, 107, 53, 0.2)"
                },
                transition: "all 0.2s ease-in-out"
              }}
            />
          ))}
        </Box>

        {/* Borough Selector */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" sx={{ color: "#6B7280", fontWeight: 500 }}>
            Borough:
          </Typography>
          <Select
            value={state.filters.borough}
            onChange={(e: any) => onUpdate({
              filters: { ...state.filters, borough: e.target.value }
            })}
            size="small"
            sx={{ 
              minWidth: 140,
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255, 107, 53, 0.2)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255, 107, 53, 0.4)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#FF6B35",
              }
            }}
          >
            <MenuItem value="All Boroughs">All Boroughs</MenuItem>
            <MenuItem value="MANHATTAN">Manhattan</MenuItem>
            <MenuItem value="BROOKLYN">Brooklyn</MenuItem>
            <MenuItem value="QUEENS">Queens</MenuItem>
            <MenuItem value="BRONX">Bronx</MenuItem>
            <MenuItem value="STATEN ISLAND">Staten Island</MenuItem>
          </Select>
        </Box>

        {/* Legend Toggle Button */}
        <Button
          variant="outlined"
          startIcon={<Info />}
          onClick={onToggleLegend}
          sx={{ 
            background: legendOpen ? "#FF6B35" : "rgba(255,255,255,0.8)",
            color: legendOpen ? "white" : "#374151",
            borderColor: legendOpen ? "#E55A2B" : "rgba(255, 107, 53, 0.2)",
            fontWeight: 500,
            "&:hover": {
              background: legendOpen ? "#E55A2B" : "rgba(255, 107, 53, 0.1)",
              borderColor: "rgba(255, 107, 53, 0.4)",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(255, 107, 53, 0.2)"
            },
            transition: "all 0.2s ease-in-out"
          }}
        >
          Legend
        </Button>

        {/* Advanced Filters Button */}
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={onOpenAdvanced}
          sx={{ 
            ml: "auto",
            borderColor: "#FF6B35",
            color: "#FF6B35",
            "&:hover": {
              borderColor: "#E55A2B",
              backgroundColor: "rgba(255, 107, 53, 0.05)"
            }
          }}
        >
          Advanced
        </Button>
      </Box>
    </Paper>
  );
};

// Advanced Filters Drawer
const AdvancedFiltersDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  state: MapState;
  onUpdate: (updates: Partial<MapState>) => void;
}> = ({ open, onClose, state, onUpdate }) => {

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1300 }}>
      <Box sx={{ width: 360, p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#2D3748" }}>Advanced Filters</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>

        <Stack spacing={3}>

          {/* Risk Threshold */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: "#374151" }}>
              Risk Threshold: {(state.advanced.riskThreshold * 100).toFixed(0)}%
            </Typography>
            <TextField
              fullWidth
              type="range"
              inputProps={{ min: 0, max: 1, step: 0.1 }}
              value={state.advanced.riskThreshold}
              onChange={(e) => onUpdate({ 
                advanced: { ...state.advanced, riskThreshold: parseFloat(e.target.value) } 
              })}
            />
          </Box>

          {/* Reset All */}
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onUpdate(DEFAULT_STATE)}
            sx={{ mt: 2 }}
          >
            Reset All
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
};

// Stats Panel Component with Hotspots
const StatsPanel: React.FC<{
  heatmapData: HeatmapPoint[];
  boroughSummary: BoroughSummary[];
  activeFilters: { violations: boolean; evictions: boolean; complaints: boolean };
  selectedBorough: string;
}> = ({ heatmapData, activeFilters, selectedBorough }) => {
  const stats = React.useMemo(() => {
    // Filter data by selected borough
    const filteredData = selectedBorough === "All Boroughs" 
      ? heatmapData 
      : heatmapData.filter(point => point.borough === selectedBorough);
    
    const totalBuildings = filteredData.length;
    const totalCount = filteredData.reduce((sum, point) => sum + (point.count || 0), 0);
    const avgIntensity = filteredData.length > 0 
      ? filteredData.reduce((sum, point) => sum + (point.intensity || 0), 0) / filteredData.length
      : 0;
    const highRiskBuildings = filteredData.filter(p => (p.intensity || 0) >= 0.7).length;
    
    // Calculate borough-level hotspots (more general)
    const boroughStats = selectedBorough === "All Boroughs" 
      ? Object.entries(
          heatmapData.reduce((acc, point) => {
            const borough = point.borough;
            if (!acc[borough]) {
              acc[borough] = { count: 0, buildings: 0, avgIntensity: 0 };
            }
            acc[borough].count += point.count || 0;
            acc[borough].buildings += 1;
            acc[borough].avgIntensity += point.intensity || 0;
            return acc;
          }, {} as Record<string, { count: number; buildings: number; avgIntensity: number }>)
        ).map(([borough, stats]) => ({
          borough,
          count: stats.count,
          buildings: stats.buildings,
          avgIntensity: stats.avgIntensity / stats.buildings,
          address: `${borough} Borough`
        })).sort((a, b) => b.count - a.count).slice(0, 3)
      : filteredData
          .filter(p => (p.intensity || 0) >= 0.6)
          .sort((a, b) => (b.count || 0) - (a.count || 0))
          .slice(0, 5);
    
    return {
      totalBuildings,
      totalCount,
      avgIntensity,
      highRiskBuildings,
      hotspots: boroughStats,
    };
  }, [heatmapData, selectedBorough]);

  const getActiveDataType = () => {
    if (activeFilters.violations) return "violations";
    if (activeFilters.evictions) return "evictions";
    if (activeFilters.complaints) return "complaints";
    return "violations";
  };

  const activeDataType = getActiveDataType();

  return (
    <Paper sx={{ 
      p: 3,
      background: "rgba(255,255,255,0.95)",
      backdropFilter: "blur(10px)",
      borderRadius: 4,
      boxShadow: "0 8px 32px rgba(255, 107, 53, 0.1)",
      border: "1px solid rgba(255, 107, 53, 0.1)"
    }}>
      <Typography variant="h6" sx={{ 
        fontWeight: 700, 
        mb: 3, 
        color: "#2D3748",
        textAlign: "center"
      }}>
        Live Statistics
      </Typography>
      
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <Card variant="outlined" sx={{ 
          flex: "1 1 200px", 
          textAlign: "center", 
          p: 1,
          background: "rgba(37, 99, 235, 0.05)",
          border: "1px solid rgba(37, 99, 235, 0.2)",
          borderRadius: 3
        }}>
          <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#2563EB" }}>
              {stats.totalBuildings.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500 }}>
              Buildings
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ 
          flex: "1 1 200px", 
          textAlign: "center", 
          p: 1,
          background: "rgba(220, 38, 38, 0.05)",
          border: "1px solid rgba(220, 38, 38, 0.2)",
          borderRadius: 3
        }}>
          <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#DC2626" }}>
              {stats.totalCount.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500 }}>
              Total {activeDataType}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ 
          flex: "1 1 200px", 
          textAlign: "center", 
          p: 1,
          background: "rgba(245, 158, 11, 0.05)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          borderRadius: 3
        }}>
          <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#F59E0B" }}>
              {(stats.avgIntensity * 100).toFixed(1)}%
            </Typography>
            <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500 }}>
              Avg Risk
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ 
          flex: "1 1 200px", 
          textAlign: "center", 
          p: 1,
          background: "rgba(5, 150, 105, 0.05)",
          border: "1px solid rgba(5, 150, 105, 0.2)",
          borderRadius: 3
        }}>
          <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#059669" }}>
              {stats.highRiskBuildings.toLocaleString()}
            </Typography>
            <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500 }}>
              High Risk
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Hotspots Section */}
      {stats.hotspots.length > 0 && (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600, 
              mb: 2, 
              color: "#2D3748",
              textAlign: "center"
            }}>
              {selectedBorough === "All Boroughs" ? "Top Boroughs" : "Top Hotspots"}
            </Typography>
            
            <Stack spacing={1}>
              {stats.hotspots.map((hotspot, index) => (
                <Card 
                  key={selectedBorough === "All Boroughs" ? hotspot.borough : (hotspot as any).bbl}
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    background: index === 0 ? "rgba(239, 68, 68, 0.05)" : 
                               index === 1 ? "rgba(245, 158, 11, 0.05)" : 
                               "rgba(59, 130, 246, 0.05)",
                    border: index === 0 ? "1px solid rgba(239, 68, 68, 0.2)" : 
                           index === 1 ? "1px solid rgba(245, 158, 11, 0.2)" : 
                           "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: 3,
                    cursor: "pointer",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                    },
                    transition: "all 0.2s ease-in-out"
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#2D3748" }}>
                        {selectedBorough === "All Boroughs" ? `${hotspot.borough} Borough` : hotspot.address}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6B7280" }}>
                        {selectedBorough === "All Boroughs" 
                          ? `${(hotspot as any).buildings} buildings • ${((hotspot as any).avgIntensity * 100).toFixed(1)}% avg risk`
                          : `${hotspot.borough} • BBL: ${(hotspot as any).bbl}`
                        }
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="h6" sx={{ 
                        fontWeight: 700, 
                        color: index === 0 ? "#EF4444" : index === 1 ? "#F59E0B" : "#3B82F6"
                      }}>
                        {hotspot.count}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6B7280" }}>
                        {activeDataType}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Stack>
        </Box>
      )}
    </Paper>
  );
};

// Main Simplified Map Component
const SimplifiedMap: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [state, setState] = useState<MapState>(DEFAULT_STATE);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [boroughSummary, setBoroughSummary] = useState<BoroughSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);

  // Load data efficiently
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Determine which data type to fetch based on active filters
        let dataType = "violations";
        if (state.filters.evictions && !state.filters.violations) dataType = "evictions";
        if (state.filters.complaints && !state.filters.violations && !state.filters.evictions) dataType = "complaints";
        
        // If no filters are active, default to violations
        if (!state.filters.violations && !state.filters.evictions && !state.filters.complaints) {
          dataType = "violations";
        }
        
        console.log("Loading data for:", dataType, "borough:", state.filters.borough);
        
        // Fetch data with NYC bounds
        const [heatmapResponse, boroughResponse] = await Promise.all([
          fetchHeatmapData({
            min_lat: 40.4,  // Full NYC bounds
            max_lat: 41.0,
            min_lng: -74.5,
            max_lng: -73.5,
            data_type: dataType as "violations" | "evictions" | "complaints",
            borough: state.filters.borough !== "All Boroughs" ? state.filters.borough : undefined,
            limit: 50000, // Limit for performance
          }),
          fetchBoroughSummary()
        ]);
        
        // Process data
        const heatmapData = Array.isArray(heatmapResponse?.data) ? heatmapResponse.data : [];
        const boroughData = Array.isArray(boroughResponse?.data) ? boroughResponse.data : [];
        
        // Validate and normalize data
        const validatedHeatmapData = heatmapData.filter(point => {
          if (!point || !point.bbl || !point.borough) return false;
          
          const lat = typeof point.latitude === 'string' ? parseFloat(point.latitude) : point.latitude;
          const lng = typeof point.longitude === 'string' ? parseFloat(point.longitude) : point.longitude;
          const intensity = typeof point.intensity === 'string' ? parseFloat(point.intensity) : point.intensity;
          const count = typeof point.count === 'string' ? parseInt(point.count) : point.count;
          
          return !isNaN(lat) && !isNaN(lng) && !isNaN(intensity) && !isNaN(count) &&
                 lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
        }).map(point => ({
          ...point,
          latitude: typeof point.latitude === 'string' ? parseFloat(point.latitude) : point.latitude,
          longitude: typeof point.longitude === 'string' ? parseFloat(point.longitude) : point.longitude,
          intensity: typeof point.intensity === 'string' ? parseFloat(point.intensity) : point.intensity,
          count: typeof point.count === 'string' ? parseInt(point.count) : point.count,
        }));
        
        setHeatmapData(validatedHeatmapData);
        setBoroughSummary(boroughData);
        
        console.log(`Loaded ${validatedHeatmapData.length} data points`);
      } catch (err) {
        console.error("Failed to load data:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load data: ${errorMessage}`);
        setHeatmapData([]);
        setBoroughSummary([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [state.filters, state.advanced.boroughs]);

  const handleStateUpdate = useCallback((updates: Partial<MapState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <Box sx={{ 
      background: "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)",
      py: 4, 
      px: { xs: 2, sm: 3 }, 
      pt: { xs: 8, sm: 10 },
      pb: 4
    }}>
      <Container maxWidth="xl">
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 700, 
              color: "#2D3748",
              fontFamily: '"Montserrat", "Roboto", sans-serif',
              fontSize: { xs: '2rem', md: '3rem' }
            }}
          >
            Neighborhood Explorer
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 3, 
              color: "#4A5568",
              lineHeight: 1.6,
              fontWeight: 400
            }}
          >
            Visualize housing issues across NYC with our interactive map. 
            Explore violations, evictions, and complaints to make informed decisions.
          </Typography>
          
          {/* Data Type Explanations */}
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            background: "rgba(255,255,255,0.8)",
            borderRadius: 2,
            border: "1px solid rgba(255, 107, 53, 0.1)"
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: "#2D3748" }}>
              Understanding the Data:
            </Typography>
            <Stack spacing={1}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Warning sx={{ color: "#EF4444", fontSize: 16 }} />
                <Typography variant="body2" sx={{ color: "#4A5568" }}>
                  <strong>Violations:</strong> Building code violations and safety issues reported by HPD
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Home sx={{ color: "#F59E0B", fontSize: 16 }} />
                <Typography variant="body2" sx={{ color: "#4A5568" }}>
                  <strong>Evictions:</strong> Court-ordered evictions executed by marshals in the last 3 years
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Info sx={{ color: "#3B82F6", fontSize: 16 }} />
                <Typography variant="body2" sx={{ color: "#4A5568" }}>
                  <strong>Complaints:</strong> 311 complaints about building conditions and maintenance issues
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ 
          height: { xs: "50vh", md: "55vh" }, 
          display: "flex", 
          flexDirection: isMobile ? "column" : "row",
          gap: 3,
          mb: 4
        }}>
          {/* Desktop: Left Sidebar */}
          {!isMobile && (
            <Box sx={{ width: 360, flexShrink: 0, maxHeight: "100%", overflow: "auto" }}>
              <ModeSwitcher 
                mode={state.mode} 
                heatmapMode={state.heatmapMode}
                onChange={(mode) => handleStateUpdate({ mode })} 
                onHeatmapModeChange={(heatmapMode) => handleStateUpdate({ heatmapMode })}
              />
              
              {/* Show heatmap mode selector when in heatmap mode */}
              {state.mode === "heat" && (
                <Box sx={{ mt: 2 }}>
                  <HeatmapModeSelector 
                    heatmapMode={state.heatmapMode}
                    onChange={(heatmapMode) => handleStateUpdate({ heatmapMode })}
                  />
                </Box>
              )}
              
              <FilterBar 
                state={state} 
                onUpdate={handleStateUpdate}
                onOpenAdvanced={() => setAdvancedOpen(true)}
                legendOpen={legendOpen}
                onToggleLegend={() => setLegendOpen(!legendOpen)}
              />
              
              <StatsPanel heatmapData={heatmapData} boroughSummary={boroughSummary} activeFilters={state.filters} selectedBorough={state.filters.borough} />
            </Box>
          )}

          {/* Mobile: Top Bar */}
          {isMobile && (
            <Box sx={{ 
              p: 2, 
              background: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: 4,
              boxShadow: "0 8px 32px rgba(255, 107, 53, 0.1)",
              border: "1px solid rgba(255, 107, 53, 0.1)"
            }}>
              <ModeSwitcher 
                mode={state.mode} 
                heatmapMode={state.heatmapMode}
                onChange={(mode) => handleStateUpdate({ mode })} 
                onHeatmapModeChange={(heatmapMode) => handleStateUpdate({ heatmapMode })}
              />
              
              {/* Show heatmap mode selector when in heatmap mode */}
              {state.mode === "heat" && (
                <Box sx={{ mt: 2 }}>
                  <HeatmapModeSelector 
                    heatmapMode={state.heatmapMode}
                    onChange={(heatmapMode) => handleStateUpdate({ heatmapMode })}
                  />
                </Box>
              )}
              <FilterBar 
                state={state} 
                onUpdate={handleStateUpdate}
                onOpenAdvanced={() => setAdvancedOpen(true)}
                legendOpen={legendOpen}
                onToggleLegend={() => setLegendOpen(!legendOpen)}
              />
            </Box>
          )}

          {/* Map Area */}
          <Box sx={{ flex: 1, position: "relative", borderRadius: 4, overflow: "hidden" }}>
            <OptimizedHeatmap
              data={heatmapData}
              dataType={state.filters.violations ? "violations" : 
                       state.filters.evictions ? "evictions" : "complaints"}
              mode={state.mode}
              heatmapMode={state.heatmapMode}
              riskThreshold={state.advanced.riskThreshold}
            />
            
            {/* Legend */}
            {state.mode === "heat" && (
              <HeatmapLegend
                mode={state.heatmapMode}
                dataType={state.filters.violations ? "violations" : 
                         state.filters.evictions ? "evictions" : "complaints"}
                isOpen={legendOpen}
                onClose={() => setLegendOpen(false)}
                data={heatmapData}
                selectedBorough={state.filters.borough}
              />
            )}
            
            {/* Loading Indicator */}
            {loading && (
              <Paper sx={{ 
                position: "absolute", 
                top: 16, 
                right: 16, 
                p: 2, 
                zIndex: 1000,
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderRadius: 3
              }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Loading data...</Typography>
              </Paper>
            )}
            
            {/* Error Message */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  position: "absolute", 
                  top: 16, 
                  right: 16, 
                  zIndex: 1000,
                  maxWidth: 300,
                  borderRadius: 3
                }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
          </Box>
        </Box>

        {/* Mobile: Stats Panel */}
        {isMobile && (
          <Box sx={{ mt: 3 }}>
            <StatsPanel heatmapData={heatmapData} boroughSummary={boroughSummary} activeFilters={state.filters} selectedBorough={state.filters.borough} />
          </Box>
        )}

        {/* Advanced Filters Drawer */}
        <AdvancedFiltersDrawer
          open={advancedOpen}
          onClose={() => setAdvancedOpen(false)}
          state={state}
          onUpdate={handleStateUpdate}
        />
      </Container>
    </Box>
  );
};

export default SimplifiedMap;
