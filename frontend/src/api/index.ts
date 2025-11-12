import { fetchProfile, loginUser, registerUser, verifyEmail, resendVerification } from "./auth";
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
    const response = await axiosInstance.get<BuildingApiResponse>(
      `/building/?bbl=${bbl}`
    );

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
  rent_stabilized?: string;
  affordable_housing?: string;
  risk_level?: string;
  violation_class?: string;
  rent_impairing?: string;
  complaint_category?: string;
  recent_activity_days?: string;
  evictionsMin?: number;
  evictionsMax?: number;
  violationsMin?: number;
  violationsMax?: number;
  zipCode?: string;
  zip?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
}): Promise<SearchApiResponse> => {
  try {
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.append("q", params.query);
    if (params.borough && params.borough !== "All Boroughs") {
      searchParams.append("borough", params.borough);
      console.log("[DEBUG API] Sending borough filter:", params.borough);
    }
    if (params.rentStabilized) searchParams.append("rent_stabilized", "true");
    if (params.rent_stabilized) searchParams.append("rent_stabilized", params.rent_stabilized);
    if (params.affordable_housing) searchParams.append("affordable_housing", params.affordable_housing);
    if (params.risk_level) searchParams.append("risk_level", params.risk_level);
    if (params.violation_class) searchParams.append("violation_class", params.violation_class);
    if (params.rent_impairing) searchParams.append("rent_impairing", params.rent_impairing);
    if (params.complaint_category) searchParams.append("complaint_category", params.complaint_category);
    if (params.recent_activity_days) searchParams.append("recent_activity_days", params.recent_activity_days);
    if (params.evictionsMin !== undefined)
      searchParams.append("evictions_min", params.evictionsMin.toString());
    if (params.evictionsMax !== undefined)
      searchParams.append("evictions_max", params.evictionsMax.toString());
    if (params.violationsMin !== undefined)
      searchParams.append("violations_min", params.violationsMin.toString());
    if (params.violationsMax !== undefined)
      searchParams.append("violations_max", params.violationsMax.toString());
    if (params.zipCode) searchParams.append("zip", params.zipCode);
    if (params.zip) searchParams.append("zip", params.zip);
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.sort_by) {
      searchParams.append("sort_by", params.sort_by);
    }

    const url = `/buildings/search/?${searchParams.toString()}`;
    console.log("Search API URL:", url); // Debug log
    const response = await axiosInstance.get<SearchApiResponse>(url);

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
          openViolations: building.violations.filter(
            (v) => v.violation_status === "Open"
          ).length,
          riskLevel:
            building.evictions.length > 5 ||
            building.violations.filter((v) => v.violation_status === "Open")
              .length > 10
              ? "High Risk"
              : building.evictions.length > 2 ||
                  building.violations.filter(
                    (v) => v.violation_status === "Open"
                  ).length > 5
                ? "Moderate Risk"
                : "Low Risk",
          rentStabilized: building.rent_stabilized.status === "RENT_STABILIZED",
        };

        return {
          result: true,
          data: [searchResult],
          total: 1,
          page: 1,
          limit: 1,
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
  is_rent_stabilized?: boolean; // Optional: rent stabilized status from backend
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
    searchParams.append("min_lat", params.min_lat.toString());
    searchParams.append("max_lat", params.max_lat.toString());
    searchParams.append("min_lng", params.min_lng.toString());
    searchParams.append("max_lng", params.max_lng.toString());
    if (params.data_type) searchParams.append("data_type", params.data_type);

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
  time_range?: string;
}): Promise<HeatmapDataApiResponse> => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.append("min_lat", params.min_lat.toString());
    searchParams.append("max_lat", params.max_lat.toString());
    searchParams.append("min_lng", params.min_lng.toString());
    searchParams.append("max_lng", params.max_lng.toString());
    if (params.data_type) searchParams.append("data_type", params.data_type);
    if (params.time_range) searchParams.append("time_range", params.time_range);
    if (params.borough) searchParams.append("borough", params.borough);
    if (params.limit) searchParams.append("limit", params.limit.toString());

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

