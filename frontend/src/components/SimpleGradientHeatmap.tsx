import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { type HeatmapPoint } from '../api/index.js';

interface SimpleGradientHeatmapProps {
  data: HeatmapPoint[];
  dataType: string;
  mode: "default" | "risk" | "inequality";
  onBuildingClick?: (bbl: string) => void;
}

// Simple and efficient gradient calculations
const calculateScore = (point: HeatmapPoint, allData: HeatmapPoint[], mode: string): number => {
  const intensity = point.intensity || 0;
  const count = point.count || 0;
  
  if (mode === "default") {
    // Default: simple combination of intensity and count
    return Math.min(1, (intensity * 0.7) + (Math.min(count / 50, 1) * 0.3));
  } else if (mode === "risk") {
    // Risk: higher intensity and frequency = higher risk
    return Math.min(1, (intensity * 0.6) + (Math.min(count / 100, 1) * 0.4));
  } else if (mode === "inequality") {
    // Inequality: based on deviation from median
    const allIntensities = allData.map(p => p.intensity || 0);
    const medianIntensity = allIntensities.sort((a, b) => a - b)[Math.floor(allIntensities.length / 2)];
    const deviation = Math.abs(intensity - medianIntensity) / (medianIntensity || 1);
    return Math.min(1, deviation * 0.8 + intensity * 0.2);
  }
  
  return intensity;
};

// Improved color scheme: Blue (low) -> Yellow (medium) -> Orange (high) -> Red (critical)
// This makes intuitive sense: red = danger/critical, blue = safe/low
const getVibrantColor = (score: number, mode: string): string => {
  if (mode === "default") {
    // Default: Blue -> Yellow -> Orange -> Red (intuitive heatmap colors)
    if (score < 0.25) {
      const t = score / 0.25;
      // Blue to Cyan
      return `hsl(${210 - t * 30}, 90%, ${60 + t * 10}%)`;
    } else if (score < 0.5) {
      const t = (score - 0.25) / 0.25;
      // Cyan to Yellow
      return `hsl(${180 - t * 60}, 95%, ${70 - t * 10}%)`;
    } else if (score < 0.75) {
      const t = (score - 0.5) / 0.25;
      // Yellow to Orange
      return `hsl(${60 - t * 20}, 100%, ${60 - t * 5}%)`;
    } else {
      const t = (score - 0.75) / 0.25;
      // Orange to Red (critical hotspots)
      return `hsl(${40 - t * 40}, 100%, ${55 - t * 10}%)`;
    }
  } else if (mode === "risk") {
    // Risk: Green (safe) -> Yellow -> Orange -> Red (danger)
    if (score < 0.25) {
      const t = score / 0.25;
      return `hsl(${120 + t * 20}, 80%, ${50 + t * 15}%)`; // Green to Yellow-Green
    } else if (score < 0.5) {
      const t = (score - 0.25) / 0.25;
      return `hsl(${60 - t * 20}, 95%, ${65 - t * 5}%)`; // Yellow-Green to Yellow
    } else if (score < 0.75) {
      const t = (score - 0.5) / 0.25;
      return `hsl(${40 - t * 10}, 100%, ${60 - t * 5}%)`; // Yellow to Orange
    } else {
      const t = (score - 0.75) / 0.25;
      return `hsl(${30 - t * 30}, 100%, ${55 - t * 10}%)`; // Orange to Red (high risk)
    }
  } else {
    // Inequality: Blue (normal) -> Purple -> Pink -> Red (extreme)
    if (score < 0.25) {
      const t = score / 0.25;
      return `hsl(${240 - t * 20}, 85%, ${55 + t * 15}%)`; // Deep Blue to Blue
    } else if (score < 0.5) {
      const t = (score - 0.25) / 0.25;
      return `hsl(${220 - t * 40}, 90%, ${70 - t * 10}%)`; // Blue to Purple
    } else if (score < 0.75) {
      const t = (score - 0.5) / 0.25;
      return `hsl(${300 - t * 60}, 85%, ${60 - t * 5}%)`; // Purple to Pink
    } else {
      const t = (score - 0.75) / 0.25;
      return `hsl(${0 + t * 0}, 100%, ${55 - t * 10}%)`; // Pink to Red (extreme inequality)
    }
  }
};

