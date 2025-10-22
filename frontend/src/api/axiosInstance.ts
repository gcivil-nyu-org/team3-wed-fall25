import axios from "axios";

// Prefer Vite env var VITE_API_BASE, fall back to relative /api so Vite proxy can handle dev
const baseURL = (import.meta as any).env?.VITE_API_BASE ?? "/api";

const axiosInstance = axios.create({
  baseURL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
