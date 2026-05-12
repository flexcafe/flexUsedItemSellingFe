import Constants from "expo-constants";

const envApiUrl =
  Constants.expoConfig?.extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL;

export const API_CONFIG = {
  BASE_URL: envApiUrl ?? "http://localhost:3000/api",
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    // Base URL already includes `/api` (see `API_CONFIG.BASE_URL`)
    LOGIN: "/v1/client/auth/login",
    REGISTER: "/v1/client/auth/register",
    PROFILE: "/v1/client/auth/me",
    OTP_SEND: "/v1/client/auth/otp/send",
    OTP_VERIFY: "/v1/client/auth/otp/verify",
    EMAIL_SEND: "/v1/client/auth/email/send-verification",
    EMAIL_VERIFY: "/v1/client/auth/email/verify",
    KBZPAY_REQUEST: "/v1/client/auth/kbzpay/request-verification",
    KBZPAY_SUBMIT_TRANSACTION: "/v1/client/auth/kbzpay/submit-transaction",
  },
  PUSHER: {
    AUTH: "/v1/client/pusher/auth",
  },
  NOTIFICATIONS: {
    LIST: "/v1/client/notifications",
    MARK_READ: (notificationId: string) =>
      `/v1/client/notifications/${notificationId}/read`,
  },
  PROFILE: {
    POINTS: "/v1/client/profile/points",
    STATS: "/v1/client/profile/stats",
    RANK_CONFIG: "/v1/client/profile/rank-config",
    WITHDRAWALS: "/v1/client/profile/withdrawals",
    CHANGE_PASSWORD: "/v1/client/profile/change-password",
    AVATAR: "/v1/client/profile/avatar",
  },
  SLIDER_ADS: {
    LIST: "/v1/client/slider-ads",
  },
  CATEGORIES: {
    LIST: "/v1/client/categories",
    BY_ID: (categoryId: string) => `/v1/client/categories/${categoryId}`,
  },
  CLIENT_PRODUCTS: {
    LIST: "/v1/client/products",
    BY_ID: (productId: string) => `/v1/client/products/${productId}`,
  },
  PRODUCTS: {
    LIST: "/v1/products",
    BY_ID: (id: string) => `/v1/products/${id}`,
    CREATE: "/v1/products",
    UPDATE: (id: string) => `/v1/products/${id}`,
    DELETE: (id: string) => `/v1/products/${id}`,
  },
} as const;