const SimpleGradientHeatmap: React.FC<SimpleGradientHeatmapProps> = ({ data, dataType, mode, onBuildingClick }) => {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map || data.length === 0) return;

    // Remove existing layer
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }

    const layerGroup = L.layerGroup();
    
    // Identify hotspots: points in top 10% by score (more meaningful threshold)
    const allScores = data.map(p => calculateScore(p, data, mode));
    const sortedScores = [...allScores].sort((a, b) => b - a);
    const top10Percentile = Math.floor(sortedScores.length * 0.1);
    const hotspotThreshold = sortedScores[top10Percentile] || sortedScores[0] || 0.7; // Top 10% or minimum 0.7
    
    // Sort by score to prioritize hotspots
    const sortedData = [...data]
      .map(p => ({ point: p, score: calculateScore(p, data, mode) }))
      .sort((a, b) => b.score - a.score);
    
    const maxPoints = Math.min(2000, sortedData.length);
    const displayData = sortedData.slice(0, maxPoints);
    
    // Create gradient circles with smooth blending - REDUCED to 2 circles for performance
    displayData.forEach(({ point, score }) => {
      const intensity = point.intensity || 0;
      const count = point.count || 0;
      const isHotspot = score >= hotspotThreshold;
      
      // Smaller, more reasonable radius - scale based on zoom level for better UX
      const mapZoom = map.getZoom();
      const zoomFactor = Math.max(0.5, Math.min(1.5, mapZoom / 12)); // Scale with zoom
      
      // Hotspots are slightly larger but not jarring
      const baseRadius = isHotspot 
        ? Math.max(50, Math.min(150, Math.sqrt(count) * 12 * zoomFactor)) // Reasonable hotspot size
        : Math.max(30, Math.min(100, Math.sqrt(count) * 8 * zoomFactor)); // Regular points
      
      const color = getVibrantColor(score, mode);
      
      // Create 2 overlapping circles for smoother gradient
      // Reduced opacity for less jarring, smoother appearance
      for (let i = 0; i < 2; i++) {
        const radius = baseRadius * (1 - i * 0.35);
        const baseOpacity = isHotspot ? 0.5 : 0.4; // Softer, less jarring
        const opacity = Math.max(0.15, Math.min(baseOpacity, score * (baseOpacity - i * 0.15)));
        
        const circle = L.circle([point.latitude, point.longitude], {
          radius: radius,
          fillColor: color,
          color: "rgba(255,255,255,0.05)",
          weight: 0.3,
          opacity: 0.1,
          fillOpacity: opacity,
        });
        
        // Add popup only to the largest circle
        if (i === 0) {
          const hotspotBadge = isHotspot 
            ? `<div style="background: #DC2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-bottom: 8px; text-align: center;">
                 🔥 CRITICAL HOTSPOT
               </div>`
            : '';
          
          const popupContent = `
            <div style="text-align: center; padding: 12px; min-width: 200px; font-family: Arial, sans-serif;">
              ${hotspotBadge}
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
              <div style="background: #E3F2FD; padding: 6px; border-radius: 4px; border-left: 3px solid ${color}; margin-bottom: 8px;">
                <div style="color: #1976D2; font-size: 11px; font-weight: 600;">${mode.toUpperCase()} SCORE</div>
                <div style="color: #2C3E50; font-size: 14px; font-weight: 700;">${(score * 100).toFixed(1)}%</div>
                ${isHotspot ? '<div style="color: #DC2626; font-size: 9px; margin-top: 2px;">⚠️ Above average threshold</div>' : ''}
              </div>
              ${onBuildingClick ? `<button id="view-building-heatmap-${point.bbl}" style="background: #FF6B35; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; width: 100%;">View Building Details</button>` : ''}
            </div>
          `;
          
          circle.bindPopup(popupContent);
          
          // Add click handler for button
          if (onBuildingClick) {
            circle.on('popupopen', () => {
              setTimeout(() => {
                const button = document.getElementById(`view-building-heatmap-${point.bbl}`);
                if (button) {
                  button.onclick = () => {
                    onBuildingClick(point.bbl);
                    map.closePopup();
                  };
                }
              }, 100);
            });
          }
        }
        
        layerGroup.addLayer(circle);
      }
    });

    layerGroup.addTo(map);
    layerGroupRef.current = layerGroup;

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, data, dataType, mode, onBuildingClick]);

  return null;
};

export default SimpleGradientHeatmap;
