import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { type HeatmapPoint } from '../api/index.js';

interface TrueGradientHeatmapProps {
  data: HeatmapPoint[];
  dataType: string;
  mode: "risk" | "inequality";
}

// Define proper calculations for risk vs inequality
const calculateRiskScore = (point: HeatmapPoint): number => {
  const intensity = point.intensity || 0;
  const count = point.count || 0;
  
  // Risk score: combination of intensity and frequency
  // Higher intensity + higher count = higher risk
  const intensityWeight = 0.6;
  const frequencyWeight = 0.4;
  
  const normalizedCount = Math.min(count / 100, 1); // Normalize count to 0-1
  const riskScore = (intensity * intensityWeight) + (normalizedCount * frequencyWeight);
  
  return Math.min(1, riskScore);
};

const calculateInequalityScore = (point: HeatmapPoint, allData: HeatmapPoint[]): number => {
  const intensity = point.intensity || 0;
  const count = point.count || 0;
  
  // Inequality score: based on how much this point deviates from the median
  const allIntensities = allData.map(p => p.intensity || 0);
  const allCounts = allData.map(p => p.count || 0);
  
  const medianIntensity = allIntensities.sort((a, b) => a - b)[Math.floor(allIntensities.length / 2)];
  const medianCount = allCounts.sort((a, b) => a - b)[Math.floor(allCounts.length / 2)];
  
  // Calculate deviation from median
  const intensityDeviation = Math.abs(intensity - medianIntensity) / (medianIntensity || 1);
  const countDeviation = Math.abs(count - medianCount) / (medianCount || 1);
  
  // Inequality is higher when there's more deviation from the norm
  const inequalityScore = Math.min(1, (intensityDeviation * 0.7) + (countDeviation * 0.3));
  
  return inequalityScore;
};

const TrueGradientHeatmap: React.FC<TrueGradientHeatmapProps> = ({ data, dataType, mode }) => {
  const map = useMap();
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  useEffect(() => {
    if (!map || data.length === 0) return;

    // Remove existing overlay
    if (overlayRef.current) {
      map.removeLayer(overlayRef.current);
    }

    // Create canvas for gradient rendering
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get map bounds
    const bounds = map.getBounds();
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    // Calculate scores for all points
    const pointsWithScores = data.map(point => ({
      ...point,
      score: mode === "risk" ? calculateRiskScore(point) : calculateInequalityScore(point, data)
    }));

    // Create gradient data
    const gradientData = new Array(canvas.height).fill(null).map(() => 
      new Array(canvas.width).fill(0)
    );

    // Apply Gaussian blur-like effect for smooth gradients
    const blurRadius = 20;
    const sigma = blurRadius / 3;

    pointsWithScores.forEach(point => {
      const x = Math.floor(((point.longitude - west) / (east - west)) * canvas.width);
      const y = Math.floor(((north - point.latitude) / (north - south)) * canvas.height);
      
      if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
        // Apply Gaussian distribution around the point
        for (let dy = -blurRadius; dy <= blurRadius; dy++) {
          for (let dx = -blurRadius; dx <= blurRadius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < canvas.width && ny >= 0 && ny < canvas.height) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= blurRadius) {
                const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma));
                gradientData[ny][nx] += point.score * weight;
              }
            }
          }
        }
      }
    });

    // Normalize gradient data
    const maxValue = Math.max(...gradientData.flat());
    const minValue = Math.min(...gradientData.flat());
    const range = maxValue - minValue || 1;

    // Create vibrant color palette
    const getVibrantColor = (normalizedValue: number): string => {
      if (mode === "risk") {
        // Risk: Green (low) -> Yellow -> Orange -> Red (high)
        if (normalizedValue < 0.25) {
          const t = normalizedValue / 0.25;
          return `rgb(${Math.floor(34 + t * 221)}, ${Math.floor(139 + t * 116)}, ${Math.floor(34 + t * 21)})`; // Green to Yellow
        } else if (normalizedValue < 0.5) {
          const t = (normalizedValue - 0.25) / 0.25;
          return `rgb(${Math.floor(255 + t * 0)}, ${Math.floor(255 - t * 69)}, ${Math.floor(55 - t * 55)})`; // Yellow to Orange
        } else if (normalizedValue < 0.75) {
          const t = (normalizedValue - 0.5) / 0.25;
          return `rgb(${Math.floor(255 - t * 0)}, ${Math.floor(186 - t * 69)}, ${Math.floor(0 + t * 0)})`; // Orange to Red
        } else {
          const t = (normalizedValue - 0.75) / 0.25;
          return `rgb(${Math.floor(255 - t * 0)}, ${Math.floor(117 - t * 117)}, ${Math.floor(0 + t * 0)})`; // Red to Dark Red
        }
      } else {
        // Inequality: Blue (low) -> Purple -> Pink -> Orange (high)
        if (normalizedValue < 0.25) {
          const t = normalizedValue / 0.25;
          return `rgb(${Math.floor(52 + t * 103)}, ${Math.floor(152 + t * 103)}, ${Math.floor(219 + t * 36)})`; // Blue to Light Blue
        } else if (normalizedValue < 0.5) {
          const t = (normalizedValue - 0.25) / 0.25;
          return `rgb(${Math.floor(155 + t * 100)}, ${Math.floor(255 - t * 0)}, ${Math.floor(255 - t * 100)})`; // Light Blue to Purple
        } else if (normalizedValue < 0.75) {
          const t = (normalizedValue - 0.5) / 0.25;
          return `rgb(${Math.floor(255 - t * 0)}, ${Math.floor(255 - t * 100)}, ${Math.floor(155 + t * 100)})`; // Purple to Pink
        } else {
          const t = (normalizedValue - 0.75) / 0.25;
          return `rgb(${Math.floor(255 - t * 0)}, ${Math.floor(155 - t * 55)}, ${Math.floor(255 - t * 100)})`; // Pink to Orange
        }
      }
    };

    // Draw gradient
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const normalizedValue = range > 0 ? (gradientData[y][x] - minValue) / range : 0;
        const color = getVibrantColor(normalizedValue);
        
        const pixelIndex = (y * canvas.width + x) * 4;
        const rgb = color.match(/\d+/g);
        if (rgb) {
          imageData.data[pixelIndex] = parseInt(rgb[0]);     // Red
          imageData.data[pixelIndex + 1] = parseInt(rgb[1]); // Green
          imageData.data[pixelIndex + 2] = parseInt(rgb[2]); // Blue
          imageData.data[pixelIndex + 3] = Math.floor(normalizedValue * 180 + 75); // Alpha (75-255)
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);

    // Create image overlay
    const imageUrl = canvas.toDataURL();
    const imageOverlay = L.imageOverlay(imageUrl, [[south, west], [north, east]], {
      opacity: 0.7,
      interactive: false
    });

    imageOverlay.addTo(map);
    overlayRef.current = imageOverlay;

    return () => {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
      }
    };
  }, [map, data, dataType, mode]);

  return null;
};

export default TrueGradientHeatmap;
