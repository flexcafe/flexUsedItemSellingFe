import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AppLocale } from "@/core/domain/types/locale";

const LOCALE_KEY = "flex_used_market_locale";
const ACTION_NOTIFY_COOLDOWNS_KEY = "flex_used_market_action_notify_cooldowns_v1";

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

async function readActionNotifyCooldowns(): Promise<Record<string, number>> {
  const raw = await getItem(ACTION_NOTIFY_COOLDOWNS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
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

  async getActionNotifyCooldownsRaw(): Promise<Record<string, number>> {
    return readActionNotifyCooldowns();
  },

  async setActionNotifyCooldown(key: string, completedAtEpochMs: number): Promise<void> {
    const cur = await readActionNotifyCooldowns();
    cur[key] = completedAtEpochMs;
    await setItem(ACTION_NOTIFY_COOLDOWNS_KEY, JSON.stringify(cur));
  },
} as const;

