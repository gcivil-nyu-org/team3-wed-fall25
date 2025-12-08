import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Drawer,
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
  Slider,
} from "@mui/material";
import {
  Map as MapIcon,
  BubbleChart,
  FilterList,
  Close,
  Home,
  Warning,
  Info,
  Palette,
} from "@mui/icons-material";
import { useNavigate } from "react-router";
import { MapContainer, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/leaflet-overrides.css";
import TrueHeatmap from "../components/TrueHeatmap";
import PointsLayer from "../components/PointsLayer";
import { fetchHeatmapData, fetchBoroughSummary, fetchFilteredViolations, type HeatmapPoint, type BoroughSummary } from "../api/index.js";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Types
type MapMode = "heat" | "points";
type DatasetToggle = "violations" | "evictions" | "complaints";

interface MapState {
  mode: MapMode;
  filters: {
    dataType: DatasetToggle; // Only one can be selected
    borough: string;
  };
  timeWindows: {
    violationsYears: number;
    evictionsYears: number;
    complaintsYears: number;
  };
  advanced: {
    // Heatmap filters
    countThreshold: number; // Minimum count to show (1-50)
    timeRange: "all" | "6months" | "1year" | "3years"; // Time range filter
    
    // Points filters
    minViolations: number;
    maxViolations: number;
    minComplaints: number;
    maxComplaints: number;
    minEvictions: number;
    maxEvictions: number;
    rentStabilizedOnly: boolean; // Show only rent stabilized buildings
    affordableHousingOnly: boolean; // Show only affordable housing buildings
    // Violation-specific filters (only for violations data type in points mode)
    minOpenViolations: number;
    maxOpenViolations: number;
    minClosedViolations: number;
    maxClosedViolations: number;
    minClassA: number;
    maxClassA: number;
    minClassB: number;
    maxClassB: number;
    minClassC: number;
    maxClassC: number;
  };
}

// Default state
const DEFAULT_STATE: MapState = {
  mode: "heat",
  filters: {
    dataType: "violations", // Start with violations
    borough: "All Boroughs",
  },
  timeWindows: {
    violationsYears: 3,
    evictionsYears: 3,
    complaintsYears: 3,
  },
  advanced: {
    // Heatmap filters
    countThreshold: 1, // Minimum count (default: show all)
    timeRange: "all", // Default: all time
    
    // Points filters
    minViolations: 0,
    maxViolations: 2000,
    minComplaints: 0,
    maxComplaints: 2000,
    minEvictions: 0,
    maxEvictions: 2000,
    rentStabilizedOnly: false,
    affordableHousingOnly: false,
    // Violation-specific filters
    minOpenViolations: 0,
    maxOpenViolations: 2000,
    minClosedViolations: 0,
    maxClosedViolations: 2000,
    minClassA: 0,
    maxClassA: 2000,
    minClassB: 0,
    maxClassB: 2000,
    minClassC: 0,
    maxClassC: 2000,
  },
};

// Mode Switcher Component
const ModeSwitcher: React.FC<{
  mode: MapMode;
  onChange: (mode: MapMode) => void;
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


// Filter Bar Component
const FilterBar: React.FC<{
  state: MapState;
  onUpdate: (updates: Partial<MapState>) => void;
  onOpenAdvanced: () => void;
  legendOpen: boolean;
  onToggleLegend: () => void;
}> = ({ state, onUpdate, onOpenAdvanced, legendOpen, onToggleLegend }) => {
  const datasetOptions: { key: DatasetToggle; label: string; icon: React.ReactNode }[] = [
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
        {/* Data Type Selection - Exclusive (Radio buttons) */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {datasetOptions.map(({ key, label, icon }) => (
            <Button
              key={key}
              variant={state.filters.dataType === key ? "contained" : "outlined"}
              onClick={() => onUpdate({
                filters: { ...state.filters, dataType: key }
              })}
              startIcon={icon}
              sx={{ 
                background: state.filters.dataType === key ? "#FF6B35" : "rgba(255,255,255,0.8)",
                color: state.filters.dataType === key ? "white" : "#374151",
                borderColor: state.filters.dataType === key ? "#E55A2B" : "rgba(255, 107, 53, 0.2)",
                fontWeight: 500,
                "&:hover": {
                  background: state.filters.dataType === key ? "#E55A2B" : "rgba(255, 107, 53, 0.1)",
                  borderColor: state.filters.dataType === key ? "#E55A2B" : "rgba(255, 107, 53, 0.4)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(255, 107, 53, 0.2)"
                },
                transition: "all 0.2s ease-in-out"
              }}
            >
              {label}
            </Button>
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

        {/* Legend Toggle Button - Only show for heatmap mode */}
        {state.mode === "heat" && (
        <Button
          variant="outlined"
            startIcon={<Palette />}
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
        )}

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
          {state.mode === "heat" ? (
            <>
              {/* HEATMAP FILTERS */}
          <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
                  Count Threshold
            </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: "#6B7280", fontSize: "12px" }}>
                  Show buildings with ≥ {state.advanced.countThreshold} {state.filters.dataType}
                </Typography>
                <Box sx={{ px: 1 }}>
                  <input
              type="range"
                    min="1"
                    max="50"
                    value={state.advanced.countThreshold}
              onChange={(e) => onUpdate({ 
                      advanced: { ...state.advanced, countThreshold: parseInt(e.target.value) }
                    })}
                    style={{
                      width: "100%",
                      accentColor: "#FF6B35",
                    }}
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: "#9CA3AF", fontSize: "10px" }}>1</Typography>
                    <Typography variant="caption" sx={{ color: "#9CA3AF", fontSize: "10px" }}>50</Typography>
                  </Box>
                </Box>
              </Box>
            </>
          ) : (
            <>
              {/* POINTS FILTERS */}
              {/* Filter Buttons at Top */}
              <Box sx={{ mb: 3 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#374151" }}>
                      Rent Stabilized Only
                    </Typography>
                    <Button
                      variant={state.advanced.rentStabilizedOnly ? "contained" : "outlined"}
                      onClick={() => onUpdate({
                        advanced: { ...state.advanced, rentStabilizedOnly: !state.advanced.rentStabilizedOnly }
                      })}
                      size="small"
                      sx={{
                        minWidth: 80,
                        backgroundColor: state.advanced.rentStabilizedOnly ? "#FF6B35" : "transparent",
                        color: state.advanced.rentStabilizedOnly ? "white" : "#FF6B35",
                        borderColor: "#FF6B35",
                        "&:hover": {
                          backgroundColor: state.advanced.rentStabilizedOnly ? "#E55A2B" : "rgba(255, 107, 53, 0.1)",
                        }
                      }}
                    >
                      {state.advanced.rentStabilizedOnly ? "ON" : "OFF"}
                    </Button>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#374151" }}>
                      Affordable Housing Only
                    </Typography>
                    <Button
                      variant={state.advanced.affordableHousingOnly ? "contained" : "outlined"}
                      onClick={() => onUpdate({
                        advanced: { ...state.advanced, affordableHousingOnly: !state.advanced.affordableHousingOnly }
              })}
                      size="small"
                      sx={{
                        minWidth: 80,
                        backgroundColor: state.advanced.affordableHousingOnly ? "#FF6B35" : "transparent",
                        color: state.advanced.affordableHousingOnly ? "white" : "#FF6B35",
                        borderColor: "#FF6B35",
                        "&:hover": {
                          backgroundColor: state.advanced.affordableHousingOnly ? "#E55A2B" : "rgba(255, 107, 53, 0.1)",
                        }
                      }}
                    >
                      {state.advanced.affordableHousingOnly ? "ON" : "OFF"}
                    </Button>
                  </Box>
                </Stack>
          </Box>

              {/* Range Sliders */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
                  Violations Range
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, color: "#6B7280", fontSize: "12px" }}>
                  {state.advanced.minViolations} - {state.advanced.maxViolations} violations
                </Typography>
                <Slider
                  value={[state.advanced.minViolations, state.advanced.maxViolations]}
                  onChange={(_, newValue) => {
                    const [min, max] = newValue as number[];
                    onUpdate({ advanced: { ...state.advanced, minViolations: min, maxViolations: max } });
                  }}
                  min={0}
                  max={2000}
                  valueLabelDisplay="auto"
                  sx={{
                    color: "#FF6B35",
                    "& .MuiSlider-thumb": {
                      backgroundColor: "#FF6B35",
                    },
                    "& .MuiSlider-track": {
                      backgroundColor: "#FF6B35",
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
                  Complaints Range
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, color: "#6B7280", fontSize: "12px" }}>
                  {state.advanced.minComplaints} - {state.advanced.maxComplaints} complaints
                </Typography>
                <Slider
                  value={[state.advanced.minComplaints, state.advanced.maxComplaints]}
                  onChange={(_, newValue) => {
                    const [min, max] = newValue as number[];
                    onUpdate({ advanced: { ...state.advanced, minComplaints: min, maxComplaints: max } });
                  }}
                  min={0}
                  max={2000}
                  valueLabelDisplay="auto"
                  sx={{
                    color: "#FF6B35",
                    "& .MuiSlider-thumb": {
                      backgroundColor: "#FF6B35",
                    },
                    "& .MuiSlider-track": {
                      backgroundColor: "#FF6B35",
                    },
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
                  Evictions Range
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, color: "#6B7280", fontSize: "12px" }}>
                  {state.advanced.minEvictions} - {state.advanced.maxEvictions} evictions
                </Typography>
                <Slider
                  value={[state.advanced.minEvictions, state.advanced.maxEvictions]}
                  onChange={(_, newValue) => {
                    const [min, max] = newValue as number[];
                    onUpdate({ advanced: { ...state.advanced, minEvictions: min, maxEvictions: max } });
                  }}
                  min={0}
                  max={2000}
                  valueLabelDisplay="auto"
                  sx={{
                    color: "#FF6B35",
                    "& .MuiSlider-thumb": {
                      backgroundColor: "#FF6B35",
                    },
                    "& .MuiSlider-track": {
                      backgroundColor: "#FF6B35",
                    },
                  }}
                />
              </Box>

              {/* Violation-specific filters (only show when violations data type is selected) */}
              {state.filters.dataType === "violations" && (
                <>
                  <Box sx={{ mb: 3, mt: 3, pt: 3, borderTop: "1px solid #E5E7EB" }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, color: "#2D3748" }}>
                      Violation Status Filters
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
                        Open Violations Range
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: "#6B7280", fontSize: "12px" }}>
                        {state.advanced.minOpenViolations} - {state.advanced.maxOpenViolations} open violations
                      </Typography>
                      <Slider
                        value={[state.advanced.minOpenViolations, state.advanced.maxOpenViolations]}
                        onChange={(_, newValue) => {
                          const [min, max] = newValue as number[];
                          onUpdate({ advanced: { ...state.advanced, minOpenViolations: min, maxOpenViolations: max } });
                        }}
                        min={0}
                        max={2000}
                        valueLabelDisplay="auto"
                        sx={{
                          color: "#FF6B35",
                          "& .MuiSlider-thumb": {
                            backgroundColor: "#FF6B35",
                          },
                          "& .MuiSlider-track": {
                            backgroundColor: "#FF6B35",
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
                        Closed Violations Range
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: "#6B7280", fontSize: "12px" }}>
                        {state.advanced.minClosedViolations} - {state.advanced.maxClosedViolations} closed violations
                      </Typography>
                      <Slider
                        value={[state.advanced.minClosedViolations, state.advanced.maxClosedViolations]}
                        onChange={(_, newValue) => {
                          const [min, max] = newValue as number[];
                          onUpdate({ advanced: { ...state.advanced, minClosedViolations: min, maxClosedViolations: max } });
                        }}
                        min={0}
                        max={2000}
                        valueLabelDisplay="auto"
                        sx={{
                          color: "#FF6B35",
                          "& .MuiSlider-thumb": {
                            backgroundColor: "#FF6B35",
                          },
                          "& .MuiSlider-track": {
                            backgroundColor: "#FF6B35",
                          },
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mb: 3, pt: 3, borderTop: "1px solid #E5E7EB" }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700, color: "#2D3748" }}>
                      Violation Class Filters
                    </Typography>
                    
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
                        Class A Violations Range
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: "#6B7280", fontSize: "12px" }}>
                        {state.advanced.minClassA} - {state.advanced.maxClassA} class A violations
                      </Typography>
                      <Slider
                        value={[state.advanced.minClassA, state.advanced.maxClassA]}
                        onChange={(_, newValue) => {
                          const [min, max] = newValue as number[];
                          onUpdate({ advanced: { ...state.advanced, minClassA: min, maxClassA: max } });
                        }}
                        min={0}
                        max={2000}
                        valueLabelDisplay="auto"
                        sx={{
                          color: "#FF6B35",
                          "& .MuiSlider-thumb": {
                            backgroundColor: "#FF6B35",
                          },
                          "& .MuiSlider-track": {
                            backgroundColor: "#FF6B35",
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
                        Class B Violations Range
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: "#6B7280", fontSize: "12px" }}>
                        {state.advanced.minClassB} - {state.advanced.maxClassB} class B violations
                      </Typography>
                      <Slider
                        value={[state.advanced.minClassB, state.advanced.maxClassB]}
                        onChange={(_, newValue) => {
                          const [min, max] = newValue as number[];
                          onUpdate({ advanced: { ...state.advanced, minClassB: min, maxClassB: max } });
                        }}
                        min={0}
                        max={2000}
                        valueLabelDisplay="auto"
                        sx={{
                          color: "#FF6B35",
                          "& .MuiSlider-thumb": {
                            backgroundColor: "#FF6B35",
                          },
                          "& .MuiSlider-track": {
                            backgroundColor: "#FF6B35",
                          },
                        }}
                      />
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#374151" }}>
                        Class C Violations Range
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1, color: "#6B7280", fontSize: "12px" }}>
                        {state.advanced.minClassC} - {state.advanced.maxClassC} class C violations
                      </Typography>
                      <Slider
                        value={[state.advanced.minClassC, state.advanced.maxClassC]}
                        onChange={(_, newValue) => {
                          const [min, max] = newValue as number[];
                          onUpdate({ advanced: { ...state.advanced, minClassC: min, maxClassC: max } });
                        }}
                        min={0}
                        max={2000}
                        valueLabelDisplay="auto"
                        sx={{
                          color: "#FF6B35",
                          "& .MuiSlider-thumb": {
                            backgroundColor: "#FF6B35",
                          },
                          "& .MuiSlider-track": {
                            backgroundColor: "#FF6B35",
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </>
              )}
            </>
          )}

          {/* Reset All */}
          <Button
            variant="outlined"
            fullWidth
            onClick={() => onUpdate(DEFAULT_STATE)}
            sx={{ 
              mt: 2,
              borderColor: "#FF6B35",
              color: "#FF6B35",
              "&:hover": {
                borderColor: "#E55A2B",
                backgroundColor: "rgba(255, 107, 53, 0.05)",
              }
            }}
          >
            Reset All Filters
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
  const navigate = useNavigate();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [state, setState] = useState<MapState>(DEFAULT_STATE);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [boroughSummary, setBoroughSummary] = useState<BoroughSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);
  const [rentStabilizedBBLs, setRentStabilizedBBLs] = useState<Set<string>>(new Set());
  const [affordableHousingBBLs, setAffordableHousingBBLs] = useState<Set<string>>(new Set());

  // Load data efficiently with debouncing and viewport-based fetching
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use selected data type
        const dataType = state.filters.dataType;
        
        // Always use full NYC bounds - same logic as new map
        // Static heatmap works best with all data
        const bounds = {
          min_lat: 40.4,
            max_lat: 41.0,
            min_lng: -74.5,
            max_lng: -73.5,
        };
        
        // Get ALL data points - no limit for heatmap
        // Backend will return all available data
        const limit = 1000000; // Very high limit to get all data
        
        // Check if we should use filtered violations endpoint
        // Use it when in points mode, violations data type, and any violation-specific filters are active
        const useFilteredViolations = state.mode === "points" && 
          dataType === "violations" && (
            state.advanced.minOpenViolations > 0 || 
            state.advanced.maxOpenViolations < 2000 ||
            state.advanced.minClosedViolations > 0 || 
            state.advanced.maxClosedViolations < 2000 ||
            state.advanced.minClassA > 0 || 
            state.advanced.maxClassA < 2000 ||
            state.advanced.minClassB > 0 || 
            state.advanced.maxClassB < 2000 ||
            state.advanced.minClassC > 0 || 
            state.advanced.maxClassC < 2000
          );
        
        const [heatmapResponse, boroughResponse] = await Promise.all([
          useFilteredViolations
            ? fetchFilteredViolations({
                min_lat: bounds.min_lat,
                max_lat: bounds.max_lat,
                min_lng: bounds.min_lng,
                max_lng: bounds.max_lng,
            borough: state.filters.borough !== "All Boroughs" ? state.filters.borough : undefined,
                limit: limit,
                // Only send filters if they're not at default values
                min_open_violations: state.advanced.minOpenViolations > 0 ? state.advanced.minOpenViolations : undefined,
                max_open_violations: state.advanced.maxOpenViolations < 2000 ? state.advanced.maxOpenViolations : undefined,
                min_closed_violations: state.advanced.minClosedViolations > 0 ? state.advanced.minClosedViolations : undefined,
                max_closed_violations: state.advanced.maxClosedViolations < 2000 ? state.advanced.maxClosedViolations : undefined,
                min_class_a: state.advanced.minClassA > 0 ? state.advanced.minClassA : undefined,
                max_class_a: state.advanced.maxClassA < 2000 ? state.advanced.maxClassA : undefined,
                min_class_b: state.advanced.minClassB > 0 ? state.advanced.minClassB : undefined,
                max_class_b: state.advanced.maxClassB < 2000 ? state.advanced.maxClassB : undefined,
                min_class_c: state.advanced.minClassC > 0 ? state.advanced.minClassC : undefined,
                max_class_c: state.advanced.maxClassC < 2000 ? state.advanced.maxClassC : undefined,
              })
            : fetchHeatmapData({
                min_lat: bounds.min_lat,
                max_lat: bounds.max_lat,
                min_lng: bounds.min_lng,
                max_lng: bounds.max_lng,
                data_type: dataType,
                borough: state.filters.borough !== "All Boroughs" ? state.filters.borough : undefined,
                limit: limit,
                time_range: undefined,  // Time range removed from heatmap for now
          }),
          fetchBoroughSummary()
        ]);
        
        // Process data
        const heatmapData = Array.isArray(heatmapResponse?.data) ? heatmapResponse.data : [];
        const boroughData = Array.isArray(boroughResponse?.data) ? boroughResponse.data : [];
        
        // Simple validation - same as new map
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
        
        // Apply advanced filters
        let filteredData = validatedData;
        
        // HEATMAP FILTERS: Apply count threshold
        if (state.mode === "heat" && state.advanced.countThreshold > 1) {
          filteredData = validatedData.filter(point => (point.count || 0) >= state.advanced.countThreshold);
        }
        
        // POINTS FILTERS: Apply min/max ranges and rent stabilized
        if (state.mode === "points") {
          // If we used filtered violations endpoint, the backend already applied violation-specific filters
          // We still need to apply the general violations range filter if it's not at default
          if (state.filters.dataType === "violations" && useFilteredViolations) {
            // Data already filtered by backend for open/closed/class filters
            // Only apply general violations range if it's not at default
            if (state.advanced.minViolations > 0 || state.advanced.maxViolations < 2000) {
              const maxCountInData = Math.max(...validatedData.map(p => p.count || 0), 0);
              const effectiveMax = Math.max(state.advanced.maxViolations, maxCountInData);
              filteredData = validatedData.filter(point => {
                const count = point.count || 0;
                const matches = count >= state.advanced.minViolations && count <= effectiveMax;
                return matches;
              });
            } else {
              // Data already filtered by backend, just use as-is
              filteredData = validatedData;
            }
          } else if (state.filters.dataType === "violations") {
            // Not using filtered violations endpoint, apply general range filter
            const maxCountInData = Math.max(...validatedData.map(p => p.count || 0), 0);
            const effectiveMax = Math.max(state.advanced.maxViolations, maxCountInData);
            filteredData = validatedData.filter(point => {
              const count = point.count || 0;
              const matches = count >= state.advanced.minViolations && count <= effectiveMax;
              return matches;
            });
          } else if (state.filters.dataType === "complaints") {
            const maxCountInData = Math.max(...validatedData.map(p => p.count || 0), 0);
            const effectiveMax = Math.max(state.advanced.maxComplaints, maxCountInData);
            filteredData = validatedData.filter(point => {
              const count = point.count || 0;
              const matches = count >= state.advanced.minComplaints && count <= effectiveMax;
              return matches;
            });
          } else if (state.filters.dataType === "evictions") {
            const maxCountInData = Math.max(...validatedData.map(p => p.count || 0), 0);
            const effectiveMax = Math.max(state.advanced.maxEvictions, maxCountInData);
            filteredData = validatedData.filter(point => {
              const count = point.count || 0;
              const matches = count >= state.advanced.minEvictions && count <= effectiveMax;
              return matches;
            });
          }
          
          // Apply building type filters (rent stabilized and/or affordable housing)
          // If both are enabled, show buildings that match BOTH (intersection)
          // If only one is enabled, show buildings that match that one
          if (state.advanced.rentStabilizedOnly || state.advanced.affordableHousingOnly) {
            if (state.advanced.rentStabilizedOnly && state.advanced.affordableHousingOnly) {
              // Both enabled: show buildings that are BOTH rent stabilized AND affordable housing
              if (rentStabilizedBBLs.size > 0 && affordableHousingBBLs.size > 0) {
                filteredData = filteredData.filter(point => {
                  const pointBbl = String(point.bbl || '');
                  return rentStabilizedBBLs.has(pointBbl) && affordableHousingBBLs.has(pointBbl);
                });
              } else {
                filteredData = [];
              }
            } else if (state.advanced.rentStabilizedOnly) {
              // Only rent stabilized enabled
              if (rentStabilizedBBLs.size > 0) {
                filteredData = filteredData.filter(point => {
                  const pointBbl = String(point.bbl || '');
                  return rentStabilizedBBLs.has(pointBbl);
                });
              } else {
                filteredData = [];
              }
            } else if (state.advanced.affordableHousingOnly) {
              // Only affordable housing enabled
              if (affordableHousingBBLs.size > 0) {
                filteredData = filteredData.filter(point => {
                  const pointBbl = String(point.bbl || '');
                  return affordableHousingBBLs.has(pointBbl);
                });
              } else {
                filteredData = [];
              }
            }
          }
        }
        
        setHeatmapData(filteredData);
        setBoroughSummary(boroughData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load data: ${errorMessage}`);
        setHeatmapData([]);
        setBoroughSummary([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce data loading to avoid excessive API calls
    debounceTimerRef.current = setTimeout(loadData, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state.filters, state.advanced, state.mode]); // Re-fetch when filters or advanced options change

  // Fetch rent stabilized and affordable housing BBLs for points mode filtering
  // Fetch when in points mode (so it's ready when user toggles the filter)
  useEffect(() => {
    const fetchFilterBBLs = async () => {
      if (state.mode === "points") {
        try {
          // Fetch rent stabilized buildings
          const rentStabilizedResponse = await fetch('/api/neighborhood/rent-stabilized-bbls/');
          const rentStabilizedData = await rentStabilizedResponse.json();
                if (rentStabilizedData.result && Array.isArray(rentStabilizedData.data)) {
                  const bbls = new Set<string>(rentStabilizedData.data.map((bbl: any) => String(bbl)));
                  setRentStabilizedBBLs(bbls);
                } else {
                  setRentStabilizedBBLs(new Set());
                }
                
                // Fetch affordable housing buildings
                const affordableResponse = await fetch('/api/neighborhood/affordable-housing-bbls/');
                const affordableData = await affordableResponse.json();
                if (affordableData.result && Array.isArray(affordableData.data)) {
                  const bbls = new Set<string>(affordableData.data.map((bbl: any) => String(bbl)));
                  setAffordableHousingBBLs(bbls);
                } else {
                  setAffordableHousingBBLs(new Set());
                }
              } catch (err) {
          setRentStabilizedBBLs(new Set());
          setAffordableHousingBBLs(new Set());
        }
      } else {
        // Clear BBLs when not in points mode
        setRentStabilizedBBLs(new Set());
        setAffordableHousingBBLs(new Set());
      }
    };

    fetchFilterBBLs();
  }, [state.mode]);

  const handleStateUpdate = useCallback((updates: Partial<MapState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);


  const handleBuildingClick = useCallback((bbl: string) => {
    navigate(`/building/${bbl}`);
  }, [navigate]);

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
                onChange={(mode) => handleStateUpdate({ mode })} 
              />
              
              <FilterBar 
                state={state} 
                onUpdate={handleStateUpdate}
                onOpenAdvanced={() => setAdvancedOpen(true)}
                legendOpen={legendOpen}
                onToggleLegend={() => setLegendOpen(!legendOpen)}
              />
              
              <StatsPanel 
                heatmapData={heatmapData} 
                boroughSummary={boroughSummary} 
                activeFilters={{ 
                  violations: state.filters.dataType === "violations",
                  evictions: state.filters.dataType === "evictions",
                  complaints: state.filters.dataType === "complaints"
                }} 
                selectedBorough={state.filters.borough} 
              />
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
                onChange={(mode) => handleStateUpdate({ mode })} 
              />
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
            <MapContainer
              center={[40.7128, -74.0060]} // NYC coordinates
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
              {state.mode === "heat" ? (
                <TrueHeatmap
              data={heatmapData}
                  dataType={state.filters.dataType}
                  onBuildingClick={handleBuildingClick}
                />
              ) : (
                <PointsLayer
                  data={heatmapData}
                  dataType={state.filters.dataType}
                  onBuildingClick={handleBuildingClick}
                  minViolations={state.advanced.minViolations}
                  maxViolations={state.advanced.maxViolations}
                  minComplaints={state.advanced.minComplaints}
                  maxComplaints={state.advanced.maxComplaints}
                  minEvictions={state.advanced.minEvictions}
                  maxEvictions={state.advanced.maxEvictions}
                  rentStabilizedOnly={state.advanced.rentStabilizedOnly}
                  rentStabilizedBBLs={rentStabilizedBBLs}
            />
              )}
            </MapContainer>
            
            {/* Simple Legend - Only show for heatmap mode */}
            {state.mode === "heat" && (
              <Paper
                sx={{
                  position: "absolute",
                  bottom: 20,
                  left: 20,
                  width: 200,
                  zIndex: 1000,
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(5px)",
                  borderRadius: 2,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  p: 2,
                  display: legendOpen ? "block" : "none",
                }}
              >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Palette sx={{ color: "#6B7280", fontSize: 18 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#2D3748" }}>
                    Color Scale
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setLegendOpen(false)}>
                  <Close fontSize="small" />
                </IconButton>
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
                    Low - Few issues
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
                    Medium - Moderate
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
                    High - Significant
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
                    Very High
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 152, 0, 0.85)",
                      border: "2px solid rgba(255, 152, 0, 1)",
                      boxShadow: "0 2px 4px rgba(255, 152, 0, 0.4)",
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "#4A5568", fontSize: "11px" }}>
                    Critical
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #E2E8F0" }}>
                <Typography variant="caption" sx={{ color: "#6B7280", fontSize: "10px" }}>
                  Showing: <strong>{state.filters.dataType.toUpperCase()}</strong>
                </Typography>
              </Box>
            </Paper>
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
            <StatsPanel 
              heatmapData={heatmapData} 
              boroughSummary={boroughSummary} 
              activeFilters={{
                violations: state.filters.dataType === "violations",
                evictions: state.filters.dataType === "evictions",
                complaints: state.filters.dataType === "complaints"
              }} 
              selectedBorough={state.filters.borough} 
            />
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
