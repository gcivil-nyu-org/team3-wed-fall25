// Authentication hooks

import { useState, useEffect } from 'react';
import { 
  fetchProfile, 
  loginUser, 
  registerUser, 
  verifyEmail, 
  resendVerification 
} from '../api';
import type { 
  LoginCredentials, 
  UserRegistration, 
  EmailVerificationParams, 
  ResendVerificationParams,
  User,
  AuthError
} from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetchProfile();
        setUser(response.data);
      } catch (err) {
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await loginUser(credentials);
      const responseData = response.data?.data || response.data;
      const accessToken = responseData?.access || responseData?.access_token || responseData?.token;
      const refreshToken = responseData?.refresh || responseData?.refresh_token;
      
      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        return { success: true, user: responseData?.user };
      } else {
        throw new Error('No access token received');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error_message || 
                          err.response?.data?.detail || 
                          err.response?.data?.error || 
                          'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage, authError: err.response?.data as AuthError };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: UserRegistration) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await registerUser(userData);
      return { success: true, message: response.data.message };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error_message || 
                          err.response?.data?.message ||
                          'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage, fieldErrors: err.response?.data };
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailToken = async (params: EmailVerificationParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await verifyEmail(params);
      return { success: true, message: response.data.message };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Email verification failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (params: ResendVerificationParams) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await resendVerification(params);
      return { success: true, message: response.data.message };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to resend verification email';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    verifyEmailToken,
    resendVerificationEmail,
    logout,
  };
};
