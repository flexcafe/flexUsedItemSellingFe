import type { LegalTerms } from "@/core/domain/entities/LegalTerms";

/** Stable keys from BE `terms-of-service.constant.ts`. */
export const TERMS_OF_USE_TITLE_KEY = "TERMS_OF_USE_TITLE";
export const TERMS_OF_USE_CONTENT_KEY = "TERMS_OF_USE";

type Tf = (key: string, vars?: Record<string, unknown>) => string;

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function termsVars(terms: LegalTerms): Record<string, unknown> {
  return {
    version:
      toSafeString(terms.metadata?.version) || toSafeString(terms.version),
  };
}

/**
 * Resolve Terms title/body via LocaleProvider keys (same idea as
 * `localizeNotification`), falling back to English API `title` / `content`.
 */
export function localizeLegalTerms(
  terms: LegalTerms,
  tf: Tf,
): { title: string; content: string } {
  const vars = termsVars(terms);

  return {
    title: localizeTermsField(terms.titleKey, terms.title, tf, vars),
    content: localizeTermsField(terms.contentKey, terms.content, tf, vars),
  };
}

function localizeTermsField(
  key: string | null,
  fallback: string,
  tf: Tf,
  vars: Record<string, unknown>,
): string {
  if (!key) return fallback;

  switch (key) {
    case TERMS_OF_USE_TITLE_KEY:
      return tf(TERMS_OF_USE_TITLE_KEY, vars);
    case TERMS_OF_USE_CONTENT_KEY:
      return tf(TERMS_OF_USE_CONTENT_KEY, vars);
    default:
      return fallback;
  }
}
