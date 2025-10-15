import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:8002/api",
  timeout: 30000, // Increased timeout for large datasets
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
