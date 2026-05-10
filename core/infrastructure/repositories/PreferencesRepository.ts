import type { IPreferencesRepository } from "@/core/domain/repositories/IPreferencesRepository";
import type { ActionNotifyCooldownKey } from "@/core/domain/types/actionNotifyCooldown";
import type { AppLocale } from "@/core/domain/types/locale";
import { PreferencesStorage } from "@/core/infrastructure/storage/PreferencesStorage";

const COOLDOWN_KEYS = new Set<string>([
  "kbzPayVerificationRequest",
  "kbzPaySubmitTransaction",
  "withdrawalRequest",
]);

export class PreferencesRepository implements IPreferencesRepository {
  getLocale(): Promise<AppLocale | null> {
    return PreferencesStorage.getLocale();
  }

  setLocale(locale: AppLocale): Promise<void> {
    return PreferencesStorage.setLocale(locale);
  }

  async getActionNotifyCooldowns(): Promise<
    Partial<Record<ActionNotifyCooldownKey, number>>
  > {
    const raw = await PreferencesStorage.getActionNotifyCooldownsRaw();
    const out: Partial<Record<ActionNotifyCooldownKey, number>> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (COOLDOWN_KEYS.has(k)) {
        (out as Record<string, number>)[k] = v;
      }
    }
    return out;
  }

  setActionNotifyCooldown(
    key: ActionNotifyCooldownKey,
    completedAtEpochMs: number,
  ): Promise<void> {
    return PreferencesStorage.setActionNotifyCooldown(key, completedAtEpochMs);
  }
}

