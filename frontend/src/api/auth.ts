import instance from "./axiosInstance";

export const fetchProfile = () => {
  return instance.get("/auth/profile");
};
