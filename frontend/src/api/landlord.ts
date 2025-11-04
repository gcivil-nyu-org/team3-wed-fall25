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
  try {
    // Get the JWT token from storage
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
    
    // Handle wrapped responses like { result: true, data: [...] }
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data as PropertyDTO[];
    }
    if (!Array.isArray(data)) {
      console.warn("fetchProperties: unexpected response, expected array", data);
      return [];
    }
    return data as PropertyDTO[];
    
  } catch (error) {
    console.error("fetchProperties: error", error);
    throw error; // Re-throw to let the caller handle it
  }
}

export async function fetchViolations() {
  try {
    // Get the JWT token from storage
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    // Move the API call INSIDE the try block where token is available
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

export async function fetchReviews(landlordId: string) {
  try {
    // Get the JWT token from storage
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    // Move the API call INSIDE the try block where token is available
    const resp = await axios.get<ReviewDTO[]>(`/landlord/${landlordId}/reviews/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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


export async function submitApplication(applicationData: {
  name: string;
  email: string;
  bbl: string;
  country: string;
  agreeTerms: boolean;
}) {
  try {
    // Get the JWT token from storage
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("No authentication token found. Please log in.");
    }

    const resp = await axios.post(`/landlord/apply/`, applicationData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // Add this line
        // Remove CSRF token since you're using JWT
        // "X-CSRFToken": getCsrfToken(),
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

// const resp = await axios.post(`/landlord/apply/`, applicationData);