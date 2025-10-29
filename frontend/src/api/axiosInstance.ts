import axios from "axios";

// Prefer Vite env var VITE_API_BASE, fall back to relative /api so Vite proxy can handle dev
// const baseURL = (import.meta as any).env?.VITE_API_BASE ?? "/api";

const axiosInstance = axios.create({
  baseURL: "/api", // Use relative path for production compatibility
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
