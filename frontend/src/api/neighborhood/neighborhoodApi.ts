// Neighborhood API functions

import axiosInstance from '../axiosInstance';
import type {
  NeighborhoodStatsApiResponse,
  HeatmapDataApiResponse,
  BoroughSummaryApiResponse,
  NeighborhoodTrendsApiResponse,
  NeighborhoodStatsParams,
  HeatmapDataParams,
  NeighborhoodTrendsParams
} from '../../types';
import { API_ENDPOINTS } from '../../constants';
import { buildSearchParams, handleApiError } from '../../utils';

export const fetchNeighborhoodStats = async (params: NeighborhoodStatsParams): Promise<NeighborhoodStatsApiResponse> => {
  try {
    const searchParams = buildSearchParams({
      min_lat: params.min_lat,
      max_lat: params.max_lat,
      min_lng: params.min_lng,
      max_lng: params.max_lng,
      data_type: params.data_type,
    });

    const response = await axiosInstance.get<NeighborhoodStatsApiResponse>(
      `${API_ENDPOINTS.NEIGHBORHOOD.STATS}?${searchParams.toString()}`
    );
    
    if (!response.data.result) {
      throw new Error("Failed to fetch neighborhood stats");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching neighborhood stats:", error);
    throw new Error(handleApiError(error));
  }
};

export const fetchHeatmapData = async (params: HeatmapDataParams): Promise<HeatmapDataApiResponse> => {
  try {
    const searchParams = buildSearchParams({
      min_lat: params.min_lat,
      max_lat: params.max_lat,
      min_lng: params.min_lng,
      max_lng: params.max_lng,
      data_type: params.data_type,
      borough: params.borough,
      limit: params.limit,
    });

    const response = await axiosInstance.get<HeatmapDataApiResponse>(
      `${API_ENDPOINTS.NEIGHBORHOOD.HEATMAP}?${searchParams.toString()}`
    );
    
    if (!response.data.result) {
      throw new Error("Failed to fetch heatmap data");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching heatmap data:", error);
    throw new Error(handleApiError(error));
  }
};

export const fetchBoroughSummary = async (borough?: string): Promise<BoroughSummaryApiResponse> => {
  try {
    const searchParams = buildSearchParams({
      borough: borough,
    });

    const response = await axiosInstance.get<BoroughSummaryApiResponse>(
      `${API_ENDPOINTS.NEIGHBORHOOD.BOROUGH_SUMMARY}?${searchParams.toString()}`
    );
    
    if (!response.data.result) {
      throw new Error("Failed to fetch borough summary");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching borough summary:", error);
    throw new Error(handleApiError(error));
  }
};

export const fetchNeighborhoodTrends = async (params: NeighborhoodTrendsParams): Promise<NeighborhoodTrendsApiResponse> => {
  try {
    const searchParams = buildSearchParams({
      bbl: params.bbl,
      days_back: params.days_back,
    });

    const response = await axiosInstance.get<NeighborhoodTrendsApiResponse>(
      `${API_ENDPOINTS.NEIGHBORHOOD.TRENDS}?${searchParams.toString()}`
    );
    
    if (!response.data.result) {
      throw new Error("Failed to fetch neighborhood trends");
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching neighborhood trends:", error);
    throw new Error(handleApiError(error));
  }
};
