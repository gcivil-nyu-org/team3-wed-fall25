import { fetchProfile } from "./auth";
import axiosInstance from "./axiosInstance";

// Building data interfaces and API functions

export interface BuildingData {
  bbl: string;
  registration: {
    bbl: string;
    bin: number;
    boro_id: number;
    boro: string;
    block: number;
    lot: number;
    house_number: string;
    street_name: string;
    zip: string;
    community_board: number;
    last_registration_date: string;
    registration_end_date: string;
    registration_id: number;
    building_id: number;
  };
  rent_stabilized: {
    bbl: string;
    borough: string;
    block: number;
    lot: number;
    zip: string;
    city: string;
    status: string;
    source_year: number;
  };
  contacts: Array<{
    registration_contact_id: number;
    registration_id: number;
    type: string;
    contact_description: string;
    first_name: string;
    last_name: string;
    corporation_name: string | null;
    business_house_number: string | null;
    business_street_name: string | null;
    business_city: string | null;
    business_state: string | null;
    business_zip: string | null;
    business_apartment: string | null;
  }>;
  affordable: any[];
  complaints: Array<{
    complaint_id: number;
    bbl: string;
    borough: string;
    block: number;
    lot: number;
    problem_id: number;
    unit_type: string;
    space_type: string;
    type: string;
    major_category: string;
    minor_category: string;
    complaint_status: string;
    complaint_status_date: string | null;
    problem_status: string;
    problem_status_date: string;
    status_description: string;
    house_number: string;
    street_name: string;
    post_code: string;
    apartment: string;
  }>;
  violations: Array<{
    violation_id: number;
    bbl: string;
    bin: number | null;
    block: number;
    lot: number;
    boro: string;
    nov_description: string;
    nov_type: string;
    class_: string;
    rent_impairing: boolean;
    violation_status: string;
    current_status: string;
    current_status_id: number;
    current_status_date: string;
    inspection_date: string;
    nov_issued_date: string;
    approved_date: string;
    house_number: string;
    street_name: string;
    apartment: string | null;
    story: string | null;
  }>;
  acris_master: Record<string, any>;
  acris_legals: Record<string, any>;
  acris_parties: Record<string, any>;
  evictions: Array<{
    docket_number: string;
    court_index_number: string;
    bbl: string;
    bin: number;
    borough: string;
    eviction_zip: string;
    eviction_address: string;
    eviction_apt_num: string;
    community_board: number;
    council_district: number;
    census_tract: string;
    nta: string;
    latitude: string;
    longitude: string;
    executed_date: string;
    residential_commercial_ind: string;
    ejectment: string;
    eviction_possession: string;
    marshal_first_name: string;
    marshal_last_name: string;
  }>;
  counts: {
    contacts: number;
    affordable: number;
    complaints: number;
    violations: number;
    evictions: number;
    acris_docs: number;
    acris_legals: number;
    acris_parties: number;
  };
}

export interface BuildingApiResponse {
  result: boolean;
  data: BuildingData;
}

export const fetchBuilding = async (bbl: string): Promise<BuildingData> => {
  try {
    const response = await axiosInstance.get<BuildingApiResponse>(`/building/?bbl=${bbl}`);
    
    if (!response.data.result) {
      throw new Error("Failed to fetch building data");
    }
    
    return response.data.data;
  } catch (error) {
    console.error("Error fetching building data:", error);
    throw error;
  }
};

export interface BuildingSearchResult {
  bbl: string;
  address: string;
  borough: string;
  zip: string;
  units?: number;
  evictions3yr: number;
  openViolations: number;
  communityRating?: number;
  reviewCount?: number;
  riskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
  rentStabilized: boolean;
}

