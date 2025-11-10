import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
// @ts-ignore - leaflet.heat doesn't have types
import 'leaflet.heat';
import { type HeatmapPoint } from '../api/index.js';

interface TrueHeatmapProps {
  data: HeatmapPoint[];
  dataType: "violations" | "evictions" | "complaints";
  onBuildingClick?: (bbl: string) => void;
}

const TrueHeatmap: React.FC<TrueHeatmapProps> = ({ data, dataType: _dataType, onBuildingClick: _onBuildingClick }) => {
  const map = useMap();
  // @ts-ignore - leaflet.heat doesn't have proper types
  const heatLayerRef = useRef<any>(null);
  const [zoom, setZoom] = useState(map.getZoom());

  // STATIC HEATMAP: Pre-calculate everything ONCE when data changes
  // Only recalculates when data/filters change, NOT on zoom
  const heatData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Filter valid points
    const validPoints = data.filter(point => {
      const lat = point.latitude;
      const lng = point.longitude;
      return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });

    if (validPoints.length === 0) return [];

    // CRITICAL FIX: Rank-based mapping with original order preservation
    // This GUARANTEES exactly 20% in each color, regardless of actual count values
    
    // Create points with original index
    const pointsWithIndex = validPoints.map((point, idx) => ({
      point,
      count: point.count || 0,
      originalIndex: idx
    }));
    
    // Sort by count to assign ranks
    const sorted = [...pointsWithIndex].sort((a, b) => a.count - b.count);
    
    // Create rank map: originalIndex -> rank
    const rankMap = new Map<number, number>();
    sorted.forEach((item, rank) => {
      rankMap.set(item.originalIndex, rank);
    });
    
    // Calculate percentiles for debugging
    const sortedCounts = sorted.map(s => s.count);
    const p20 = sortedCounts[Math.floor(sortedCounts.length * 0.2)] || 0;
    const p40 = sortedCounts[Math.floor(sortedCounts.length * 0.4)] || 0;
    const p60 = sortedCounts[Math.floor(sortedCounts.length * 0.6)] || 0;
    const p80 = sortedCounts[Math.floor(sortedCounts.length * 0.8)] || 0;
    const p100 = sortedCounts[sortedCounts.length - 1] || 1;
    
    console.log(`=== HEATMAP DATA ANALYSIS ===`);
    console.log(`Total points: ${validPoints.length}`);
    console.log(`Count range: ${sortedCounts[0]} to ${p100}`);
    console.log(`Percentiles: p20=${p20}, p40=${p40}, p60=${p60}, p80=${p80}, max=${p100}`);
    
    // Map by rank - PRESERVE original order for heatmap
    const calculatedData: [number, number, number][] = validPoints.map((point, originalIndex) => {
      const lat = point.latitude;
      const lng = point.longitude;
      const rank = rankMap.get(originalIndex) || 0;
      const total = validPoints.length;
      
      // Map rank ratio to intensity (guarantees 20% each)
      const rankRatio = rank / total;
      let normalizedIntensity = 0;
      
      if (rankRatio < 0.2) {
        normalizedIntensity = (rankRatio / 0.2) * 0.2; // 0.0-0.2
      } else if (rankRatio < 0.4) {
        normalizedIntensity = 0.2 + ((rankRatio - 0.2) / 0.2) * 0.2; // 0.2-0.4
      } else if (rankRatio < 0.6) {
        normalizedIntensity = 0.4 + ((rankRatio - 0.4) / 0.2) * 0.2; // 0.4-0.6
      } else if (rankRatio < 0.8) {
        normalizedIntensity = 0.6 + ((rankRatio - 0.6) / 0.2) * 0.2; // 0.6-0.8
      } else {
        normalizedIntensity = 0.8 + ((rankRatio - 0.8) / 0.2) * 0.2; // 0.8-1.0
      }
      
      return [lat, lng, Math.min(1, Math.max(0, normalizedIntensity))];
    });
    
    // Debug: Verify distribution (should be ~20% each)
    const distribution = {
      blue: calculatedData.filter(([,,i]) => i < 0.2).length,
      teal: calculatedData.filter(([,,i]) => i >= 0.2 && i < 0.4).length,
      green: calculatedData.filter(([,,i]) => i >= 0.4 && i < 0.6).length,
      yellow: calculatedData.filter(([,,i]) => i >= 0.6 && i < 0.8).length,
      orange: calculatedData.filter(([,,i]) => i >= 0.8).length,
    };
    const total = distribution.blue + distribution.teal + distribution.green + distribution.yellow + distribution.orange;
    console.log('Color distribution (should be ~20% each):', {
      blue: `${distribution.blue} (${(distribution.blue/total*100).toFixed(1)}%)`,
      teal: `${distribution.teal} (${(distribution.teal/total*100).toFixed(1)}%)`,
      green: `${distribution.green} (${(distribution.green/total*100).toFixed(1)}%)`,
      yellow: `${distribution.yellow} (${(distribution.yellow/total*100).toFixed(1)}%)`,
      orange: `${distribution.orange} (${(distribution.orange/total*100).toFixed(1)}%)`,
    });

    console.log(`Pre-calculated ${calculatedData.length} heatmap points`);
    return calculatedData;
  }, [data]); // Only recalculate when data changes

    // Track zoom level for adaptive rendering
  useEffect(() => {
    const updateZoom = () => {
      setZoom(map.getZoom());
    };
    map.on('zoomend', updateZoom);
    updateZoom(); // Initial zoom
    return () => {
      map.off('zoomend', updateZoom);
    };
  }, [map]);

  // Update heatmap when data OR zoom changes
  useEffect(() => {
    if (!map || heatData.length === 0) return;

    // Remove existing layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    // Use ALL data points - no limit, leaflet.heat handles large datasets efficiently
    const displayData = heatData;

    // ZOOM-AWARE: Adjust radius and blur based on zoom level
    // When zoomed out: smaller radius/blur to prevent orange/yellow from dominating
    // When zoomed in: larger radius/blur for smoother visualization
    const currentZoom = map.getZoom();
    const baseRadius = 15; // Base radius
    const baseBlur = 12;   // Base blur
    
    // Scale radius/blur with zoom (smaller when zoomed out, larger when zoomed in)
    // Zoom 10 (zoomed out) → smaller radius/blur
    // Zoom 15 (zoomed in) → larger radius/blur
    const zoomFactor = Math.max(0.5, Math.min(1.5, (currentZoom - 10) / 5));
    const radius = Math.round(baseRadius * zoomFactor);
    const blur = Math.round(baseBlur * zoomFactor);

    // ZOOM-AWARE opacity: Make lower colors more visible when zoomed out
    // When zoomed out, reduce opacity of high-intensity colors to prevent dominance
    const zoomOpacityFactor = currentZoom < 12 ? 0.7 : 1.0; // Reduce opacity when zoomed out

    console.log(`Rendering at zoom ${currentZoom}: radius=${radius}, blur=${blur}, opacityFactor=${zoomOpacityFactor}`);

    // Gradient with zoom-aware opacity adjustments
    const heatLayer = (L as any).heatLayer(displayData, {
      radius: radius,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        // Aligned with 20% intervals for clear color separation
        // Opacity adjusted based on zoom to prevent orange/yellow dominance
        // 0.0-0.2: Blue (Low) - Higher opacity to make visible
        0.0: `rgba(59, 82, 139, ${0.5 * zoomOpacityFactor})`,   // Start blue
        0.2: `rgba(59, 82, 139, ${0.7 * zoomOpacityFactor})`,   // End blue, start teal
        
        // 0.2-0.4: Teal (Medium)
        0.4: `rgba(33, 144, 140, ${0.75 * zoomOpacityFactor})`,  // End teal, start green
        
        // 0.4-0.6: Green (High)
        0.6: `rgba(92, 200, 99, ${0.8 * zoomOpacityFactor})`,  // End green, start yellow
        
        // 0.6-0.8: Yellow (Very High) - Reduce opacity when zoomed out
        0.8: `rgba(253, 231, 37, ${0.75 * zoomOpacityFactor})`,  // End yellow, start orange
        
        // 0.8-1.0: Orange (Critical) - Reduce opacity when zoomed out to prevent dominance
        1.0: `rgba(255, 152, 0, ${0.8 * zoomOpacityFactor})`    // Full orange
      },
      blur: blur,
      minOpacity: 0.3 // Lower minimum to make blue more visible
    });

    heatLayer.addTo(map);
    heatLayerRef.current = heatLayer;

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, heatData, zoom]); // Update when data OR zoom changes

  return null;
};

export default TrueHeatmap;

