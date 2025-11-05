import instance from "./axiosInstance";

export interface Profile {
  email: string;
  id: number;
  username: string;
}

export const fetchProfile = async (): Promise<Profile> => {
  const response = await instance.get<{
    result: boolean;
    data: Profile;
  }>("/auth/profile", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
  });

  return response.data.data;
};

export const registerUser = (userData: {
  username: string;
  email: string;
  password: string;
}) => {
  return instance.post("/auth/signup/", userData);
};

export const loginUser = (credentials: {
  username: string;
  password: string;
}) => {
  return instance.post("/auth/login/", credentials);
};
