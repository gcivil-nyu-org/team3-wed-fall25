import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { type HeatmapPoint } from '../api/index.js';

interface CleanHeatmapProps {
  data: HeatmapPoint[];
  dataType: "violations" | "evictions" | "complaints";
  onBuildingClick?: (bbl: string) => void;
}

// Simple, understandable color scheme: Blue (low) -> Yellow -> Orange -> Red (high)
const getColor = (intensity: number): string => {
  // Intensity is 0-1, map to colors
  if (intensity < 0.25) {
    // Blue for low
    return `rgba(59, 130, 246, ${0.3 + intensity * 0.4})`; // Blue with opacity
  } else if (intensity < 0.5) {
    // Yellow for medium
    return `rgba(234, 179, 8, ${0.4 + (intensity - 0.25) * 0.4})`; // Yellow
  } else if (intensity < 0.75) {
    // Orange for high
    return `rgba(249, 115, 22, ${0.5 + (intensity - 0.5) * 0.3})`; // Orange
  } else {
    // Red for critical
    return `rgba(239, 68, 68, ${0.6 + (intensity - 0.75) * 0.3})`; // Red
  }
};

// Simple radius calculation based on count
const getRadius = (count: number, zoom: number): number => {
  // Base radius scales with zoom
  const baseRadius = Math.max(30, Math.min(120, count * 2));
  // Scale with zoom level
  const zoomFactor = Math.max(0.6, Math.min(1.4, zoom / 12));
  return baseRadius * zoomFactor;
};

const CleanHeatmap: React.FC<CleanHeatmapProps> = ({ data, dataType, onBuildingClick }) => {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState(map.getZoom());

  // Track zoom level
  useEffect(() => {
    const handleZoom = () => {
      setZoom(map.getZoom());
    };
    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  useEffect(() => {
    if (!map || data.length === 0) return;

    // Remove existing layer
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }

    const layerGroup = L.layerGroup();
    const currentZoom = map.getZoom();

    // Normalize intensity across the dataset so we see the full gradient
    // Find min/max counts to create relative intensity
    const counts = data.map(p => p.count || 0).filter(c => c > 0);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const countRange = maxCount - minCount || 1; // Avoid division by zero

    // Also normalize by intensity if available
    const intensities = data.map(p => p.intensity || 0).filter(i => i >= 0);
    const minIntensity = Math.min(...intensities);
    const maxIntensity = Math.max(...intensities);
    const intensityRange = maxIntensity - minIntensity || 1;

    // Limit to top 3000 points for performance, but keep variety
    // Take top 2000 by count, then sample 1000 from the rest for variety
    const sortedByCount = [...data].sort((a, b) => (b.count || 0) - (a.count || 0));
    const topPoints = sortedByCount.slice(0, 2000);
    const restPoints = sortedByCount.slice(2000);
    const sampledRest = restPoints.filter((_, i) => i % Math.ceil(restPoints.length / 1000) === 0).slice(0, 1000);
    const displayData = [...topPoints, ...sampledRest];

    displayData.forEach((point) => {
      const rawIntensity = point.intensity || 0;
      const count = point.count || 0;
      
      // Normalize intensity to 0-1 range based on dataset
      // Use a combination of count and intensity for better distribution
      const normalizedCount = countRange > 0 ? (count - minCount) / countRange : 0;
      const normalizedIntensity = intensityRange > 0 ? (rawIntensity - minIntensity) / intensityRange : rawIntensity;
      
      // Combine both for a balanced intensity (weighted towards count for visibility)
      const finalIntensity = Math.min(1, Math.max(0, (normalizedCount * 0.6 + normalizedIntensity * 0.4)));
      
      const color = getColor(finalIntensity);
      const radius = getRadius(count, currentZoom);

      // Create a single circle with smooth gradient effect
      // Adjust opacity based on intensity for better visual hierarchy
      const opacity = Math.max(0.3, Math.min(0.7, 0.4 + finalIntensity * 0.3));
      
      const circle = L.circle([point.latitude, point.longitude], {
        radius: radius,
        fillColor: color,
        color: 'rgba(255, 255, 255, 0.2)',
        weight: 0.5,
        opacity: 0.2,
        fillOpacity: opacity,
      });

      // Add popup
      const popupContent = `
        <div style="text-align: center; padding: 10px; min-width: 180px; font-family: Arial, sans-serif;">
          <h4 style="margin: 0 0 6px 0; color: #1F2937; font-size: 14px; font-weight: 600;">${point.address || 'Unknown Address'}</h4>
          <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 11px;">BBL: ${point.bbl}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div style="background: #F3F4F6; padding: 6px; border-radius: 4px;">
              <div style="color: #6B7280; font-size: 9px; text-transform: uppercase;">Count</div>
              <div style="color: #111827; font-size: 16px; font-weight: 700;">${count}</div>
            </div>
            <div style="background: #F3F4F6; padding: 6px; border-radius: 4px;">
              <div style="color: #6B7280; font-size: 9px; text-transform: uppercase;">Intensity</div>
              <div style="color: #111827; font-size: 16px; font-weight: 700;">${(finalIntensity * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div style="background: #EFF6FF; padding: 6px; border-radius: 4px; margin-bottom: 8px; border-left: 3px solid ${color};">
            <div style="color: #1E40AF; font-size: 10px; font-weight: 600; text-transform: uppercase;">${dataType}</div>
            <div style="color: #374151; font-size: 11px;">${point.borough || 'Unknown'}</div>
          </div>
          ${onBuildingClick ? `<button id="view-building-clean-${point.bbl}" style="background: #FF6B35; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; width: 100%; transition: background 0.2s;">View Building Details</button>` : ''}
        </div>
      `;

      circle.bindPopup(popupContent);

      // Add click handler for button
      if (onBuildingClick) {
        circle.on('popupopen', () => {
          setTimeout(() => {
            const button = document.getElementById(`view-building-clean-${point.bbl}`);
            if (button) {
              button.onclick = () => {
                onBuildingClick(point.bbl);
                map.closePopup();
              };
            }
          }, 100);
        });
      }

      layerGroup.addLayer(circle);
    });

    layerGroup.addTo(map);
    layerGroupRef.current = layerGroup;

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, data, dataType, onBuildingClick, zoom]);

  return null;
};

export default CleanHeatmap;

