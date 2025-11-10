import React, { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type HeatmapPoint } from "../api/index.js";
import SimpleGradientHeatmap from "./SimpleGradientHeatmap";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface OptimizedHeatmapProps {
  data: HeatmapPoint[];
  dataType: "violations" | "evictions" | "complaints";
  mode: "heat" | "points";
  heatmapMode: "default" | "risk" | "inequality";
  riskThreshold: number;
  onMapClick?: (lat: number, lng: number) => void;
  onBoundsChange?: (bounds: { min_lat: number; max_lat: number; min_lng: number; max_lng: number }) => void;
  onBuildingClick?: (bbl: string) => void;
}

// Points Layer - Shows individual data points with heatmap-style design
const PointsLayer: React.FC<{
  data: HeatmapPoint[];
  dataType: string;
  riskThreshold: number;
  onBuildingClick?: (bbl: string) => void;
}> = ({ data, dataType, riskThreshold, onBuildingClick }) => {
  const map = useMap();
  const filteredData = useMemo(() => {
    // Limit to top 2000 points for performance
    return data
      .filter(point => (point.intensity || 0) >= riskThreshold)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 2000);
  }, [data, riskThreshold]);

  return (
    <>
      {filteredData.map((point) => {
        const intensity = point.intensity || 0;
        const count = point.count || 0;
        
        // Small points for better visibility
        const radius = Math.max(1, Math.min(4, Math.sqrt(count) * 0.5));
        const opacity = Math.max(0.3, Math.min(0.8, intensity * 0.8));
        
        // Color based on data type
        let color = "#FF6B35"; // Default orange
        if (dataType === "violations") color = "#EF4444"; // Red
        else if (dataType === "evictions") color = "#F59E0B"; // Amber
        else if (dataType === "complaints") color = "#3B82F6"; // Blue
        
        return (
          <CircleMarker
            key={`${point.bbl}-${point.latitude}-${point.longitude}`}
            center={[point.latitude, point.longitude]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              color: "rgba(255,255,255,0.3)",
              weight: 0.5,
              opacity: 0.3,
              fillOpacity: opacity,
            }}
            eventHandlers={{
              click: () => {
                // Simple popup on click with link to building profile
                const popupContent = `
                  <div style="text-align: center; padding: 8px; min-width: 150px; font-family: Arial, sans-serif;">
                    <h4 style="margin: 0 0 4px 0; color: #2C3E50; font-size: 14px;">${point.address}</h4>
                    <p style="margin: 0 0 4px 0; color: #7F8C8D; font-size: 10px;">BBL: ${point.bbl}</p>
                    <div style="display: flex; gap: 8px; margin-bottom: 4px;">
                      <div style="background: #F8F9FA; padding: 4px; border-radius: 3px; flex: 1;">
                        <div style="color: #7F8C8D; font-size: 9px;">COUNT</div>
                        <div style="color: #2C3E50; font-size: 12px; font-weight: 700;">${count}</div>
                      </div>
                      <div style="background: #F8F9FA; padding: 4px; border-radius: 3px; flex: 1;">
                        <div style="color: #7F8C8D; font-size: 9px;">RISK</div>
                        <div style="color: #2C3E50; font-size: 12px; font-weight: 700;">${(intensity * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                    <div style="background: #E3F2FD; padding: 4px; border-radius: 3px; border-left: 2px solid ${color}; margin-bottom: 4px;">
                      <div style="color: #1976D2; font-size: 10px; font-weight: 600;">${dataType.toUpperCase()}</div>
                      <div style="color: #2C3E50; font-size: 10px;">${point.borough}</div>
                    </div>
                    <button id="view-building-${point.bbl}" style="background: #FF6B35; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; width: 100%;">
                      View Building Details
                    </button>
                  </div>
                `;
                
                const popup = L.popup()
                  .setLatLng([point.latitude, point.longitude])
                  .setContent(popupContent);
                popup.openOn(map);
                
                // Add click handler for button after popup is added to DOM
                setTimeout(() => {
                  const button = document.getElementById(`view-building-${point.bbl}`);
                  if (button && onBuildingClick) {
                    button.onclick = () => {
                      onBuildingClick(point.bbl);
                      map.closePopup();
                    };
                  }
                }, 100);
              }
            }}
          />
        );
      })}
    </>
  );
};

// Map Bounds Updater and Tracker
const MapBoundsUpdater: React.FC<{ 
  data: HeatmapPoint[];
  onBoundsChange?: (bounds: { min_lat: number; max_lat: number; min_lng: number; max_lng: number }) => void;
}> = ({ data, onBoundsChange }) => {
  const map = useMap();
  const boundsUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (data.length > 0 && !onBoundsChange && !hasInitializedRef.current) {
      // Only auto-fit on initial load - set NYC bounds for good initial view
      const bounds = L.latLngBounds(
        data.map(point => [point.latitude, point.longitude])
      );
      // Ensure we have valid bounds, otherwise use NYC default
      if (bounds.isValid() && data.length > 10) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      } else {
        // Default NYC view if no data or invalid bounds
        map.setView([40.7128, -74.0060], 11);
      }
      hasInitializedRef.current = true;
    }
  }, [map, data, onBoundsChange]);

  useEffect(() => {
    if (!onBoundsChange) return;

    const updateBounds = () => {
      const bounds = map.getBounds();
      if (bounds.isValid()) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        onBoundsChange({
          min_lat: sw.lat,
          max_lat: ne.lat,
          min_lng: sw.lng,
          max_lng: ne.lng,
        });
      }
    };

    // Debounce bounds updates
    const handleMoveEnd = () => {
      if (boundsUpdateTimerRef.current) {
        clearTimeout(boundsUpdateTimerRef.current);
      }
      boundsUpdateTimerRef.current = setTimeout(updateBounds, 500);
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);
    
    // Initial bounds
    updateBounds();

    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
      if (boundsUpdateTimerRef.current) {
        clearTimeout(boundsUpdateTimerRef.current);
      }
    };
  }, [map, onBoundsChange]);

  return null;
};

// Map Click Handler
const MapClickHandler: React.FC<{ onMapClick?: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  const map = useMap();

  useEffect(() => {
    if (onMapClick) {
      const handleClick = (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      };
      map.on('click', handleClick);
      return () => {
        map.off('click', handleClick);
      };
    }
  }, [map, onMapClick]);

  return null;
};

const OptimizedHeatmap: React.FC<OptimizedHeatmapProps> = ({
  data,
  dataType,
  mode,
  heatmapMode,
  riskThreshold,
  onMapClick,
  onBoundsChange,
  onBuildingClick,
}) => {
  // Safety check for data
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        height: "600px", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "#f5f5f5",
        borderRadius: "8px"
      }}>
        <div style={{ textAlign: "center", color: "#666" }}>
          <h3>No data available</h3>
          <p>Try adjusting your filters or selecting a different area.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%" }}>
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
        
        <MapBoundsUpdater data={data} onBoundsChange={onBoundsChange} />
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Render appropriate visualization layer */}
        {mode === "heat" && (
          <SimpleGradientHeatmap 
            data={data} 
            dataType={dataType} 
            mode={heatmapMode}
            onBuildingClick={onBuildingClick}
          />
        )}
        
        {mode === "points" && (
          <PointsLayer 
            data={data} 
            dataType={dataType} 
            riskThreshold={riskThreshold}
            onBuildingClick={onBuildingClick}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default OptimizedHeatmap;