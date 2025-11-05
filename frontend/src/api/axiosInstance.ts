import axios from "axios";

// TODO: Fix VITE ENV configuration later
// For now, using relative path for production compatibility (from develop branch)
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
