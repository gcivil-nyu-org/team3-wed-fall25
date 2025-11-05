import axios from "axios";

// In development, use relative path so Vite proxy can handle it
// In production, use the full URL or relative path based on deployment
const baseURL = import.meta.env.DEV 
  ? "/api"  // Use Vite proxy in development
  : (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api");

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000, // Increased timeout for large datasets
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
