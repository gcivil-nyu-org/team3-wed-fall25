// Building API functions

import axiosInstance from '../axiosInstance';
import type { 
  BuildingData, 
  BuildingSearchResult, 
  SearchApiResponse, 
  SearchParams 
} from '../../types';
import { API_ENDPOINTS } from '../../constants';
import { buildSearchParams, handleApiError } from '../../utils';

export const fetchBuilding = async (bbl: string): Promise<BuildingData> => {
  try {
    const response = await axiosInstance.get<any>(`${API_ENDPOINTS.BUILDING.DETAILS}?bbl=${bbl}`);
    
    // Handle OkJSONRenderer wrapper: response.data.data or response.data
    const data = response.data?.data || response.data;
    
    // Check if data exists and has bbl field
    if (!data || !data.bbl) {
      throw new Error("Failed to fetch building data: Invalid response structure");
    }
    
    return data;
  } catch (error: any) {
    console.error("Error fetching building data:", error);
    
    // Provide more specific error messages
    if (error.response?.status === 404) {
      throw new Error(`Building with BBL ${bbl} not found in database. This building may not exist in your local database.`);
    }
    if (error.response?.status === 500) {
      throw new Error(`Server error while fetching building ${bbl}. The building may not exist in your local database, or there's a database connection issue.`);
    }
    
    throw new Error(handleApiError(error));
  }
};

export const searchBuildings = async (params: SearchParams): Promise<SearchApiResponse> => {
  try {
    // Check if query is a BBL (10-digit number) - use direct building fetch
    if (params.query && params.query.match(/^\d{10}$/)) {
      try {
        const building = await fetchBuilding(params.query);
        const searchResult: BuildingSearchResult = {
          bbl: building.bbl,
          address: `${building.registration.house_number} ${building.registration.street_name}`,
          borough: building.registration.boro,
          zip: building.registration.zip,
          evictions3yr: building.evictions?.length || 0,
          openViolations: building.violations?.filter((v: any) => v.violation_status === 'Open').length || 0,
          riskLevel: (building.evictions?.length || 0) > 5 || (building.violations?.filter((v: any) => v.violation_status === 'Open').length || 0) > 10 
            ? "High Risk" 
            : (building.evictions?.length || 0) > 2 || (building.violations?.filter((v: any) => v.violation_status === 'Open').length || 0) > 5 
            ? "Moderate Risk" 
            : "Low Risk",
          rentStabilized: building.rent_stabilized?.status === "RENT_STABILIZED",
        };
        
        return {
          result: true,
          data: [searchResult],
          total: 1,
          page: 1,
          limit: 1
        };
      } catch (buildingError: any) {
        // If building fetch fails, return empty result instead of throwing
        console.warn("Building not found in local database:", buildingError.message);
        return {
          result: true,
          data: [],
          total: 0,
          page: 1,
          limit: params.limit || 10
        };
      }
    }

    // Try search endpoint (may not exist)
    try {
      const searchParams = buildSearchParams({
        q: params.query,
        borough: params.borough !== 'All Boroughs' ? params.borough : undefined,
        rent_stabilized: params.rentStabilized ? 'true' : undefined,
        evictions_min: params.evictionsMin,
        evictions_max: params.evictionsMax,
        violations_min: params.violationsMin,
        violations_max: params.violationsMax,
        zip: params.zipCode,
        page: params.page,
        limit: params.limit,
      });

      const response = await axiosInstance.get<SearchApiResponse>(`${API_ENDPOINTS.BUILDING.SEARCH}?${searchParams.toString()}`);
      
      if (!response.data.result) {
        throw new Error("Failed to search buildings");
      }
      
      return response.data;
    } catch (searchError: any) {
      // Search endpoint doesn't exist or failed - return empty result
      console.warn("Search endpoint not available:", searchError.message);
      return {
        result: true,
        data: [],
        total: 0,
        page: 1,
        limit: params.limit || 10
      };
    }
  } catch (error) {
    console.error("Error searching buildings:", error);
    // Return empty result instead of throwing error
    return {
      result: true,
      data: [],
      total: 0,
      page: 1,
      limit: params.limit || 10
    };
  }
};
