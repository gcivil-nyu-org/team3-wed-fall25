// Authentication-related type definitions

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  role: "tenant" | "landlord";
  first_name: string;
  last_name: string;
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
  first_name: string;
  last_name: string;
  role: "tenant" | "landlord";
  is_verified: boolean;
  tenant_type?: string;
  landlord_type?: string;
  phone_number?: string;
  organization_name?: string;
  hpd_registration_number?: string;
  business_phone?: string;
  created_at: string;
  updated_at: string;
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

export interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "tenant" | "landlord";
  tenantType?: "student" | "working_professional" | "other";
  landlordType?: "individual_owner" | "property_management" | "real_estate_agent" | "corporate_landlord";
  phoneNumber?: string;
  organizationName?: string;
  hpdRegistration?: string;
  businessPhone?: string;
  termsAccepted: boolean;
}

export interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  tenant_type?: string;
  landlord_type?: string;
  phone_number?: string;
  organization_name?: string;
  hpd_registration_number?: string;
  business_phone?: string;
  terms?: string;
}
