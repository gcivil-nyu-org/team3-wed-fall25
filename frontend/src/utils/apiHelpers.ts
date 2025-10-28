// API utility functions

import type { ErrorResponse } from '../types';

export const handleApiError = (error: any): string => {
  const errorResponse = error.response?.data as ErrorResponse;
  
  if (errorResponse?.error_message) {
    return errorResponse.error_message;
  }
  
  if (errorResponse?.error) {
    return errorResponse.error;
  }
  
  if (errorResponse?.detail) {
    return errorResponse.detail;
  }
  
  if (errorResponse?.message) {
    return errorResponse.message;
  }
  
  return 'An unexpected error occurred';
};

export const buildSearchParams = (params: Record<string, any>): URLSearchParams => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  
  return searchParams;
};

export const isApiResponseValid = (response: any): boolean => {
  return response?.data?.result === true;
};