export interface SearchApiResponse {
  result: boolean;
  data: BuildingSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export const searchBuildings = async (params: {
  query?: string;
  borough?: string;
  rentStabilized?: boolean;
  evictionsMin?: number;
  evictionsMax?: number;
  violationsMin?: number;
  violationsMax?: number;
  zipCode?: string;
  page?: number;
  limit?: number;
}): Promise<SearchApiResponse> => {
  try {
    const searchParams = new URLSearchParams();
    
    if (params.query) searchParams.append('q', params.query);
    if (params.borough && params.borough !== 'All Boroughs') searchParams.append('borough', params.borough);
    if (params.rentStabilized) searchParams.append('rent_stabilized', 'true');
    if (params.evictionsMin !== undefined) searchParams.append('evictions_min', params.evictionsMin.toString());
    if (params.evictionsMax !== undefined) searchParams.append('evictions_max', params.evictionsMax.toString());
    if (params.violationsMin !== undefined) searchParams.append('violations_min', params.violationsMin.toString());
    if (params.violationsMax !== undefined) searchParams.append('violations_max', params.violationsMax.toString());
    if (params.zipCode) searchParams.append('zip', params.zipCode);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await axiosInstance.get<SearchApiResponse>(`/buildings/search/?${searchParams.toString()}`);
    
    if (!response.data.result) {
      throw new Error("Failed to search buildings");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error searching buildings:", error);
    // Fallback to individual building search if search endpoint doesn't exist
    if (params.query && params.query.match(/^\d{10}$/)) {
      // If query looks like a BBL, try to fetch that specific building
      try {
        const building = await fetchBuilding(params.query);
        const searchResult: BuildingSearchResult = {
          bbl: building.bbl,
          address: `${building.registration.house_number} ${building.registration.street_name}`,
          borough: building.registration.boro,
          zip: building.registration.zip,
          evictions3yr: building.evictions.length,
          openViolations: building.violations.filter(v => v.violation_status === 'Open').length,
          riskLevel: building.evictions.length > 5 || building.violations.filter(v => v.violation_status === 'Open').length > 10 
            ? "High Risk" 
            : building.evictions.length > 2 || building.violations.filter(v => v.violation_status === 'Open').length > 5 
            ? "Moderate Risk" 
            : "Low Risk",
          rentStabilized: building.rent_stabilized.status === "RENT_STABILIZED",
        };
        
        return {
          result: true,
          data: [searchResult],
          total: 1,
          page: 1,
          limit: 1
        };
      } catch (buildingError) {
        throw error; // Throw original search error
      }
    }
    throw error;
  }
};

// Neighborhood Explorer Types
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

// Neighborhood API Response Types
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

// Neighborhood API Functions
export const fetchNeighborhoodStats = async (params: {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  data_type?: string;
}): Promise<NeighborhoodStatsApiResponse> => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.append('min_lat', params.min_lat.toString());
    searchParams.append('max_lat', params.max_lat.toString());
    searchParams.append('min_lng', params.min_lng.toString());
    searchParams.append('max_lng', params.max_lng.toString());
    if (params.data_type) searchParams.append('data_type', params.data_type);

    const response = await axiosInstance.get<NeighborhoodStatsApiResponse>(
      `/neighborhood/stats/?${searchParams.toString()}`
    );
    
    if (!response.data.result) {
      throw new Error("Failed to fetch neighborhood stats");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching neighborhood stats:", error);
    throw error;
  }
};

export const fetchHeatmapData = async (params: {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  data_type?: string;
  borough?: string;
  limit?: number;
}): Promise<HeatmapDataApiResponse> => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.append('min_lat', params.min_lat.toString());
    searchParams.append('max_lat', params.max_lat.toString());
    searchParams.append('min_lng', params.min_lng.toString());
    searchParams.append('max_lng', params.max_lng.toString());
    if (params.data_type) searchParams.append('data_type', params.data_type);
    if (params.borough) searchParams.append('borough', params.borough);
    if (params.limit) searchParams.append('limit', params.limit.toString());

    const response = await axiosInstance.get<HeatmapDataApiResponse>(
      `/neighborhood/heatmap/?${searchParams.toString()}`
    );
    
    if (!response.data.result) {
      throw new Error("Failed to fetch heatmap data");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    throw error;
  }
};

export const fetchBoroughSummary = async (borough?: string): Promise<BoroughSummaryApiResponse> => {
  try {
    const searchParams = new URLSearchParams();
    if (borough) searchParams.append('borough', borough);

    const response = await axiosInstance.get<BoroughSummaryApiResponse>(
      `/neighborhood/borough-summary/?${searchParams.toString()}`
    );
    
    if (!response.data.result) {
      throw new Error("Failed to fetch borough summary");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching borough summary:", error);
    throw error;
  }
};

export const fetchNeighborhoodTrends = async (params: {
  bbl: string;
  days_back?: number;
}): Promise<NeighborhoodTrendsApiResponse> => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.append('bbl', params.bbl);
    if (params.days_back) searchParams.append('days_back', params.days_back.toString());

    const response = await axiosInstance.get<NeighborhoodTrendsApiResponse>(
      `/neighborhood/trends/?${searchParams.toString()}`
    );
    
    if (!response.data.result) {
      throw new Error("Failed to fetch neighborhood trends");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching neighborhood trends:", error);
    throw error;
  }
};

export { fetchProfile };
