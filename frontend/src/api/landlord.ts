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
  address?: string;
  bbl?: string;
  total_violations: number;
  open_violations: number;
  total_complaints: number;
  open_complaints: number;
  eviction_filings: number;
  // Landlord-entered metadata
  average_rent?: number | null;
  occupancy_rate?: number | null;
  // PLUTO / canonical fields
  year_built?: number | null;
  building_class?: string | null;
  total_units?: number | null;
  stories?: number | null;
  lot_area?: number | null;
  owner?: string | null;
  zipcode?: string | null;
  // Raw PLUTO row if needed
  pluto?: any | null;
}

// PLUTO DTO: represents a row from the `building_pluto` table
export interface PlutoDTO {
  bbl: string;
  borough?: string | null;
  block?: string | null;
  lot?: string | null;
  borocode?: string | null;
  plutomapid?: string | null;
  address?: string | null;
  zipcode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  xcoord?: number | null;
  ycoord?: number | null;
  cd?: string | null;
  council?: string | null;
  lotarea?: number | null;
  bldgarea?: number | null;
  resarea?: number | null;
  numfloors?: number | null;
  unitsres?: number | null;
  unitstotal?: number | null;
  yearbuilt?: number | null;
  yearalter1?: number | null;
  ownername?: string | null;
  bldgclass?: string | null;
  assessland?: number | null;
  assesstot?: number | null;
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

export async function fetchPlutoByBBL(bbl: string): Promise<PlutoDTO | null> {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.get(`/landlord/building/${bbl}/pluto/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = resp.data as any;
    if (data && typeof data === "object" && data.data) {
      return data.data as PlutoDTO;
    }
    return data as PlutoDTO | null;
  } catch (error) {
    console.error("fetchPlutoByBBL: error", error);
    return null;
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

// Toggle resolved state for a violation by id
export async function toggleViolationResolved(violationId: number | string, resolved: boolean) {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("No authentication token found. Please log in.");

    // backend expects a patch to /landlord/violation/<id>/ with { resolved: true|false }
    const resp = await axios.patch(
      `/landlord/violation/${violationId}/`,
      { resolved },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return resp.data;
  } catch (err) {
    console.error("toggleViolationResolved error", err);
    throw err;
  }
}

// Toggle resolved state for a complaint by id
export async function toggleComplaintResolved(complaintId: number | string, resolved: boolean) {
  try {
    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("No authentication token found. Please log in.");

    const resp = await axios.patch(
      `/landlord/complaint/${complaintId}/`,
      { resolved },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return resp.data;
  } catch (err) {
    console.error("toggleComplaintResolved error", err);
    throw err;
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
  landlordType?: string;
  organizationName?: string;
  hpdRegistration?: string;
  businessPhone?: string;
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

// Update building info (best-effort helper). Backend route may not exist yet;
// this helper attempts POST to `/landlord/building/{bbl}/update/` and returns the server payload.
export async function updateBuildingInfo(
  bbl: string,
  payload: { average_rent?: number | null; occupancy_rate?: number | null; turnover_rate?: number | null }
) {
  try {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.post(`/landlord/building/${bbl}/update/`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = resp.data as any;
    if (resp.status >= 200 && resp.status < 300) {
      // try to return server-updated building info
      return data && data.data ? data.data : data;
    }
    throw new Error(data?.error || `Update failed: ${resp.status}`);
  } catch (error: any) {
    console.error("updateBuildingInfo: error", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

