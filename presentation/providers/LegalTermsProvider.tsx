import type {
  LegalTerms,
  LegalTermsStatus,
} from "@/core/domain/entities/LegalTerms";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./AuthProvider";
import { useServices } from "./ServicesProvider";

interface LegalTermsContextValue {
  terms: LegalTerms | null;
  termsError: string | null;
  isLoadingTerms: boolean;
  status: LegalTermsStatus | null;
  isCheckingStatus: boolean;
  statusReady: boolean;
  needsAcceptance: boolean;
  hasPreAuthAcceptedCurrent: boolean;
  termsVersion: string | null;
  refreshTerms: () => Promise<LegalTerms | null>;
  refreshStatus: () => Promise<LegalTermsStatus | null>;
  agreePreAuth: () => Promise<void>;
  disagreePreAuth: () => Promise<void>;
  acceptCurrentTerms: () => Promise<LegalTermsStatus>;
}

const LegalTermsContext = createContext<LegalTermsContextValue | null>(null);

export function LegalTermsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { legalService, preferencesRepository } = useServices();

  const [terms, setTerms] = useState<LegalTerms | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [isLoadingTerms, setIsLoadingTerms] = useState(true);
  const [status, setStatus] = useState<LegalTermsStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [preAuthAcceptedVersion, setPreAuthAcceptedVersion] = useState<
    string | null
  >(null);

  const refreshTerms = useCallback(async () => {
    setIsLoadingTerms(true);
    setTermsError(null);
    try {
      const next = await legalService.getTerms();
      setTerms(next);
      return next;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load Terms of Use";
      setTermsError(message);
      setTerms(null);
      return null;
    } finally {
      setIsLoadingTerms(false);
    }
  }, [legalService]);

  const refreshStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus(null);
      setStatusReady(false);
      setIsCheckingStatus(false);
      return null;
    }

    setIsCheckingStatus(true);
    try {
      const next = await legalService.getTermsStatus();
      setStatus(next);
      setStatusReady(true);
      return next;
    } catch {
      setStatus({
        currentVersion: "",
        acceptedVersion: null,
        acceptedAt: null,
        needsAcceptance: true,
      });
      setStatusReady(true);
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  }, [isAuthenticated, legalService]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const savedVersion = await preferencesRepository.getAcceptedTermsVersion();
      if (mounted) setPreAuthAcceptedVersion(savedVersion);
      await refreshTerms();
    })();
    return () => {
      mounted = false;
    };
  }, [preferencesRepository, refreshTerms]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      setStatus(null);
      setStatusReady(false);
      setIsCheckingStatus(false);
      return;
    }

    setStatusReady(false);
    void refreshStatus();
  }, [isAuthLoading, isAuthenticated, refreshStatus]);

  const termsVersion = terms?.version?.trim() || null;
  const hasPreAuthAcceptedCurrent = Boolean(
    termsVersion &&
      preAuthAcceptedVersion &&
      preAuthAcceptedVersion === termsVersion,
  );
  const needsAcceptance = Boolean(isAuthenticated && status?.needsAcceptance);

  const agreePreAuth = useCallback(async () => {
    if (!termsVersion) {
      throw new Error("Terms version is unavailable");
    }
    await preferencesRepository.setAcceptedTermsVersion(termsVersion);
    setPreAuthAcceptedVersion(termsVersion);
  }, [preferencesRepository, termsVersion]);

  const disagreePreAuth = useCallback(async () => {
    await preferencesRepository.clearAcceptedTermsVersion();
    setPreAuthAcceptedVersion(null);
  }, [preferencesRepository]);

  const acceptCurrentTerms = useCallback(async () => {
    if (!termsVersion) {
      throw new Error("Terms version is unavailable");
    }
    const next = await legalService.acceptTerms(termsVersion);
    setStatus(next);
    setStatusReady(true);
    await preferencesRepository.setAcceptedTermsVersion(termsVersion);
    setPreAuthAcceptedVersion(termsVersion);
    return next;
  }, [legalService, preferencesRepository, termsVersion]);

  const value = useMemo<LegalTermsContextValue>(
    () => ({
      terms,
      termsError,
      isLoadingTerms,
      status,
      isCheckingStatus,
      statusReady,
      needsAcceptance,
      hasPreAuthAcceptedCurrent,
      termsVersion,
      refreshTerms,
      refreshStatus,
      agreePreAuth,
      disagreePreAuth,
      acceptCurrentTerms,
    }),
    [
      terms,
      termsError,
      isLoadingTerms,
      status,
      isCheckingStatus,
      statusReady,
      needsAcceptance,
      hasPreAuthAcceptedCurrent,
      termsVersion,
      refreshTerms,
      refreshStatus,
      agreePreAuth,
      disagreePreAuth,
      acceptCurrentTerms,
    ],
  );

  return (
    <LegalTermsContext.Provider value={value}>
      {children}
    </LegalTermsContext.Provider>
  );
}

export function useLegalTerms(): LegalTermsContextValue {
  const ctx = useContext(LegalTermsContext);
  if (!ctx) {
    throw new Error("useLegalTerms must be used within a LegalTermsProvider");
  }
  return ctx;
}
