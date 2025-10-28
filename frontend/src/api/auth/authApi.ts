// Authentication API functions

import axiosInstance from '../axiosInstance';
import type { 
  LoginCredentials, 
  UserRegistration, 
  EmailVerificationParams, 
  ResendVerificationParams 
} from '../../types';
import { API_ENDPOINTS } from '../../constants';

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
