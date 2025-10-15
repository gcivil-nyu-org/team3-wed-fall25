import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { type HeatmapPoint } from '../api/index.js';

interface SimpleGradientHeatmapProps {
  data: HeatmapPoint[];
  dataType: string;
  mode: "default" | "risk" | "inequality";
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

const getVibrantColor = (score: number, mode: string): string => {
  if (mode === "default") {
    // Default: Vibrant Blue to Red gradient
    if (score < 0.25) {
      const t = score / 0.25;
      return `hsl(${220 - t * 20}, 85%, ${55 + t * 15}%)`; // Deep Blue to Blue
    } else if (score < 0.5) {
      const t = (score - 0.25) / 0.25;
      return `hsl(${200 - t * 40}, 90%, ${70 - t * 10}%)`; // Blue to Purple
    } else if (score < 0.75) {
      const t = (score - 0.5) / 0.25;
      return `hsl(${160 - t * 40}, 95%, ${60 - t * 5}%)`; // Purple to Orange
    } else {
      const t = (score - 0.75) / 0.25;
      return `hsl(${120 - t * 120}, 100%, ${55 - t * 15}%)`; // Orange to Red
    }
  } else if (mode === "risk") {
    // Risk: Vibrant Green to Red
    if (score < 0.25) {
      const t = score / 0.25;
      return `hsl(${140 - t * 20}, 90%, ${50 + t * 20}%)`; // Forest Green to Green
    } else if (score < 0.5) {
      const t = (score - 0.25) / 0.25;
      return `hsl(${120 - t * 30}, 95%, ${70 - t * 10}%)`; // Green to Yellow
    } else if (score < 0.75) {
      const t = (score - 0.5) / 0.25;
      return `hsl(${90 - t * 30}, 100%, ${60 - t * 5}%)`; // Yellow to Orange
    } else {
      const t = (score - 0.75) / 0.25;
      return `hsl(${60 - t * 60}, 100%, ${55 - t * 15}%)`; // Orange to Red
    }
  } else {
    // Inequality: Vibrant Blue to Orange
    if (score < 0.25) {
      const t = score / 0.25;
      return `hsl(${240 - t * 20}, 85%, ${50 + t * 20}%)`; // Deep Blue to Blue
    } else if (score < 0.5) {
      const t = (score - 0.25) / 0.25;
      return `hsl(${220 - t * 40}, 90%, ${70 - t * 10}%)`; // Blue to Purple
    } else if (score < 0.75) {
      const t = (score - 0.5) / 0.25;
      return `hsl(${180 - t * 40}, 95%, ${60 - t * 5}%)`; // Purple to Pink
    } else {
      const t = (score - 0.75) / 0.25;
      return `hsl(${140 - t * 80}, 100%, ${55 - t * 15}%)`; // Pink to Orange
    }
  }
};

const SimpleGradientHeatmap: React.FC<SimpleGradientHeatmapProps> = ({ data, dataType, mode }) => {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map || data.length === 0) return;

    // Remove existing layer
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }

    const layerGroup = L.layerGroup();
    
    // Create gradient circles with smooth blending
    data.forEach((point) => {
      const score = calculateScore(point, data, mode);
      const intensity = point.intensity || 0;
      const count = point.count || 0;
      
      // Create multiple overlapping circles for gradient effect
      const baseRadius = Math.max(50, Math.min(200, Math.sqrt(count) * 15));
      const color = getVibrantColor(score, mode);
      
      // Create 3 overlapping circles for smooth gradient
      for (let i = 0; i < 3; i++) {
        const radius = baseRadius * (1 - i * 0.3);
        const opacity = Math.max(0.1, Math.min(0.6, score * (0.8 - i * 0.2)));
        
        const circle = L.circle([point.latitude, point.longitude], {
          radius: radius,
          fillColor: color,
          color: "rgba(255,255,255,0.1)",
          weight: 0.5,
          opacity: 0.2,
          fillOpacity: opacity,
        });
        
        // Add popup only to the largest circle
        if (i === 0) {
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
  }, [map, data, dataType, mode]);

  return null;
};

export default SimpleGradientHeatmap;
