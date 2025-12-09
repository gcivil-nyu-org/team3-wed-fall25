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
        // Check both sessionStorage and localStorage for token
        const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
        if (!token) {
          setLoading(false);
          return;
        }
        
        const response = await fetchProfile();
        // Profile endpoint returns user data directly, not wrapped in data object
        const userData = response.data;
        setUser(userData);
      } catch (err) {
        // If profile fetch fails, clear the token and user state from both storages
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setError(null);
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
      const responseData = response.data;
      // Backend returns tokens directly in response.data, not nested in response.data.data
      const accessToken = responseData?.access || responseData?.access_token || responseData?.token;
      const refreshToken = responseData?.refresh || responseData?.refresh_token;
      const userData = responseData?.user; // User data is included in login response
      
      if (accessToken) {
        // Store tokens in both sessionStorage and localStorage for compatibility
        sessionStorage.setItem('access_token', accessToken);
        localStorage.setItem('access_token', accessToken);
        if (refreshToken) {
          sessionStorage.setItem('refresh_token', refreshToken);
          localStorage.setItem('refresh_token', refreshToken);
        }
        
        // Set user data from login response first (immediate)
        if (userData) {
          setUser(userData);
        }
        
        // Try to fetch fresh user data from profile endpoint to ensure we have the latest role
        // But don't fail the login if this fails - use the userData from login response
        try {
          // Small delay to ensure token is stored before making the request
          await new Promise(resolve => setTimeout(resolve, 100));
          const profileResponse = await fetchProfile();
          // Profile endpoint returns user data directly, not wrapped in data object
          const freshUserData = profileResponse.data;
          if (freshUserData) {
            setUser(freshUserData);
            return { success: true, user: freshUserData };
          }
        } catch (profileErr: any) {
          console.warn('Profile fetch failed after login, using login response data:', profileErr);
          // Continue with userData from login response
        }
        
        // Return success with userData from login response (or null if not available)
        // The useEffect hook will try to load user data on mount
        return { success: true, user: userData || null };
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
      return { 
        success: true, 
        message: response.data.message || 'Registration successful! Please check your email to verify your account.' 
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.error_message || 
                          err.response?.data?.message ||
                          'Registration failed';
      setError(errorMessage);
      
      // Handle field-specific errors
      const fieldErrors: Record<string, string> = {};
      if (err.response?.data) {
        const data = err.response.data;
        
        // Map backend field errors to frontend field names
        if (data.username) fieldErrors.firstName = data.username[0];
        if (data.email) fieldErrors.email = data.email[0];
        if (data.password) fieldErrors.password = data.password[0];
        if (data.role) fieldErrors.role = data.role[0];
        if (data.tenant_type) fieldErrors.tenant_type = data.tenant_type[0];
        if (data.landlord_type) fieldErrors.landlord_type = data.landlord_type[0];
        if (data.organization_name) fieldErrors.organization_name = data.organization_name[0];
      }
      
      return { 
        success: false, 
        error: errorMessage, 
        fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
      };
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
    // Clear all authentication tokens
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Clear admin session if present
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_username');
    
    setUser(null);
    setError(null);
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