export const fetchFilteredViolations = async (params: {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
  borough?: string;
  limit?: number;
  min_open_violations?: number;
  max_open_violations?: number;
  min_closed_violations?: number;
  max_closed_violations?: number;
  min_class_a?: number;
  max_class_a?: number;
  min_class_b?: number;
  max_class_b?: number;
  min_class_c?: number;
  max_class_c?: number;
  max_response_days?: number;
}): Promise<HeatmapDataApiResponse> => {
  try {
    const searchParams = new URLSearchParams();
    searchParams.append("min_lat", params.min_lat.toString());
    searchParams.append("max_lat", params.max_lat.toString());
    searchParams.append("min_lng", params.min_lng.toString());
    searchParams.append("max_lng", params.max_lng.toString());
    if (params.borough) searchParams.append("borough", params.borough);
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.min_open_violations !== undefined) searchParams.append("min_open_violations", params.min_open_violations.toString());
    if (params.max_open_violations !== undefined) searchParams.append("max_open_violations", params.max_open_violations.toString());
    if (params.min_closed_violations !== undefined) searchParams.append("min_closed_violations", params.min_closed_violations.toString());
    if (params.max_closed_violations !== undefined) searchParams.append("max_closed_violations", params.max_closed_violations.toString());
    if (params.min_class_a !== undefined) searchParams.append("min_class_a", params.min_class_a.toString());
    if (params.max_class_a !== undefined) searchParams.append("max_class_a", params.max_class_a.toString());
    if (params.min_class_b !== undefined) searchParams.append("min_class_b", params.min_class_b.toString());
    if (params.max_class_b !== undefined) searchParams.append("max_class_b", params.max_class_b.toString());
    if (params.min_class_c !== undefined) searchParams.append("min_class_c", params.min_class_c.toString());
    if (params.max_class_c !== undefined) searchParams.append("max_class_c", params.max_class_c.toString());
    if (params.max_response_days !== undefined) searchParams.append("max_response_days", params.max_response_days.toString());

    const response = await axiosInstance.get<HeatmapDataApiResponse>(
      `/neighborhood/filtered-violations/?${searchParams.toString()}`
    );

    if (!response.data.result) {
      throw new Error("Failed to fetch filtered violations");
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching filtered violations:", error);
    throw error;
  }
};

