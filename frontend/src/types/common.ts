// Common types used across the application

export interface ApiResponse<T> {
  result: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  result: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ErrorResponse {
  error?: string;
  error_message?: string;
  detail?: string;
  message?: string;
}

export interface Bounds {
  min_lat: number;
  max_lat: number;
  min_lng: number;
  max_lng: number;
}

export type RiskLevel = "Low Risk" | "Moderate Risk" | "High Risk";

export type UserRole = "tenant" | "landlord";

export type TenantType = "student" | "working_professional" | "other";

export type LandlordType = "individual_owner" | "property_management" | "real_estate_agent" | "corporate_landlord";

export type DataType = "violations" | "evictions" | "complaints";
