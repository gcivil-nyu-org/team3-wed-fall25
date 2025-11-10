import React, { useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-leaflet';
import { CircleMarker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router';
import { type HeatmapPoint } from '../api/index.js';

interface PointsLayerProps {
  data: HeatmapPoint[];
  dataType: "violations" | "evictions" | "complaints";
  onBuildingClick?: (bbl: string) => void;
  // Advanced filters for points mode
  minViolations?: number;
  maxViolations?: number;
  minComplaints?: number;
  maxComplaints?: number;
  minEvictions?: number;
  maxEvictions?: number;
  rentStabilizedOnly?: boolean;
  rentStabilizedBBLs?: Set<string>;
}

const PointsLayer: React.FC<PointsLayerProps> = ({ 
  data, 
  dataType, 
  onBuildingClick,
  minViolations: _minViolations = 0,
  maxViolations: _maxViolations = 10000,
  minComplaints: _minComplaints = 0,
  maxComplaints: _maxComplaints = 10000,
  minEvictions: _minEvictions = 0,
  maxEvictions: _maxEvictions = 10000,
  rentStabilizedOnly = false,
  rentStabilizedBBLs = new Set()
}) => {
  const map = useMap();
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(map.getZoom());
  const [bounds, setBounds] = useState(map.getBounds());

  // Track zoom and bounds changes
  useEffect(() => {
    const updateView = () => {
      setZoom(map.getZoom());
      setBounds(map.getBounds());
    };

    map.on('zoomend', updateView);
    map.on('moveend', updateView);
    updateView(); // Initial

    return () => {
      map.off('zoomend', updateView);
      map.off('moveend', updateView);
    };
  }, [map]);

  // EFFICIENT RENDERING STRATEGY:
  // 1. Viewport-based: Only render points in visible area
  // 2. Level of Detail (LOD): Sample based on zoom level
  // 3. Performance: Limit max points rendered at once
  // 4. Advanced filters: Apply min/max ranges and rent stabilized filter
  const displayData = useMemo(() => {
    // Filter valid points
    let validPoints = data.filter(point => {
      const lat = point.latitude;
      const lng = point.longitude;
      return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    });

    // Apply advanced filters (these are already applied in SimplifiedMap, but keep for safety)
    // Note: The main filtering happens in SimplifiedMap before passing data here
    // This is just a safety check
    if (rentStabilizedOnly && rentStabilizedBBLs.size > 0) {
      validPoints = validPoints.filter(point => rentStabilizedBBLs.has(point.bbl));
    }

    if (validPoints.length === 0) return [];

    // VIEWPORT-BASED: Only show points in current viewport
    const viewportPoints = validPoints.filter(point => {
      try {
        return bounds.contains([point.latitude, point.longitude]);
      } catch {
        return true; // If bounds not ready, include all
      }
    });

    // LEVEL OF DETAIL (LOD): Sample based on zoom level
    // Zoom 10-11: Show 1 in every 10 points (10% sample)
    // Zoom 12-13: Show 1 in every 5 points (20% sample)
    // Zoom 14-15: Show 1 in every 2 points (50% sample)
    // Zoom 16+: Show all points (100%)
    let sampleRate = 1;
    if (zoom <= 11) {
      sampleRate = 10; // 10% when zoomed out
    } else if (zoom <= 13) {
      sampleRate = 5; // 20% at medium zoom
    } else if (zoom <= 15) {
      sampleRate = 2; // 50% when zoomed in
    } else {
      sampleRate = 1; // 100% when very zoomed in
    }

    // Sample points based on zoom level
    const sampledPoints = viewportPoints.filter((_, index) => index % sampleRate === 0);

    // MAX POINTS LIMIT: Never render more than 5000 points at once for performance
    // Prioritize points with higher counts
    const maxPoints = 5000;
    let finalPoints = sampledPoints;
    
    if (sampledPoints.length > maxPoints) {
      // Sort by count (descending) and take top points
      finalPoints = [...sampledPoints]
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, maxPoints);
    }

    console.log(`Points rendering: ${finalPoints.length} of ${viewportPoints.length} viewport points (zoom: ${zoom}, sample rate: 1/${sampleRate})`);
    
    return finalPoints;
  }, [data, bounds, zoom]);

  // Color based on data type
  const getColor = () => {
    if (dataType === "violations") return "#EF4444"; // Red
    if (dataType === "evictions") return "#F59E0B"; // Amber
    return "#3B82F6"; // Blue for complaints
  };

  const color = getColor();

  return (
    <>
      {displayData.map((point, index) => {
        const count = point.count || 0;
        
        // Size based on count
        const radius = Math.max(3, Math.min(8, Math.sqrt(count) * 0.3));
        
        // Generate unique key using index to avoid duplicates
        const uniqueKey = `${point.bbl}-${point.latitude}-${point.longitude}-${index}`;
        
        return (
          <CircleMarker
            key={uniqueKey}
            center={[point.latitude, point.longitude]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              color: "rgba(255,255,255,0.5)",
              weight: 1,
              opacity: 0.8,
              fillOpacity: 0.7,
            }}
          >
            <Popup>
              <div style={{ padding: "12px", minWidth: "240px", fontFamily: "Arial, sans-serif" }}>
                {/* Address Header */}
                <h3 style={{ 
                  margin: "0 0 12px 0", 
                  color: "#2D3748", 
                  fontSize: "16px", 
                  fontWeight: 700,
                  lineHeight: "1.3"
                }}>
                  {point.address || "Building Address"}
                </h3>
                
                {/* Main Stats Card */}
                <div style={{ 
                  backgroundColor: "#F8F9FA", 
                  borderRadius: "8px", 
                  padding: "12px", 
                  marginBottom: "12px",
                  border: `2px solid ${color}40`
                }}>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    marginBottom: "8px"
                  }}>
                    <span style={{ 
                      color: "#6B7280", 
                      fontSize: "12px",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}>
                      {dataType === "violations" ? "Open Violations" : dataType === "evictions" ? "Recent Evictions" : "Active Complaints"}
                    </span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: color, 
                      fontSize: "20px",
                      lineHeight: "1"
                    }}>
                      {count.toLocaleString()}
                    </span>
                  </div>
                  
                  {point.borough && (
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px",
                      marginTop: "8px",
                      paddingTop: "8px",
                      borderTop: "1px solid #E5E7EB"
                    }}>
                      <span style={{ 
                        color: "#9CA3AF", 
                        fontSize: "11px"
                      }}>
                        📍
                      </span>
                      <span style={{ 
                        color: "#4A5568", 
                        fontSize: "12px",
                        fontWeight: 500
                      }}>
                        {point.borough}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Info Text */}
                <div style={{ 
                  fontSize: "11px", 
                  color: "#6B7280", 
                  marginBottom: "12px",
                  lineHeight: "1.4"
                }}>
                  {dataType === "violations" 
                    ? "Building code violations reported by HPD" 
                    : dataType === "evictions" 
                    ? "Court-ordered evictions in the last 3 years"
                    : "311 complaints about building conditions"}
                </div>
                
                {/* View Profile Button */}
                {onBuildingClick && (
                  <button
                    id={`view-building-${point.bbl}`}
                    style={{
                      backgroundColor: "#FF6B35",
                      color: "white",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: 600,
                      width: "100%",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 4px rgba(255, 107, 53, 0.2)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#E55A2B";
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(255, 107, 53, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#FF6B35";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(255, 107, 53, 0.2)";
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Navigate directly to building profile page
                      navigate(`/building/${point.bbl}`);
                      map.closePopup();
                    }}
                  >
                    View Full Building Profile →
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};

export default PointsLayer;

