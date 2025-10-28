// Neighborhood-related type definitions

export interface NeighborhoodStats {
  bbl: string;
  address: string;
  borough: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
  total_violations: number;
  open_violations: number;
  class_a_violations: number;
  class_b_violations: number;
  class_c_violations: number;
  rent_impairing_violations: number;
  total_evictions: number;
  evictions_3yr: number;
  evictions_1yr: number;
  total_complaints: number;
  open_complaints: number;
  emergency_complaints: number;
  is_rent_stabilized: boolean;
  risk_score: number;
  risk_level: string;
  last_updated?: string;
}

export interface HeatmapPoint {
  bbl: string;
  latitude: number;
  longitude: number;
  intensity: number; // 0.0 to 1.0
  data_type: string; // 'violations', 'evictions', 'complaints'
  count: number;
  address: string;
  borough: string;
}

export interface BoroughSummary {
  borough: string;
  total_buildings: number;
  avg_violations_per_building: number;
  avg_evictions_per_building: number;
  total_rent_stabilized: number;
  high_risk_buildings: number;
  medium_risk_buildings: number;
  low_risk_buildings: number;
}

export interface NeighborhoodTrends {
  violations: Array<{
    month: string;
    count: number;
  }>;
  evictions: Array<{
    month: string;
    count: number;
  }>;
  complaints: Array<{
    month: string;
    count: number;
  }>;
}

// API Response Types
export interface NeighborhoodStatsApiResponse {
  result: boolean;
  data: NeighborhoodStats[];
  count: number;
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
  };
  data_type: string;
}

export interface HeatmapDataApiResponse {
  result: boolean;
  data: HeatmapPoint[];
  count: number;
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
  };
  data_type: string;
}

export interface BoroughSummaryApiResponse {
  result: boolean;
  data: BoroughSummary[];
  count: number;
  borough?: string;
}

export interface NeighborhoodTrendsApiResponse {
  result: boolean;
  data: NeighborhoodTrends;
  bbl: string;
  days_back: number;
}

// Parameter Types
export interface NeighborhoodStatsParams {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  data_type?: string;
}

export interface HeatmapDataParams {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  data_type?: string;
  borough?: string;
  limit?: number;
}

export interface NeighborhoodTrendsParams {
  bbl: string;
  days_back?: number;
}
