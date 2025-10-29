import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { type HeatmapPoint } from '../api/index.js';

interface GradientHeatmapProps {
  data: HeatmapPoint[];
  dataType: string;
  mode: "risk" | "inequality";
}

// Gradient Heatmap Layer - Creates smooth gradient overlays based on risk/inequality
const GradientHeatmap: React.FC<GradientHeatmapProps> = ({ data, dataType, mode }) => {
  const map = useMap();
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing layer
    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
    }

    if (data.length === 0) return;

    const heatmapLayer = L.layerGroup();
    
    // Create smooth gradient heatmap using individual points with larger radius
    data.forEach(point => {
      const intensity = point.intensity || 0;
      const count = point.count || 0;
      
      // Calculate risk/inequality score based on mode
      let score = 0;
      if (mode === "risk") {
        // Risk score based on intensity and count
        score = Math.min(1, (intensity * 0.7) + (Math.min(count / 50, 1) * 0.3));
      } else if (mode === "inequality") {
        // Inequality score based on intensity variance
        score = Math.min(1, intensity * 1.2);
      }
      
      // Larger radius for gradient effect
      const radius = Math.max(100, Math.min(300, Math.sqrt(count) * 30));
      const opacity = Math.max(0.1, Math.min(0.6, score * 0.8));
      
      // Color based on score and mode
      let color = "#95A5A6"; // Default gray
      if (mode === "risk") {
        if (score < 0.3) color = "#2ECC71"; // Green - low risk
        else if (score < 0.6) color = "#F39C12"; // Orange - medium risk
        else color = "#E74C3C"; // Red - high risk
      } else if (mode === "inequality") {
        if (score < 0.3) color = "#3498DB"; // Blue - low inequality
        else if (score < 0.6) color = "#9B59B6"; // Purple - medium inequality
        else color = "#E67E22"; // Orange - high inequality
      }
      
      const circle = L.circle([point.latitude, point.longitude], {
        radius: radius,
        fillColor: color,
        color: "rgba(255,255,255,0.1)",
        weight: 0.5,
        opacity: 0.2,
        fillOpacity: opacity,
      });
      
      // Add popup with point information
      circle.bindPopup(`
        <div style="text-align: center; padding: 12px; min-width: 200px; font-family: Arial, sans-serif;">
          <h4 style="margin: 0 0 8px 0; color: #2C3E50;">${point.address}</h4>
          <p style="margin: 0 0 8px 0; color: #7F8C8D; font-size: 12px;">BBL: ${point.bbl}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div style="background: #F8F9FA; padding: 6px; border-radius: 4px;">
              <div style="color: #7F8C8D; font-size: 10px;">COUNT</div>
              <div style="color: #2C3E50; font-size: 16px; font-weight: 700;">${count}</div>
            </div>
            <div style="background: #F8F9FA; padding: 6px; border-radius: 4px;">
              <div style="color: #7F8C8D; font-size: 10px;">INTENSITY</div>
              <div style="color: #2C3E50; font-size: 16px; font-weight: 700;">${(intensity * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div style="background: #E3F2FD; padding: 6px; border-radius: 4px; border-left: 3px solid ${color};">
            <div style="color: #1976D2; font-size: 11px; font-weight: 600;">${mode.toUpperCase()} SCORE</div>
            <div style="color: #2C3E50; font-size: 14px; font-weight: 700;">${(score * 100).toFixed(1)}%</div>
          </div>
        </div>
      `);
      
      heatmapLayer.addLayer(circle);
    });

    heatmapLayer.addTo(map);
    heatmapLayerRef.current = heatmapLayer;

    return () => {
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
      }
    };
  }, [map, data, dataType, mode]);

  return null;
};

export default GradientHeatmap;
