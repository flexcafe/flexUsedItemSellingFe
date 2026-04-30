import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AppLocale } from "@/core/domain/types/locale";

const LOCALE_KEY = "flex_used_market_locale";

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export const PreferencesStorage = {
  async getLocale(): Promise<AppLocale | null> {
    const raw = await getItem(LOCALE_KEY);
    if (raw === "ko" || raw === "my" || raw === "zh") return raw;
    return null;
  },

  async setLocale(locale: AppLocale): Promise<void> {
    return setItem(LOCALE_KEY, locale);
  },
} as const;

