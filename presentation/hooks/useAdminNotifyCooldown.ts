import {
  ACTION_NOTIFY_COOLDOWN_MS,
  type ActionNotifyCooldownKey,
} from "@/core/domain/types/actionNotifyCooldown";
import { useCallback, useEffect, useState } from "react";
import { useServices } from "../providers/ServicesProvider";

const TRACKED_KEYS: ActionNotifyCooldownKey[] = [
  "kbzPayVerificationRequest",
  "kbzPaySubmitTransaction",
  "withdrawalRequest",
];

export function useAdminNotifyCooldown() {
  const { preferencesRepository } = useServices();
  const [lastSuccessAt, setLastSuccessAt] = useState<
    Partial<Record<ActionNotifyCooldownKey, number>>
  >({});
  const [, setTick] = useState(0);

  const reload = useCallback(async () => {
    const next = await preferencesRepository.getActionNotifyCooldowns();
    setLastSuccessAt(next);
  }, [preferencesRepository]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isCoolingDown = useCallback(
    (key: ActionNotifyCooldownKey) => {
      const last = lastSuccessAt[key];
      if (last == null) return false;
      return Date.now() - last < ACTION_NOTIFY_COOLDOWN_MS;
    },
    [lastSuccessAt],
  );

  const remainingMs = useCallback(
    (key: ActionNotifyCooldownKey) => {
      const last = lastSuccessAt[key];
      if (last == null) return 0;
      return Math.max(0, last + ACTION_NOTIFY_COOLDOWN_MS - Date.now());
    },
    [lastSuccessAt],
  );

  useEffect(() => {
    if (!TRACKED_KEYS.some((k) => isCoolingDown(k))) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [lastSuccessAt, isCoolingDown]);

  const recordSuccess = useCallback(
    async (key: ActionNotifyCooldownKey) => {
      await preferencesRepository.setActionNotifyCooldown(key, Date.now());
      await reload();
    },
    [preferencesRepository, reload],
  );

  return { isCoolingDown, remainingMs, recordSuccess, reload };
}
