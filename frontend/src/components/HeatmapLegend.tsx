import React from 'react';
import { Box, Paper, Typography, IconButton, Stack, LinearProgress } from '@mui/material';
import { Close, Info } from '@mui/icons-material';

interface HeatmapLegendProps {
  mode: "default" | "risk" | "inequality";
  dataType: string;
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  selectedBorough: string;
}

const HeatmapLegend: React.FC<HeatmapLegendProps> = ({ mode, dataType, isOpen, onClose, data, selectedBorough }) => {
  if (!isOpen) return null;

  const getLegendData = () => {
    if (mode === "default") {
      return {
        title: "Data Intensity",
        description: "Shows the overall intensity of housing issues in the area",
        colors: [
          { value: "Low", color: "hsl(220, 85%, 55%)", description: "Few issues reported" },
          { value: "Medium", color: "hsl(200, 90%, 70%)", description: "Moderate activity" },
          { value: "High", color: "hsl(160, 95%, 60%)", description: "Significant issues" },
          { value: "Very High", color: "hsl(120, 100%, 55%)", description: "Critical problems" }
        ]
      };
    } else if (mode === "risk") {
      return {
        title: "Risk Assessment",
        description: "Evaluates the risk level based on issue intensity and frequency",
        colors: [
          { value: "Low Risk", color: "hsl(140, 90%, 50%)", description: "Safe area with minimal issues" },
          { value: "Medium Risk", color: "hsl(120, 95%, 70%)", description: "Moderate concerns present" },
          { value: "High Risk", color: "hsl(90, 100%, 60%)", description: "Significant risk factors" },
          { value: "Critical Risk", color: "hsl(60, 100%, 55%)", description: "High-risk area requiring attention" }
        ]
      };
    } else {
      return {
        title: "Inequality Index",
        description: "Measures how much this area deviates from the citywide average",
        colors: [
          { value: "Low Inequality", color: "hsl(240, 85%, 50%)", description: "Similar to city average" },
          { value: "Medium Inequality", color: "hsl(220, 90%, 70%)", description: "Moderate deviation" },
          { value: "High Inequality", color: "hsl(180, 95%, 60%)", description: "Significant disparity" },
          { value: "Extreme Inequality", color: "hsl(140, 100%, 55%)", description: "Major inequality hotspot" }
        ]
      };
    }
  };

  const getDataTypeDescription = () => {
    switch (dataType) {
      case "violations":
        return "Building code violations and safety issues reported by HPD";
      case "evictions":
        return "Court-ordered evictions executed by marshals in the last 3 years";
      case "complaints":
        return "311 complaints about building conditions and maintenance issues";
      default:
        return "Housing-related data points";
    }
  };

  const legendData = getLegendData();

  return (
    <Paper
      sx={{
        position: "absolute",
        top: 20,
        right: 20,
        width: 280,
        zIndex: 1000,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: 3,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        border: "1px solid rgba(255, 107, 53, 0.2)"
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Info sx={{ color: "#FF6B35", fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#2D3748" }}>
              {legendData.title}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "#6B7280",
              "&:hover": { backgroundColor: "rgba(255, 107, 53, 0.1)" }
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {/* Description */}
        <Typography variant="body2" sx={{ color: "#4A5568", mb: 2, lineHeight: 1.5 }}>
          {legendData.description}
        </Typography>

        {/* Data Type Info */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: "rgba(255, 107, 53, 0.05)", borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#2D3748", mb: 1 }}>
            Current Data: {dataType.charAt(0).toUpperCase() + dataType.slice(1)}
          </Typography>
          <Typography variant="body2" sx={{ color: "#4A5568", fontSize: "0.875rem", mb: 1 }}>
            {getDataTypeDescription()}
          </Typography>
          <Typography variant="body2" sx={{ color: "#6B7280", fontSize: "0.75rem" }}>
            {selectedBorough === "All Boroughs" 
              ? `Showing all NYC boroughs (${data.length.toLocaleString()} buildings)`
              : `Showing ${selectedBorough} only (${data.filter(d => d.borough === selectedBorough).length.toLocaleString()} buildings)`
            }
          </Typography>
        </Box>

        {/* Color Scale */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#2D3748", mb: 2 }}>
          Color Scale
        </Typography>
        
        <Stack spacing={1.5}>
          {legendData.colors.map((item, index) => (
            <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: item.color,
                  border: "2px solid white",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#2D3748" }}>
                  {item.value}
                </Typography>
                <Typography variant="caption" sx={{ color: "#6B7280" }}>
                  {item.description}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>

        {/* Gradient Bar */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#2D3748", mb: 1 }}>
            Gradient Scale
          </Typography>
          <Box sx={{ height: 8, borderRadius: 4, overflow: "hidden" }}>
            <LinearProgress
              variant="determinate"
              value={100}
              sx={{
                height: "100%",
                  background: mode === "default" 
                    ? "linear-gradient(90deg, hsl(220, 85%, 55%) 0%, hsl(200, 90%, 70%) 33%, hsl(160, 95%, 60%) 66%, hsl(120, 100%, 55%) 100%)"
                    : mode === "risk"
                    ? "linear-gradient(90deg, hsl(140, 90%, 50%) 0%, hsl(120, 95%, 70%) 33%, hsl(90, 100%, 60%) 66%, hsl(60, 100%, 55%) 100%)"
                    : "linear-gradient(90deg, hsl(240, 85%, 50%) 0%, hsl(220, 90%, 70%) 33%, hsl(180, 95%, 60%) 66%, hsl(140, 100%, 55%) 100%)",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: "transparent"
                }
              }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            <Typography variant="caption" sx={{ color: "#6B7280" }}>Low</Typography>
            <Typography variant="caption" sx={{ color: "#6B7280" }}>High</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default HeatmapLegend;
