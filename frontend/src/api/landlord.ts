import axios from "./axiosInstance";

export interface PropertyDTO {
  id: string;
  address: string;
  occupancy_status: string;
  financial_performance: string;
  tenant_turnover: string;
  violations_count?: number;
  evictions_count?: number;
}

export interface ViolationDTO {
  id: string;
  message: string;
  resolved: boolean;
}

export interface ReviewDTO {
  id: string;
  author: string;
  content: string;
  date: string;
  flagged?: boolean;
}

export async function fetchProperties(landlordId: string) {
  const resp = await axios.get<PropertyDTO[]>(`/landlord/${landlordId}/properties/`);
  let data = resp.data as any;
  // Handle wrapped responses like { result: true, data: [...] }
  if (data && typeof data === "object" && Array.isArray(data.data)) {
    return data.data as PropertyDTO[];
  }
  if (!Array.isArray(data)) {
    console.warn("fetchProperties: unexpected response, expected array", data);
    return [];
  }
  return data as PropertyDTO[];
}

export async function fetchViolations(landlordId: string) {
  const resp = await axios.get<ViolationDTO[]>(`/landlord/${landlordId}/violations/`);
  let data = resp.data as any;
  if (data && typeof data === "object" && Array.isArray(data.data)) {
    return data.data as ViolationDTO[];
  }
  if (!Array.isArray(data)) {
    console.warn("fetchViolations: unexpected response, expected array", data);
    return [];
  }
  return data as ViolationDTO[];
}

export async function fetchReviews(landlordId: string) {
  const resp = await axios.get<ReviewDTO[]>(`/landlord/${landlordId}/reviews/`);
  let data = resp.data as any;
  if (data && typeof data === "object" && Array.isArray(data.data)) {
    return data.data as ReviewDTO[];
  }
  if (!Array.isArray(data)) {
    console.warn("fetchReviews: unexpected response, expected array", data);
    return [];
  }
  return data as ReviewDTO[];
}
