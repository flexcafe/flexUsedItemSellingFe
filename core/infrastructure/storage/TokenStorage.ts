import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "flex_used_market_access_token";
const REFRESH_TOKEN_KEY = "flex_used_market_refresh_token";

/**
 * Stricter than SecureStore defaults on iOS:
 * - WHEN_UNLOCKED_THIS_DEVICE_ONLY: readable only while unlocked; not restored to a new device via backup.
 * - keychainService: isolates auth tokens in Keychain / Android keystore alias.
 *
 * requireAuthentication is intentionally off so API calls are not blocked by a biometric prompt on every request.
 */
const TOKEN_SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: "com.anonymous.flexusedmarketfe.tokens",
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value, TOKEN_SECURE_OPTIONS);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key, TOKEN_SECURE_OPTIONS);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key, TOKEN_SECURE_OPTIONS);
  }
}

export const TokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },

  async setAccessToken(token: string): Promise<void> {
    return setItem(ACCESS_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    return setItem(REFRESH_TOKEN_KEY, token);
  },

  async clearTokens(): Promise<void> {
    await removeItem(ACCESS_TOKEN_KEY);
    await removeItem(REFRESH_TOKEN_KEY);
  },

  async hasToken(): Promise<boolean> {
    const token = await getItem(ACCESS_TOKEN_KEY);
    return token !== null && token.length > 0;
  },
} as const;
