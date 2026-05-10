import type { ActionNotifyCooldownKey } from "@/core/domain/types/actionNotifyCooldown";
import type { AppLocale } from "@/core/domain/types/locale";

export interface IPreferencesRepository {
  getLocale(): Promise<AppLocale | null>;
  setLocale(locale: AppLocale): Promise<void>;
  getActionNotifyCooldowns(): Promise<
    Partial<Record<ActionNotifyCooldownKey, number>>
  >;
  setActionNotifyCooldown(
    key: ActionNotifyCooldownKey,
    completedAtEpochMs: number,
  ): Promise<void>;
}