export const fetchBoroughSummary = async (
  borough?: string
): Promise<BoroughSummaryApiResponse> => {
  try {
    const searchParams = new URLSearchParams();
    if (borough) searchParams.append("borough", borough);

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
    searchParams.append("bbl", params.bbl);
    if (params.days_back)
      searchParams.append("days_back", params.days_back.toString());

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

// =========================================================
// COMMUNITY API TYPES AND FUNCTIONS
// =========================================================

export interface CommunityFavorite extends Pick<BuildingData, "registration"> {
  id: number;
  user_id: number;
  bbl: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityReview {
  id: number;
  user_id: number;
  bbl: string;
  rating?: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  email: string;
  username: string;
}

export interface CommunityReviewComment {
  id: number;
  review_id: number;
  user_id: number;
  body: string;
  created_at: string;
  updated_at: string;
  email: string;
  username: string;
}

export interface CommunityInbox {
  peer: {
    id: number;
    username: string;
    email: string;
  };
  last_message: {
    id: number;
    body: string;
    sender_id: number;
    receiver_id: number;
    bbl: string | null;
    created_at: string;
    read_at: string;
  };
  is_unread: boolean;
}

export interface CommunityMessageItem {
  id: number;
  sender_id: number;
  sender_username: string;
  sender_email: string;
  receiver_id: number;
  receiver_username: string;
  receiver_email: string;
  bbl: string;
  body: string;
  read_at: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityMessage {
  peer_id: number;
  bbl: string | null;
  messages: Array<CommunityMessageItem>;
  paging: {
    next_since_id: number;
    prev_before_id: number;
    has_more_before: boolean;
    has_more_after: boolean;
  };
}

// Community API Functions
export const fetchFavorites = async (): Promise<CommunityFavorite[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityFavorite[];
    }>("/community/favorites/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching favorites:", error);
    throw error;
  }
};

export const addFavorite = async (
  bbl: string,
  note?: string
): Promise<CommunityFavorite> => {
  try {
    const response = await axiosInstance.post<{
      result: boolean;
      data: CommunityFavorite;
    }>(
      "/community/favorites/",
      {
        bbl,
        note,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error adding favorite:", error);
    throw error;
  }
};

export const removeFavorite = async (favoriteId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/community/favorites/${favoriteId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
  } catch (error) {
    console.error("Error removing favorite:", error);
    throw error;
  }
};

export const fetchReviews = async (bbl: string): Promise<CommunityReview[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityReview[];
    }>(`/community/reviews/?bbl=${bbl}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
};

export const fetchMyReviews = async (): Promise<CommunityReview[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityReview[];
    }>(`/community/reviews/mine/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    throw error;
  }
};

export const createReview = async (
  bbl: string,
  title: string,
  body: string,
  rating?: number
): Promise<CommunityReview> => {
  try {
    const response = await axiosInstance.post<{
      result: boolean;
      data: CommunityReview;
    }>(
      "/community/reviews/",
      {
        bbl,
        title,
        body,
        rating,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error creating review:", error);
    throw error;
  }
};

export const updateReview = async (
  reviewId: number,
  title?: string,
  body?: string,
  rating?: number
): Promise<CommunityReview> => {
  try {
    const response = await axiosInstance.put<{
      result: boolean;
      data: CommunityReview;
    }>(
      `/community/reviews/${reviewId}/`,
      {
        title,
        body,
        rating,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error updating review:", error);
    throw error;
  }
};

export const deleteReview = async (
  reviewId: number
): Promise<{ detail: string }> => {
  try {
    const response = await axiosInstance.delete<{
      result: boolean;
      data: { detail: string };
    }>(`/community/reviews/${reviewId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });

    return response.data.data;
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
};

export const fetchReviewComments = async (
  reviewId: number
): Promise<CommunityReviewComment[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityReviewComment[];
    }>(`/community/review-comments/?review_id=${reviewId}`);
    return response.data.data;
  } catch (error) {
    console.error("Error fetching review comments:", error);
    throw error;
  }
};

export const createReviewComment = async (
  reviewId: number,
  body: string
): Promise<CommunityReviewComment> => {
  try {
    const response = await axiosInstance.post<{
      result: boolean;
      data: CommunityReviewComment;
    }>(
      "/community/review-comments/",
      {
        review_id: reviewId,
        body,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error creating review comment:", error);
    throw error;
  }
};

export const deleteReviewComment = async (commentId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/community/review-comments/${commentId}/`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
  } catch (error) {
    console.error("Error deleting review comment:", error);
    throw error;
  }
};

export const fetchInboxs = async (): Promise<CommunityInbox[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityInbox[];
    }>("/community/messages/threads/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching inbox messages:", error);
    throw error;
  }
};

export const fetchInboxMessages = async (
  peer_id: CommunityInbox["peer"]["id"]
): Promise<CommunityMessage> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityMessage;
    }>(`/community/messages/thread/?peer_id=${peer_id}&limit=50&order=asc`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching inbox messages:", error);
    throw error;
  }
};

export const fetchOutboxMessages = async (): Promise<CommunityMessage[]> => {
  try {
    const response = await axiosInstance.get<{
      result: boolean;
      data: CommunityMessage[];
    }>("/community/messages/outbox/");
    return response.data.data;
  } catch (error) {
    console.error("Error fetching outbox messages:", error);
    throw error;
  }
};

export const sendMessage = async (
  peer_id: number,
  body: string,
  bbl?: string
): Promise<CommunityMessageItem> => {
  try {
    const response = await axiosInstance.post<{
      result: boolean;
      data: CommunityMessageItem;
    }>(
      "/community/messages/thread/",
      {
        peer_id,
        body,
        bbl,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const markMessageAsRead = async (messageId: number): Promise<void> => {
  try {
    await axiosInstance.put(`/community/messages/${messageId}/read/`);
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
};

export const deleteMessage = async (messageId: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/community/messages/${messageId}/`);
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

// =========================================================
// END OF COMMUNITY API TYPES AND FUNCTIONS
// =========================================================

// Re-export auth functions
export { fetchProfile, loginUser, registerUser, verifyEmail, resendVerification };
