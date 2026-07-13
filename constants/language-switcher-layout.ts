/** Compact `LanguageSwitcher` row (`components/language-switcher.tsx`). */
export const LANGUAGE_SWITCHER_TOP_MARGIN = 4;
export const LANGUAGE_SWITCHER_BAR_HEIGHT = 30;

/** Breathing room below the switcher row. */
export const CONTENT_TOP_MARGIN_BELOW_LANGUAGE_SWITCHER = 12;

/** @deprecated Use `languageSwitcherBottomOffset` — kept for existing imports. */
export const EXTRA_TOP_FOR_LANGUAGE_SWITCHER =
  LANGUAGE_SWITCHER_TOP_MARGIN + LANGUAGE_SWITCHER_BAR_HEIGHT;

export function languageSwitcherTopOffset(safeAreaTop: number): number {
  return Math.max(safeAreaTop, 6) + LANGUAGE_SWITCHER_TOP_MARGIN;
}

export function languageSwitcherBottomOffset(safeAreaTop: number): number {
  return (
    languageSwitcherTopOffset(safeAreaTop) + LANGUAGE_SWITCHER_BAR_HEIGHT
  );
}

export function paddingTopBelowLanguageSwitcher(safeAreaTop: number): number {
  return (
    languageSwitcherBottomOffset(safeAreaTop) +
    CONTENT_TOP_MARGIN_BELOW_LANGUAGE_SWITCHER
  );
}

/** Extra top padding when the parent already applies the device safe area. */
export function paddingTopInsideSafeAreaForLanguageSwitcher(): number {
  return (
    LANGUAGE_SWITCHER_TOP_MARGIN +
    LANGUAGE_SWITCHER_BAR_HEIGHT +
    CONTENT_TOP_MARGIN_BELOW_LANGUAGE_SWITCHER
  );
}

/** Top-left back control; language switcher sits on the right only. */
export function topOffsetForFloatingBackButton(safeAreaTop: number): number {
  return Math.max(safeAreaTop, 6) + 8;
}
