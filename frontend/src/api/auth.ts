import instance from "./axiosInstance";

export const fetchProfile = () => {
  return instance.get("/auth/profile");
};

export const registerUser = (userData: { username: string; email: string; password: string }) => {
  return instance.post("/auth/signup/", userData);
};

export const loginUser = (credentials: { username: string; password: string }) => {
  return instance.post("/auth/login/", credentials);
};