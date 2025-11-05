import axios from "axios";

// Prefer Vite env var VITE_API_BASE, fall back to relative /api so Vite proxy can handle dev
// const baseURL = (import.meta as any).env?.VITE_API_BASE ?? "/api";

const axiosInstance = axios.create({
  baseURL: "http://192.168.1.103:8000/api", // Use relative path for production compatibility
  timeout: 30000, // Increased timeout for large datasets
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
