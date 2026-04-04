import Constants from "expo-constants";

const envApiUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL;

export const API_CONFIG = {
  BASE_URL: envApiUrl ?? "http://localhost:8080/api",
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/v1/auth/login",
    REGISTER: "/v1/auth/register",
    PROFILE: "/v1/auth/profile",
  },
  PRODUCTS: {
    LIST: "/v1/products",
    BY_ID: (id: string) => `/v1/products/${id}`,
    CREATE: "/v1/products",
    UPDATE: (id: string) => `/v1/products/${id}`,
    DELETE: (id: string) => `/v1/products/${id}`,
  },
} as const;
