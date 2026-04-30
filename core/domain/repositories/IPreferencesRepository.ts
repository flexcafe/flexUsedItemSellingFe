import type { AppLocale } from "@/core/domain/types/locale";

export interface IPreferencesRepository {
  getLocale(): Promise<AppLocale | null>;
  setLocale(locale: AppLocale): Promise<void>;
}

