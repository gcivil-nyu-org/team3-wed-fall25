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
        const token = sessionStorage.getItem('access_token');
        if (!token) {
          setLoading(false);
          return;
        }
        
        const response = await fetchProfile();
        const userData = response.data?.data || response.data;
        setUser(userData);
      } catch (err) {
        // If profile fetch fails, clear the token and user state
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
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
      const authData = responseData?.data; // Extract the nested 'data' object
      const accessToken = authData?.access || authData?.access_token || authData?.token;
      const refreshToken = authData?.refresh || authData?.refresh_token;
      const userData = authData?.user; // User data is not directly in login response, will be fetched by fallback
      
      if (accessToken) {
        sessionStorage.setItem('access_token', accessToken);
        if (refreshToken) {
          sessionStorage.setItem('refresh_token', refreshToken);
        }
        
        // Set user data in state
        if (userData) {
          console.log('Setting user data from login response:', userData);
          setUser(userData);
        } else {
          // If no user data in login response, fetch it from profile endpoint
          try {
            console.log('No user data in login response, fetching from profile...');
            const profileResponse = await fetchProfile();
            console.log('Profile response:', profileResponse.data);
            const userData = profileResponse.data?.data || profileResponse.data;
            console.log('Setting user with profile data:', userData);
            setUser(userData);
            console.log('User state should now be set');
          } catch (profileErr) {
            console.warn('Could not fetch user profile after login:', profileErr);
          }
        }
        
        return { success: true, user: userData };
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
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
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
