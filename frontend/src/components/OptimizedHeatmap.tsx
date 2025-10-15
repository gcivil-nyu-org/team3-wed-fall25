import React, { useEffect, useMemo } from "react";
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
}

// Points Layer - Shows individual data points with heatmap-style design
const PointsLayer: React.FC<{
  data: HeatmapPoint[];
  dataType: string;
  riskThreshold: number;
}> = ({ data, dataType, riskThreshold }) => {
  const map = useMap();
  const filteredData = useMemo(() => {
    // Limit to top 10000 points for performance while keeping all data
    return data
      .filter(point => (point.intensity || 0) >= riskThreshold)
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 10000);
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
                // Simple popup on click
                const popup = L.popup()
                  .setLatLng([point.latitude, point.longitude])
                  .setContent(`
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
                      <div style="background: #E3F2FD; padding: 4px; border-radius: 3px; border-left: 2px solid ${color};">
                        <div style="color: #1976D2; font-size: 10px; font-weight: 600;">${dataType.toUpperCase()}</div>
                        <div style="color: #2C3E50; font-size: 10px;">${point.borough}</div>
                      </div>
                    </div>
                  `);
                popup.openOn(map);
              }
            }}
          />
        );
      })}
    </>
  );
};

// Map Bounds Updater
const MapBoundsUpdater: React.FC<{ data: HeatmapPoint[] }> = ({ data }) => {
  const map = useMap();

  useEffect(() => {
    if (data.length > 0) {
      const bounds = L.latLngBounds(
        data.map(point => [point.latitude, point.longitude])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, data]);

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
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsUpdater data={data} />
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* Render appropriate visualization layer */}
        {mode === "heat" && (
          <SimpleGradientHeatmap 
            data={data} 
            dataType={dataType} 
            mode={heatmapMode}
          />
        )}
        
        {mode === "points" && (
          <PointsLayer 
            data={data} 
            dataType={dataType} 
            riskThreshold={riskThreshold} 
          />
        )}
      </MapContainer>
    </div>
  );
};

export default OptimizedHeatmap;