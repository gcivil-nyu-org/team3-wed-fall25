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

export async function fetchProperties() {
  // const resp = await axios.get<PropertyDTO[]>(`/landlord/${landlordId}/properties/`);
  const resp = await axios.get<PropertyDTO[]>(`/landlord/properties/`);
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

export async function fetchViolations() {
  // const resp = await axios.get<ViolationDTO[]>(`/landlord/${landlordId}/violations/`);
  const resp = await axios.get<ViolationDTO[]>(`/landlord/violations/`);
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


function getCsrfToken(): string {
  // Try to get CSRF token from cookie
  const name = 'csrftoken';
  let cookieValue = '';
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export async function submitApplication(applicationData: {
  name: string;
  email: string;
  bbl: string;
  country: string;
  agreeTerms: boolean;
}) {
  const resp = await axios.post(`/landlord/apply/`, applicationData, {
    withCredentials: true, // Important for session authentication
    headers: {
      "X-CSRFToken": getCsrfToken(), // Add CSRF token
    },
  });
  let data = resp.data as any;
  if (resp.status >= 200 && resp.status < 300) {
    return data;
  } else {
    throw new Error(data.error || "Failed to submit application");
  }
}

