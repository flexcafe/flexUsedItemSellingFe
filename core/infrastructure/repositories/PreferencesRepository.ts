import type { IPreferencesRepository } from "@/core/domain/repositories/IPreferencesRepository";
import type { AppLocale } from "@/core/domain/types/locale";
import { PreferencesStorage } from "@/core/infrastructure/storage/PreferencesStorage";

export class PreferencesRepository implements IPreferencesRepository {
  getLocale(): Promise<AppLocale | null> {
    return PreferencesStorage.getLocale();
  }

  setLocale(locale: AppLocale): Promise<void> {
    return PreferencesStorage.setLocale(locale);
  }
}

