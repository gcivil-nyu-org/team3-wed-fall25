// src/api/landlord.ts
import axios from "./axiosInstance";

export interface PropertyDTO {
  id: string;
  address: string;
  occupancy_status: string;
  financial_performance: string;
  tenant_turnover: string;
  violations_count?: number;
  evictions_count?: number;
  bbl?: string;
}

export interface ViolationDTO {
  id: string;
  message: string;
  resolved: boolean;
}

export interface CommentDTO {
  id: string;
  user_id: number;
  body: string;
  created_at: string;
}

export interface ReviewDTO {
  id: string;
  author: string;
  content: string;
  title: string;
  rating: number | null;
  date: string;
  bbl: string;
  flagged?: boolean;
  comments?: CommentDTO[];
}

// Extended interfaces for building detail page
export interface BuildingViolationDTO {
  violation_id: number;
  bbl: string;
  nov_description: string;
  nov_type: string;
  class: string;
  rent_impairing: boolean;
  violation_status: string;
  current_status: string;
  inspection_date: string;
  nov_issued_date: string;
  house_number: string;
  street_name: string;
  apartment: string;
}

export interface BuildingComplaintDTO {
  complaint_id: number;
  bbl: string;
  type: string;
  major_category: string;
  minor_category: string;
  complaint_status: string;
  status_description: string;
  house_number: string;
  street_name: string;
  apartment: string;
  complaint_status_date: string;
}

export interface BuildingStatsDTO {
  total_violations: number;
  open_violations: number;
  total_complaints: number;
  open_complaints: number;
  eviction_filings: number;
}

export interface LandlordStatsDTO {
  total_violations: number;
  open_violations: number;
  total_complaints: number;
  open_complaints: number;
  total_properties: number;
  occupied_properties: number;
}

// Your existing functions (keeping them as-is)
export async function fetchProperties() {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.get<PropertyDTO[]>(`/landlord/properties/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let data = resp.data as any;

    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data as PropertyDTO[];
    }
    if (!Array.isArray(data)) {
      console.warn(
        "fetchProperties: unexpected response, expected array",
        data
      );
      return [];
    }
    return data as PropertyDTO[];
  } catch (error) {
    console.error("fetchProperties: error", error);
    throw error;
  }
}

export async function fetchViolations() {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.get<ViolationDTO[]>(`/landlord/violations/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let data = resp.data as any;
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data as ViolationDTO[];
    }
    if (!Array.isArray(data)) {
      console.warn(
        "fetchViolations: unexpected response, expected array",
        data
      );
      return [];
    }
    return data as ViolationDTO[];
  } catch (error) {
    console.error("fetchViolations: authentication error", error);
    throw error;
  }
}

export async function fetchReviews() {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.get<ReviewDTO[]>(
      // `/landlord/${landlordId}/reviews/`,
      `/landlord/reviews/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    let data = resp.data as any;
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data as ReviewDTO[];
    }
    if (!Array.isArray(data)) {
      console.warn("fetchReviews: unexpected response, expected array", data);
      return [];
    }
    return data as ReviewDTO[];
  } catch (error) {
    console.error("fetchReviews: error", error);
    throw error;
  }
}

// New functions for building detail page
export async function fetchViolationsByBBL(
  bbl: string
): Promise<BuildingViolationDTO[]> {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.get<BuildingViolationDTO[]>(
      `/landlord/violations/bbl/${bbl}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    let data = resp.data as any;
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data as BuildingViolationDTO[];
    }
    if (!Array.isArray(data)) {
      console.warn(
        "fetchViolationsByBBL: unexpected response, expected array",
        data
      );
      return [];
    }
    return data as BuildingViolationDTO[];
  } catch (error) {
    console.error("fetchViolationsByBBL: error", error);
    // Return empty array instead of throwing to allow fallback to mock data
    return [];
  }
}

export async function fetchComplaintsByBBL(
  bbl: string
): Promise<BuildingComplaintDTO[]> {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.get<BuildingComplaintDTO[]>(
      `/landlord/complaints/bbl/${bbl}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    let data = resp.data as any;
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data as BuildingComplaintDTO[];
    }
    if (!Array.isArray(data)) {
      console.warn(
        "fetchComplaintsByBBL: unexpected response, expected array",
        data
      );
      return [];
    }
    return data as BuildingComplaintDTO[];
  } catch (error) {
    console.error("fetchComplaintsByBBL: error", error);
    return [];
  }
}

export async function fetchBuildingStats(
  bbl: string
): Promise<BuildingStatsDTO> {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.get<BuildingStatsDTO>(
      `/landlord/building-stats/bbl/${bbl}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    let data = resp.data as any;
    if (data && typeof data === "object" && data.data) {
      return data.data as BuildingStatsDTO;
    }
    return data as BuildingStatsDTO;
  } catch (error) {
    console.error("fetchBuildingStats: error", error);
    // Return mock stats
    return {
      total_violations: 2,
      open_violations: 2,
      total_complaints: 5,
      open_complaints: 2,
      eviction_filings: 1,
    };
  }
}

export async function fetchLandlordStats(): Promise<LandlordStatsDTO> {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.get<LandlordStatsDTO>(`/landlord/stats/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    let data = resp.data as any;
    if (data && typeof data === "object" && data.data) {
      return data.data as LandlordStatsDTO;
    }
    return data as LandlordStatsDTO;
  } catch (error) {
    console.error("fetchLandlordStats: error", error);
    // Return mock stats
    return {
      total_violations: 3,
      open_violations: 2,
      total_complaints: 6,
      open_complaints: 2,
      total_properties: 2,
      occupied_properties: 1,
    };
  }
}

export async function submitReviewResponse(reviewId: string, response: string) {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.post(
      `/landlord/reviews/response/`,
      {
        review_id: reviewId,
        response: response,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    let data = resp.data as any;
    if (resp.status >= 200 && resp.status < 300) {
      return data;
    } else {
      throw new Error(
        data.error || "Failed to submit review response" + resp.status
      );
    }
  } catch (error: any) {
    console.error("submitReviewResponse: error", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

export async function flagReview(reviewId: string, reason: string) {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.post(
      `/landlord/reviews/flag/`,
      {
        review_id: reviewId,
        reason: reason,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    let data = resp.data as any;
    if (resp.status >= 200 && resp.status < 300) {
      return data;
    } else {
      throw new Error(data.error || "Failed to flag review" + resp.status);
    }
  } catch (error: any) {
    console.error("flagReview: error", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

export async function submitApplication(applicationData: {
  name: string;
  email: string;
  bbl: string;
  country: string;
  agreeTerms: boolean;
}) {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.post(`/landlord/apply/`, applicationData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    let data = resp.data as any;
    if (resp.status >= 200 && resp.status < 300) {
      return data;
    } else {
      throw new Error(
        data.error || "Failed to submit application" + resp.status
      );
    }
  } catch (error: any) {
    console.error("Axios error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

