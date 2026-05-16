/** Clears absolute `LanguageSwitcher` (`components/language-switcher.tsx`, top ~44 + bar). */
export const EXTRA_TOP_FOR_LANGUAGE_SWITCHER = 36;

/** Breathing room below the switcher row (aligned with `HomeHero`). */
export const CONTENT_TOP_MARGIN_BELOW_LANGUAGE_SWITCHER = 14;

export function paddingTopBelowLanguageSwitcher(safeAreaTop: number): number {
  return (
    Math.max(safeAreaTop, 6) +
    EXTRA_TOP_FOR_LANGUAGE_SWITCHER +
    CONTENT_TOP_MARGIN_BELOW_LANGUAGE_SWITCHER
  );
}

/** Top-left back control; language switcher sits on the right only. */
export function topOffsetForFloatingBackButton(safeAreaTop: number): number {
  return Math.max(safeAreaTop, 6) + 8;
}
