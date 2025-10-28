// Building API functions

import axiosInstance from '../axiosInstance';
import type { 
  BuildingData, 
  BuildingApiResponse, 
  BuildingSearchResult, 
  SearchApiResponse, 
  SearchParams 
} from '../../types';
import { API_ENDPOINTS } from '../../constants';
import { buildSearchParams, handleApiError } from '../../utils';

export const fetchBuilding = async (bbl: string): Promise<BuildingData> => {
  try {
    const response = await axiosInstance.get<BuildingApiResponse>(`${API_ENDPOINTS.BUILDING.DETAILS}?bbl=${bbl}`);
    
    if (!response.data.result) {
      throw new Error("Failed to fetch building data");
    }
    
    return response.data.data;
  } catch (error) {
    console.error("Error fetching building data:", error);
    throw new Error(handleApiError(error));
  }
};

export const searchBuildings = async (params: SearchParams): Promise<SearchApiResponse> => {
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
        throw new Error(handleApiError(error));
      }
    }
    throw new Error(handleApiError(error));
  }
};
