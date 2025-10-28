// Authentication-related type definitions

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  role: "tenant" | "landlord";
  tenant_type?: "student" | "working_professional" | "other";
  landlord_type?: "individual_owner" | "property_management" | "real_estate_agent" | "corporate_landlord";
  phone_number?: string;
  organization_name?: string;
  hpd_registration_number?: string;
  business_phone?: string;
}

export interface AuthResponse {
  access?: string;
  access_token?: string;
  token?: string;
  refresh?: string;
  refresh_token?: string;
  user?: User;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: "tenant" | "landlord";
  is_verified: boolean;
  tenant_type?: string;
  landlord_type?: string;
  phone_number?: string;
  organization_name?: string;
  hpd_registration_number?: string;
  business_phone?: string;
}

export interface EmailVerificationParams {
  token: string;
}

export interface ResendVerificationParams {
  email: string;
}

export interface AuthError {
  error?: string;
  error_message?: string;
  detail?: string;
  verified?: boolean;
  email?: string;
}
