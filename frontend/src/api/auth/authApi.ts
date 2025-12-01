// Authentication API functions

import axiosInstance from '../axiosInstance';
import type { 
  LoginCredentials, 
  UserRegistration, 
  EmailVerificationParams, 
  ResendVerificationParams,
  User
} from '../../types';
import { API_ENDPOINTS } from '../../constants';

// Export Profile as an alias for User for backward compatibility
export type Profile = User;

export const fetchProfile = () => {
  return axiosInstance.get(API_ENDPOINTS.AUTH.PROFILE);
};

export const registerUser = (userData: UserRegistration) => {
  return axiosInstance.post(API_ENDPOINTS.AUTH.REGISTER, userData);
};

export const loginUser = (credentials: LoginCredentials) => {
  return axiosInstance.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
};

export const verifyEmail = (params: EmailVerificationParams) => {
  return axiosInstance.post(API_ENDPOINTS.AUTH.VERIFY_EMAIL, params);
};

export const resendVerification = (params: ResendVerificationParams) => {
  return axiosInstance.post(API_ENDPOINTS.AUTH.RESEND_VERIFICATION, params);
};

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await axiosInstance.get<{ data?: User[] } | User[]>(API_ENDPOINTS.AUTH.USERS);
    const data = (response.data as any)?.data || response.data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const updateProfile = async (profileData: Partial<User>): Promise<User> => {
  try {
    const response = await axiosInstance.patch<{ data?: User } | User>(API_ENDPOINTS.AUTH.PROFILE, profileData);
    const data = (response.data as any)?.data || response.data;
    return data as User;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};