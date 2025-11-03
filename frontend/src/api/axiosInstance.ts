import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://192.168.1.103:8000/api", // Use relative path for production compatibility
  timeout: 30000, // Increased timeout for large datasets
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
